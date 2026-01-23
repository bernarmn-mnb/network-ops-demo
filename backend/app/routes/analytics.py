"""Analytics API endpoint - ES|QL powered search analytics.

GET /api/analytics/overview - All key metrics in one call
GET /api/analytics/ctr - Overall click-through rate
GET /api/analytics/mrr - Mean Reciprocal Rank
GET /api/analytics/zero-results - Zero results rate
GET /api/analytics/top-queries - Top queries by volume
GET /api/analytics/click-distribution - Click position distribution
GET /api/analytics/zero-result-queries - Queries returning no results

All endpoints support time range filtering via ?range= parameter:
- 15m: Last 15 minutes
- 1h: Last 1 hour
- 24h: Last 24 hours (default)
- all: All time (no time filter)
"""

import logging
from pathlib import Path
from typing import Literal, Optional

from elasticsearch import Elasticsearch
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

from ..config import settings

logger = logging.getLogger(__name__)

# =============================================================================
# Monitoring Cluster Client (for APM traces)
# =============================================================================

_monitoring_client: Elasticsearch | None = None


def get_monitoring_client() -> Elasticsearch:
    """Get or create the monitoring cluster Elasticsearch client.

    This is separate from the data cluster - a common enterprise pattern
    where APM/traces go to a dedicated observability cluster.
    """
    global _monitoring_client

    if _monitoring_client is not None:
        return _monitoring_client

    if not settings.has_monitoring_cluster:
        raise ValueError(
            "Monitoring cluster not configured. "
            "Set MONITORING_ELASTICSEARCH_URL and MONITORING_ELASTIC_API_KEY in .env"
        )

    logger.info(
        f"Connecting to monitoring cluster: {settings.MONITORING_ELASTICSEARCH_URL}"
    )
    _monitoring_client = Elasticsearch(
        hosts=[settings.MONITORING_ELASTICSEARCH_URL],
        api_key=settings.MONITORING_ELASTIC_API_KEY,
    )

    # Verify connection
    info = _monitoring_client.info()
    logger.info(f"Connected to monitoring cluster: {info['cluster_name']}")

    return _monitoring_client


router = APIRouter(prefix="/api/analytics", tags=["analytics"])

# ES|QL templates directory
TEMPLATES_DIR = (
    Path(__file__).parent.parent / "elasticsearch" / "templates" / "analytics"
)

# Index pattern for APM traces
APM_INDEX = "traces-apm-*"


# =============================================================================
# Time Range Configuration
# =============================================================================

TimeRange = Literal["15m", "1h", "24h", "all"]

TIME_RANGE_FILTERS = {
    "15m": "AND @timestamp >= NOW() - 15 minutes",
    "1h": "AND @timestamp >= NOW() - 1 hour",
    "24h": "AND @timestamp >= NOW() - 24 hours",
    "all": "",  # No filter
}


def get_time_filter(range: TimeRange) -> str:
    """Get the ES|QL time filter clause for the given range."""
    return TIME_RANGE_FILTERS.get(range, TIME_RANGE_FILTERS["24h"])


# =============================================================================
# Response Models
# =============================================================================


class CTRResponse(BaseModel):
    """Click-through rate metrics."""

    total_searches: int
    total_clicks: int
    ctr: float
    time_range: str
    esql_query: str | None = None


class MRRResponse(BaseModel):
    """Mean Reciprocal Rank metrics."""

    total_clicks: int
    mrr: float
    avg_click_position: float
    time_range: str
    esql_query: str | None = None


class ZeroResultsRateResponse(BaseModel):
    """Zero results rate metrics."""

    total_searches: int
    zero_result_searches: int
    zero_results_rate: float
    time_range: str
    esql_query: str | None = None


class TopQuery(BaseModel):
    """Single top query entry."""

    user_query: str
    search_count: int
    avg_result_count: float
    had_clicks: int


class TopQueriesResponse(BaseModel):
    """Top queries response."""

    queries: list[TopQuery]
    time_range: str


class ClickPosition(BaseModel):
    """Click position distribution entry."""

    position: int
    clicks: int
    percentage: float


class ClickDistributionResponse(BaseModel):
    """Click position distribution response."""

    distribution: list[ClickPosition]
    time_range: str


class ZeroResultQuery(BaseModel):
    """Zero result query entry."""

    user_query: str
    occurrences: int


class ZeroResultQueriesResponse(BaseModel):
    """Zero result queries response."""

    queries: list[ZeroResultQuery]
    time_range: str


class AnalyticsOverview(BaseModel):
    """Combined analytics overview."""

    ctr: CTRResponse
    mrr: MRRResponse
    zero_results: ZeroResultsRateResponse
    time_range: str


class HealthResponse(BaseModel):
    """Analytics health check."""

    status: str
    has_data: bool
    trace_count: int
    message: str
    # Configuration hints for troubleshooting
    monitoring_configured: bool = True
    otel_configured: bool = True
    setup_hint: str | None = None


class QueryJudgmentDocument(BaseModel):
    """Single document in a query judgment list."""

    doc_id: str
    title: str | None = None  # Enriched from products index
    brand: str | None = None
    image_url: str | None = None
    clicks: int
    avg_position: float
    min_position: int
    max_position: int
    grade: int  # 0-4 derived from position-adjusted CTR


class QueryJudgmentsResponse(BaseModel):
    """Query-specific judgment list for LTR training."""

    query: str
    time_range: str
    total_clicks: int
    documents: list[QueryJudgmentDocument]


# =============================================================================
# ES|QL Execution
# =============================================================================


class NoDataError(Exception):
    """Raised when no analytics data is available."""

    pass


async def execute_esql(query: str) -> dict:
    """Execute an ES|QL query against the monitoring cluster.

    Args:
        query: The ES|QL query string

    Returns:
        Dict with 'columns' and 'values' from ES|QL response

    Raises:
        NoDataError: If the index doesn't exist or has no data
    """
    try:
        # Use monitoring cluster for APM trace queries
        es = get_monitoring_client()
        # ES|QL returns columnar data
        result = es.esql.query(query=query, format="json")
        return result
    except ValueError as e:
        # Monitoring cluster not configured
        logger.warning(f"Monitoring cluster not configured: {e}")
        raise NoDataError(
            "Monitoring cluster not configured. Check MONITORING_ELASTICSEARCH_URL in .env"
        )
    except Exception as e:
        error_str = str(e)
        # Handle "index not found" gracefully - this means no APM data yet
        if "Unknown index" in error_str or "index_not_found" in error_str:
            logger.info("No APM trace data found - analytics not available yet")
            raise NoDataError(
                "No search analytics data available. Use the Search page to generate data."
            )
        logger.error(f"ES|QL query failed: {e}")
        logger.debug(f"Query was: {query}")
        raise


def parse_esql_result(result: dict) -> list[dict]:
    """Parse ES|QL columnar result into list of row dicts.

    ES|QL returns: {"columns": [{"name": "col1"}, ...], "values": [[val1, val2], ...]}
    We convert to: [{"col1": val1, "col2": val2}, ...]
    """
    if not result or "columns" not in result:
        return []

    columns = [col["name"] for col in result["columns"]]
    values = result.get("values", [])

    return [dict(zip(columns, row)) for row in values]


# =============================================================================
# Endpoints
# =============================================================================


@router.get("/health", response_model=HealthResponse)
async def analytics_health():
    """Check analytics data availability.

    Verifies that trace data exists and can be queried
    on the monitoring cluster. Returns diagnostic information
    to help users understand configuration requirements.
    """
    # Check if monitoring cluster is configured
    if not settings.has_monitoring_cluster:
        return HealthResponse(
            status="not_configured",
            has_data=False,
            trace_count=0,
            message="Monitoring cluster not configured",
            monitoring_configured=False,
            otel_configured=bool(settings.OTEL_EXPORTER_OTLP_ENDPOINT),
            setup_hint=(
                "Analytics requires a monitoring cluster for APM traces. "
                "Add to .env:\n"
                "MONITORING_ELASTICSEARCH_URL=https://your-cluster.elastic-cloud.com:443\n"
                "MONITORING_ELASTIC_API_KEY=your-api-key"
            ),
        )

    # Check if OTel is configured (needed to generate traces)
    otel_configured = bool(settings.OTEL_EXPORTER_OTLP_ENDPOINT)

    try:
        es = get_monitoring_client()

        # Check if we have any search traces
        query = f"""
        FROM {APM_INDEX}
        | WHERE labels.search_user_query IS NOT NULL
        | STATS count = COUNT(*)
        """

        result = await execute_esql(query)
        rows = parse_esql_result(result)

        count = rows[0]["count"] if rows else 0

        if count > 0:
            return HealthResponse(
                status="healthy",
                has_data=True,
                trace_count=count,
                message=f"Found {count} search traces",
                monitoring_configured=True,
                otel_configured=otel_configured,
            )
        else:
            # Monitoring configured but no data yet
            hint = "Use the Search page to generate analytics data."
            if not otel_configured:
                hint = (
                    "OTel tracing not configured. Add to .env:\n"
                    "OTEL_EXPORTER_OTLP_ENDPOINT=https://your-apm.elastic-cloud.com:443\n"
                    "OTEL_EXPORTER_OTLP_HEADERS=Authorization=Bearer your-token\n\n"
                    "Then restart the backend and use the Search page to generate data."
                )
            return HealthResponse(
                status="no_data",
                has_data=False,
                trace_count=0,
                message="No search traces found.",
                monitoring_configured=True,
                otel_configured=otel_configured,
                setup_hint=hint,
            )

    except NoDataError as e:
        return HealthResponse(
            status="no_data",
            has_data=False,
            trace_count=0,
            message=str(e),
            monitoring_configured=True,
            otel_configured=otel_configured,
            setup_hint="Use the Search page to generate analytics data.",
        )
    except Exception as e:
        logger.error(f"Analytics health check failed: {e}")
        return HealthResponse(
            status="error",
            has_data=False,
            trace_count=0,
            message=f"Failed to query analytics: {e!s}",
            monitoring_configured=True,
            otel_configured=otel_configured,
            setup_hint="Check the backend logs for more details.",
        )


@router.get("/debug-clicks")
async def debug_clicks():
    """Debug endpoint to check click data."""
    try:
        es = get_monitoring_client()

        # Check what span names exist for our backend service
        span_query = f"""
        FROM {APM_INDEX}
        | WHERE service.name == "search-otel-ubi-backend"
        | STATS count = COUNT(*) BY span.name
        | SORT count DESC
        | LIMIT 30
        """
        span_result = es.esql.query(query=span_query, format="json")
        span_rows = parse_esql_result(span_result)

        # Check for ANY spans with search_result_click_id attribute
        click_attr_query = f"""
        FROM {APM_INDEX}
        | WHERE labels.search_result_click_id IS NOT NULL
        | LIMIT 5
        """
        try:
            click_attr_result = es.esql.query(query=click_attr_query, format="json")
            click_attr_rows = parse_esql_result(click_attr_result)
        except Exception as e:
            click_attr_rows = [{"error": str(e)}]

        # Check for search_result_click_position in numeric_labels
        click_pos_query = f"""
        FROM {APM_INDEX}
        | WHERE numeric_labels.search_result_click_position IS NOT NULL
        | LIMIT 5
        """
        try:
            click_pos_result = es.esql.query(query=click_pos_query, format="json")
            click_pos_rows = parse_esql_result(click_pos_result)
        except Exception as e:
            click_pos_rows = [{"error": str(e)}]

        # Get recent spans from our service to check their structure
        recent_query = f"""
        FROM {APM_INDEX}
        | WHERE service.name == "search-otel-ubi-backend"
        | SORT @timestamp DESC
        | LIMIT 3
        | KEEP @timestamp, span.name, labels.*, numeric_labels.*
        """
        try:
            recent_result = es.esql.query(query=recent_query, format="json")
            recent_rows = parse_esql_result(recent_result)
        except Exception as e:
            recent_rows = [{"error": str(e)}]

        return {
            "backend_span_names": span_rows[:10],
            "clicks_by_label_attr": click_attr_rows,
            "clicks_by_numeric_attr": click_pos_rows,
            "recent_backend_spans": recent_rows,
        }
    except Exception as e:
        return {"error": str(e)}


@router.get("/ctr", response_model=CTRResponse)
async def get_ctr(
    range: TimeRange = Query(default="24h", description="Time range for analytics"),
):
    """Get overall Click-Through Rate (CTR).

    CTR = (total clicks / total searches) * 100
    """
    time_filter = get_time_filter(range)

    # Query for search count
    search_query = f"""FROM {APM_INDEX}
| WHERE labels.search_user_query IS NOT NULL {time_filter}
| STATS total_searches = COUNT(*)"""

    # Query for click count (clicks have search_result_click_id set)
    click_query = f"""FROM {APM_INDEX}
| WHERE labels.search_result_click_id IS NOT NULL {time_filter}
| STATS total_clicks = COUNT(*)"""

    # Combined query for display
    display_query = f"""-- Searches:
{search_query}

-- Clicks:
{click_query}

-- CTR = (clicks / searches) * 100"""

    try:
        # Execute search count query
        search_result = await execute_esql(search_query)
        search_rows = parse_esql_result(search_result)
        total_searches = search_rows[0].get("total_searches", 0) if search_rows else 0

        # Try to execute click count query (may fail if no clicks yet)
        total_clicks = 0
        try:
            click_result = await execute_esql(click_query)
            click_rows = parse_esql_result(click_result)
            total_clicks = click_rows[0].get("total_clicks", 0) if click_rows else 0
        except Exception as click_err:
            # No click data yet - that's OK, just use 0
            logger.debug(f"No click data yet: {click_err}")

        # Calculate CTR
        ctr = (
            round((total_clicks / total_searches * 100), 2)
            if total_searches > 0
            else 0.0
        )

        return CTRResponse(
            total_searches=total_searches,
            total_clicks=total_clicks,
            ctr=ctr,
            time_range=range,
            esql_query=display_query,
        )

    except NoDataError:
        return CTRResponse(
            total_searches=0,
            total_clicks=0,
            ctr=0.0,
            time_range=range,
            esql_query=display_query,
        )
    except Exception as e:
        logger.error(f"CTR query failed: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch CTR: {e!s}")


@router.get("/mrr", response_model=MRRResponse)
async def get_mrr(
    range: TimeRange = Query(default="24h", description="Time range for analytics"),
):
    """Get Mean Reciprocal Rank (MRR).

    MRR = average(1/position) for all clicks
    - MRR = 1.0: All clicks on position 1 (perfect)
    - MRR = 0.5: Average click at position 2
    """
    time_filter = get_time_filter(range)

    # Click position is stored in numeric_labels.search_result_click_position
    query = f"""FROM {APM_INDEX}
| WHERE numeric_labels.search_result_click_position IS NOT NULL {time_filter}
| EVAL reciprocal = 1.0 / numeric_labels.search_result_click_position
| STATS 
    total_clicks = COUNT(*),
    mrr = ROUND(AVG(reciprocal), 4),
    avg_click_position = ROUND(AVG(numeric_labels.search_result_click_position), 2)"""

    try:
        result = await execute_esql(query)
        rows = parse_esql_result(result)

        if not rows or rows[0].get("total_clicks", 0) == 0:
            return MRRResponse(
                total_clicks=0,
                mrr=0.0,
                avg_click_position=0.0,
                time_range=range,
                esql_query=query,
            )

        row = rows[0]
        return MRRResponse(
            total_clicks=row.get("total_clicks", 0),
            mrr=row.get("mrr", 0.0) or 0.0,
            avg_click_position=row.get("avg_click_position", 0.0) or 0.0,
            time_range=range,
            esql_query=query,
        )

    except (NoDataError, Exception) as e:
        # No click data yet or query failed - return zeros
        if not isinstance(e, NoDataError):
            logger.debug(f"MRR query failed (likely no click data): {e}")
        return MRRResponse(
            total_clicks=0,
            mrr=0.0,
            avg_click_position=0.0,
            time_range=range,
            esql_query=query,
        )


@router.get("/zero-results", response_model=ZeroResultsRateResponse)
async def get_zero_results_rate(
    range: TimeRange = Query(default="24h", description="Time range for analytics"),
):
    """Get zero results rate.

    Zero Results Rate = (zero result queries / total queries) * 100

    Uses two queries: one for total, one for zero results, since ES|QL
    doesn't support CASE WHEN in STATS.
    """
    time_filter = get_time_filter(range)

    # Query for total searches
    total_query = f"""FROM {APM_INDEX}
| WHERE labels.search_user_query IS NOT NULL {time_filter}
| STATS total_searches = COUNT(*)"""

    # Query for zero result searches only
    # Note: search_zero_results is stored as keyword "true"/"false", not boolean
    zero_query = f"""FROM {APM_INDEX}
| WHERE labels.search_user_query IS NOT NULL 
    AND labels.search_zero_results == "true" {time_filter}
| STATS zero_result_searches = COUNT(*)"""

    # Combined query for display
    display_query = f"""-- Total searches:
{total_query}

-- Zero result searches:
{zero_query}

-- Rate = (zero_results / total) * 100"""

    try:
        # Execute both queries
        total_result = await execute_esql(total_query)
        total_rows = parse_esql_result(total_result)
        total_searches = total_rows[0].get("total_searches", 0) if total_rows else 0

        try:
            zero_result = await execute_esql(zero_query)
            zero_rows = parse_esql_result(zero_result)
            zero_result_searches = (
                zero_rows[0].get("zero_result_searches", 0) if zero_rows else 0
            )
        except NoDataError:
            zero_result_searches = 0

        # Calculate rate
        zero_results_rate = (
            round(zero_result_searches * 100.0 / total_searches, 2)
            if total_searches > 0
            else 0.0
        )

        return ZeroResultsRateResponse(
            total_searches=total_searches,
            zero_result_searches=zero_result_searches,
            zero_results_rate=zero_results_rate,
            time_range=range,
            esql_query=display_query,
        )

    except NoDataError:
        return ZeroResultsRateResponse(
            total_searches=0,
            zero_result_searches=0,
            zero_results_rate=0.0,
            time_range=range,
            esql_query=display_query,
        )
    except Exception as e:
        logger.error(f"Zero results query failed: {e}")
        raise HTTPException(
            status_code=500, detail=f"Failed to fetch zero results rate: {e!s}"
        )


@router.get("/top-queries", response_model=TopQueriesResponse)
async def get_top_queries(
    range: TimeRange = Query(default="24h", description="Time range for analytics"),
    limit: int = Query(
        default=20, ge=1, le=100, description="Number of queries to return"
    ),
):
    """Get top queries by volume.

    Returns the most frequently searched queries with their CTR.
    """
    time_filter = get_time_filter(range)

    # Note: result_count is in numeric_labels
    # Click tracking not yet implemented (had_clicks will be 0)
    # Filter out empty queries (browsing without search term)
    query = f"""
    FROM {APM_INDEX}
    | WHERE labels.search_user_query IS NOT NULL 
        AND labels.search_user_query != "" {time_filter}
    | STATS 
        search_count = COUNT(*),
        avg_result_count = ROUND(AVG(numeric_labels.search_result_count), 0)
      BY labels.search_user_query
    | RENAME labels.search_user_query AS user_query
    | SORT search_count DESC
    | LIMIT {limit}
    """

    try:
        result = await execute_esql(query)
        rows = parse_esql_result(result)

        queries = [
            TopQuery(
                user_query=row.get("user_query", ""),
                search_count=row.get("search_count", 0),
                avg_result_count=row.get("avg_result_count", 0) or 0,
                had_clicks=0,  # Click tracking not yet implemented
            )
            for row in rows
        ]

        return TopQueriesResponse(queries=queries, time_range=range)

    except NoDataError:
        return TopQueriesResponse(queries=[], time_range=range)
    except Exception as e:
        logger.error(f"Top queries query failed: {e}")
        raise HTTPException(
            status_code=500, detail=f"Failed to fetch top queries: {e!s}"
        )


@router.get("/click-distribution", response_model=ClickDistributionResponse)
async def get_click_distribution(
    range: TimeRange = Query(default="24h", description="Time range for analytics"),
    limit: int = Query(
        default=10, ge=1, le=20, description="Number of positions to return"
    ),
):
    """Get click position distribution.

    Shows how clicks are distributed across result positions.
    """
    time_filter = get_time_filter(range)

    # Click position is stored in numeric_labels.search_result_click_position
    query = f"""
    FROM {APM_INDEX}
    | WHERE numeric_labels.search_result_click_position IS NOT NULL {time_filter}
    | STATS clicks = COUNT(*) BY numeric_labels.search_result_click_position
    | RENAME numeric_labels.search_result_click_position AS position
    | SORT position ASC
    | LIMIT {limit}
    """

    try:
        result = await execute_esql(query)
        rows = parse_esql_result(result)

        if not rows:
            return ClickDistributionResponse(distribution=[], time_range=range)

        # Calculate total for percentage
        total_clicks = sum(row.get("clicks", 0) for row in rows)

        distribution = [
            ClickPosition(
                position=int(row.get("position", 0)),
                clicks=row.get("clicks", 0),
                percentage=round(row.get("clicks", 0) * 100.0 / total_clicks, 2)
                if total_clicks > 0
                else 0.0,
            )
            for row in rows
        ]

        return ClickDistributionResponse(distribution=distribution, time_range=range)

    except (NoDataError, Exception) as e:
        # No click data yet or query failed - return empty distribution
        if not isinstance(e, NoDataError):
            logger.debug(f"Click distribution query failed (likely no click data): {e}")
        return ClickDistributionResponse(distribution=[], time_range=range)


@router.get("/zero-result-queries", response_model=ZeroResultQueriesResponse)
async def get_zero_result_queries(
    range: TimeRange = Query(default="24h", description="Time range for analytics"),
    limit: int = Query(
        default=20, ge=1, le=100, description="Number of queries to return"
    ),
):
    """Get queries that returned zero results.

    Useful for identifying content gaps or query parsing issues.
    """
    time_filter = get_time_filter(range)

    # Note: search_zero_results is stored as keyword "true"/"false"
    query = f"""
    FROM {APM_INDEX}
    | WHERE labels.search_user_query IS NOT NULL 
        AND labels.search_zero_results == "true" {time_filter}
    | STATS occurrences = COUNT(*) BY labels.search_user_query
    | RENAME labels.search_user_query AS user_query
    | SORT occurrences DESC
    | LIMIT {limit}
    """

    try:
        result = await execute_esql(query)
        rows = parse_esql_result(result)

        queries = [
            ZeroResultQuery(
                user_query=row.get("user_query", ""),
                occurrences=row.get("occurrences", 0),
            )
            for row in rows
        ]

        return ZeroResultQueriesResponse(queries=queries, time_range=range)

    except NoDataError:
        return ZeroResultQueriesResponse(queries=[], time_range=range)
    except Exception as e:
        logger.error(f"Zero result queries query failed: {e}")
        raise HTTPException(
            status_code=500, detail=f"Failed to fetch zero result queries: {e!s}"
        )


@router.get("/overview", response_model=AnalyticsOverview)
async def get_overview(
    range: TimeRange = Query(default="24h", description="Time range for analytics"),
):
    """Get all key metrics in one call.

    Returns CTR, MRR, and zero results rate together.
    Useful for the analytics dashboard overview.
    """
    try:
        # Fetch all metrics (could be optimized with a single query)
        ctr = await get_ctr(range)
        mrr = await get_mrr(range)
        zero_results = await get_zero_results_rate(range)

        return AnalyticsOverview(
            ctr=ctr, mrr=mrr, zero_results=zero_results, time_range=range
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Overview query failed: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch overview: {e!s}")


def derive_grade_from_position(avg_position: float, clicks: int) -> int:
    """Derive LTR grade (0-4) from click position.

    Lower average position with more clicks = higher grade.
    This is a simplified COEC-like calculation.
    """
    if clicks == 0:
        return 0

    # Position-based scoring: position 1 is best
    if avg_position <= 1.5:
        return 4  # Excellent - clicked mostly at top
    elif avg_position <= 2.5:
        return 3  # Good - clicked in top 3
    elif avg_position <= 4.0:
        return 2  # Average - clicked in top 5
    elif avg_position <= 6.0:
        return 1  # Below average
    else:
        return 0  # Poor - clicked far down


@router.get("/query-judgments", response_model=QueryJudgmentsResponse)
async def get_query_judgments(
    query: str = Query(..., description="The search query to get judgments for"),
    range: TimeRange = Query(default="24h", description="Time range for analytics"),
    enrich: bool = Query(
        default=True, description="Enrich with product titles from index"
    ),
):
    """Get query-specific judgment list for LTR training.

    Returns documents clicked for a specific query with:
    - Click counts and position data
    - Derived relevance grades (0-4)
    - Optionally enriched with product titles

    This is the proper format for Learning-to-Rank training data.
    """
    time_filter = get_time_filter(range)

    esql_query = f"""
    FROM {APM_INDEX}
    | WHERE labels.search_user_query == "{query}"
        AND labels.search_result_click_id IS NOT NULL
        {time_filter}
    | STATS 
        clicks = COUNT(*),
        avg_position = ROUND(AVG(numeric_labels.search_result_click_position), 2),
        min_position = MIN(numeric_labels.search_result_click_position),
        max_position = MAX(numeric_labels.search_result_click_position)
      BY labels.search_result_click_id
    | RENAME labels.search_result_click_id AS doc_id
    | SORT clicks DESC, avg_position ASC
    | LIMIT 50
    """

    try:
        result = await execute_esql(esql_query)
        rows = parse_esql_result(result)

        if not rows:
            return QueryJudgmentsResponse(
                query=query, time_range=range, total_clicks=0, documents=[]
            )

        # Build document list with grades
        documents = []
        total_clicks = 0

        for row in rows:
            clicks = row.get("clicks", 0)
            avg_pos = row.get("avg_position", 0) or 0
            min_pos = int(row.get("min_position", 0) or 0)
            max_pos = int(row.get("max_position", 0) or 0)

            total_clicks += clicks

            doc = QueryJudgmentDocument(
                doc_id=row.get("doc_id", ""),
                clicks=clicks,
                avg_position=avg_pos,
                min_position=min_pos,
                max_position=max_pos,
                grade=derive_grade_from_position(avg_pos, clicks),
            )
            documents.append(doc)

        # Optionally enrich with product data
        if enrich and documents:
            documents = await enrich_with_product_data(documents)

        return QueryJudgmentsResponse(
            query=query,
            time_range=range,
            total_clicks=total_clicks,
            documents=documents,
        )

    except NoDataError:
        return QueryJudgmentsResponse(
            query=query, time_range=range, total_clicks=0, documents=[]
        )
    except Exception as e:
        logger.error(f"Query judgments failed: {e}")
        raise HTTPException(
            status_code=500, detail=f"Failed to fetch query judgments: {e!s}"
        )


async def enrich_with_product_data(
    documents: list[QueryJudgmentDocument],
) -> list[QueryJudgmentDocument]:
    """Enrich judgment documents with product titles from the products index."""
    from ..elasticsearch.client import get_es_client

    try:
        es = get_es_client()
        doc_ids = [doc.doc_id for doc in documents]

        # Bulk fetch products by ID
        response = es.mget(
            index="products",
            body={"ids": doc_ids},
            _source=["title", "brand", "image_url"],
        )

        # Create lookup map
        product_map = {}
        for doc in response.get("docs", []):
            if doc.get("found"):
                product_map[doc["_id"]] = doc.get("_source", {})

        # Enrich documents
        for doc in documents:
            if doc.doc_id in product_map:
                product = product_map[doc.doc_id]
                doc.title = product.get("title")
                doc.brand = product.get("brand")
                doc.image_url = product.get("image_url")

        return documents

    except Exception as e:
        logger.warning(f"Failed to enrich products: {e}")
        return documents  # Return unenriched on error


@router.get("/queries-with-clicks")
async def get_queries_with_clicks(
    range: TimeRange = Query(default="24h", description="Time range for analytics"),
    limit: int = Query(
        default=20, ge=1, le=100, description="Number of queries to return"
    ),
):
    """Get queries that have click data, for the query picker UI.

    Returns queries sorted by click count (most clicked first).
    """
    time_filter = get_time_filter(range)

    query = f"""
    FROM {APM_INDEX}
    | WHERE labels.search_result_click_id IS NOT NULL
        AND labels.search_user_query IS NOT NULL
        AND labels.search_user_query != ""
        {time_filter}
    | STATS 
        click_count = COUNT(*),
        unique_docs = COUNT_DISTINCT(labels.search_result_click_id)
      BY labels.search_user_query
    | RENAME labels.search_user_query AS query
    | SORT click_count DESC
    | LIMIT {limit}
    """

    try:
        result = await execute_esql(query)
        rows = parse_esql_result(result)

        return {
            "queries": [
                {
                    "query": row.get("query", ""),
                    "click_count": row.get("click_count", 0),
                    "unique_docs": row.get("unique_docs", 0),
                }
                for row in rows
            ],
            "time_range": range,
        }

    except NoDataError:
        return {"queries": [], "time_range": range}
    except Exception as e:
        logger.error(f"Queries with clicks failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))
