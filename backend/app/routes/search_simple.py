"""Simplified Search API for Starter Template

A clean, minimal search endpoint with:
- POST /api/search - Search with filters and pagination
- GET /api/search/config - Get current configuration
- GET /api/search/health - Check search availability

Features robust defaults that work with any index structure:
- Uses simple_query_string to search all text fields when not configured
- Falls back gracefully when expected fields don't exist
- Aggregations only run on fields that exist

OTel Instrumentation:
- Custom span attributes for search analytics
- Follows semantic conventions from docs/SEMANTIC-CONVENTIONS.md
"""

import logging
from typing import Any, Optional

from fastapi import APIRouter, HTTPException
from opentelemetry import trace
from pydantic import BaseModel, Field

from ..config import settings
from ..elasticsearch.client import get_es_client
from ..elasticsearch.retriever_builder import RetrieverBuilder
from ..otel import get_tracer

logger = logging.getLogger(__name__)
tracer = get_tracer()

router = APIRouter(prefix="/api/search", tags=["search"])


# =============================================================================
# Configuration
# =============================================================================

# Default search config — generic fallback for API calls without frontend facets.
# The frontend searchConfig.ts is the source of truth for domain-specific facets.
SEARCH_CONFIG = {
    "index": settings.SEARCH_INDEX,
    # Default search fields — override in searchConfig.ts for your index
    "searchFields": ["title^3", "description^2", "body^1", "content^1"],
    # Default facet fields — override with your index's facetable fields
    "facets": [
        {"field": "category", "label": "Category", "size": 20},
        {"field": "type", "label": "Type", "size": 15},
    ],
    # Page size advertised to the frontend via /api/search/config.
    # Must match SearchRequest.page_size default (below) so the UI and the
    # API agree on a default page size.
    "pageSize": 12,
    # Query Rules ruleset ID — set to a non-empty string to enable query rules.
    # Leave as "" to disable (no query rules applied by default).
    "queryRulesRulesetId": "",
}


# =============================================================================
# Request/Response Models
# =============================================================================


class FacetRequest(BaseModel):
    """A single facet requested by the frontend."""

    field: str
    size: int = Field(default=20, ge=1, le=100)


class SearchRequest(BaseModel):
    """Search request parameters."""

    query: str = Field(default="", description="Search query string")
    page: int = Field(default=1, ge=1, description="Page number (1-indexed)")
    page_size: int = Field(default=12, ge=1, le=100, description="Results per page")
    filters: dict[str, Any] | None = Field(default=None, description="Field filters")
    sort_by: str | None = Field(default=None, description="Sort field")
    sort_dir: str = Field(default="desc", description="Sort direction: asc or desc")
    facets: list[FacetRequest] | None = Field(
        default=None,
        description="Facet fields for aggregations. If provided, overrides server defaults.",
    )
    search_type: str = Field(
        default="auto",
        description="Search strategy: 'keyword' (BM25 only), 'semantic' (semantic_text only), "
        "'auto' or 'hybrid' (BM25 + semantic_text should clauses when semantic fields exist). "
        "Other values fall through to the hybrid branch when semantic_text is present.",
    )
    field_boosts: dict[str, float] | None = Field(
        default=None,
        description="Per-field boost overrides, e.g. {'title': 3.0, 'description': 1.0}. "
        "When provided, uses multi_match instead of simple_query_string so boosts are visible.",
    )
    semantic_weight: float | None = Field(
        default=None,
        ge=0,
        le=100,
        description="Hybrid mode balance: 0=all keyword, 100=all semantic, 50=equal (default).",
    )
    include_query: bool = Field(
        default=False,
        description="When true, include the raw ES query body in the response (for query inspector).",
    )


class SearchHit(BaseModel):
    """A single search result."""

    id: str
    score: float
    source: dict[str, Any]
    highlight: dict[str, list[str]] | None = None


class AggregationBucket(BaseModel):
    """A single aggregation bucket."""

    key: str
    doc_count: int


class SearchResponse(BaseModel):
    """Search response with results and metadata."""

    hits: list[SearchHit]
    total: int
    page: int
    page_size: int
    total_pages: int
    took_ms: int
    query: str
    aggregations: dict[str, list[AggregationBucket]]
    es_query: dict[str, Any] | None = None


# =============================================================================
# Endpoints
# =============================================================================


@router.post("", response_model=SearchResponse, operation_id="searchSimple")
async def search(request: SearchRequest) -> SearchResponse:
    """Search with filters and pagination.

    Uses robust defaults that work with any index:
    - simple_query_string searches all text fields
    - Aggregations only run on fields that exist
    - Falls back gracefully when fields are missing

    OTel Instrumentation:
    - search.user_query: User's search text
    - search.result_count: Total matching results
    - search.page: Current page
    - search.took_ms: Query time (ms)
    - search.zero_results: Boolean
    """
    with tracer.start_as_current_span("search.execute") as span:
        span.set_attribute("search.user_query", request.query)
        span.set_attribute("search.page", request.page)
        span.set_attribute("search.page_size", request.page_size)
        span.set_attribute("search.search_type", request.search_type)

        try:
            es = get_es_client()
            index = SEARCH_CONFIG["index"]
            span.set_attribute("search.index", index)

            # Build query
            query_body = _build_retriever_query(es, index, request)

            # Execute search
            response = es.search(index=index, body=query_body)
            es_query_out = query_body if request.include_query else None

            # Extract results
            took_ms = response.get("took", 0)
            total = response["hits"]["total"]["value"]

            span.set_attribute("search.took_ms", took_ms)
            span.set_attribute("search.result_count", total)
            span.set_attribute("search.zero_results", total == 0)

            # Build hits
            hits = []
            for hit in response["hits"]["hits"]:
                hits.append(
                    SearchHit(
                        id=hit["_id"],
                        score=hit.get("_score", 0.0) or 0.0,
                        source=hit["_source"],
                        highlight=hit.get("highlight"),
                    )
                )

            # Build aggregations (only for fields that returned data)
            facet_config = request.facets if request.facets else SEARCH_CONFIG["facets"]
            aggs = {}
            for facet in facet_config:
                field = facet.field if hasattr(facet, "field") else facet["field"]
                if field in response.get("aggregations", {}):
                    buckets = response["aggregations"][field].get("buckets", [])
                    if buckets:
                        aggs[field] = [
                            AggregationBucket(key=b["key"], doc_count=b["doc_count"])
                            for b in buckets
                        ]

            logger.info(
                f"Search: query='{request.query}' type={request.search_type} results={total} took={took_ms}ms"
            )

            return SearchResponse(
                hits=hits,
                total=total,
                page=request.page,
                page_size=request.page_size,
                total_pages=(total + request.page_size - 1) // request.page_size,
                took_ms=took_ms,
                query=request.query,
                aggregations=aggs,
                es_query=es_query_out,
            )

        except Exception as e:
            logger.error(f"Search error: {e}")
            span.set_status(trace.StatusCode.ERROR, str(e))
            raise HTTPException(status_code=500, detail=f"Search failed: {e!s}")


@router.get("/config", operation_id="getSearchConfigSimple")
async def get_config() -> dict:
    """Get current search configuration."""
    return SEARCH_CONFIG


@router.get("/health", operation_id="getSearchHealthSimple")
async def health_check() -> dict:
    """Check if search is available."""
    try:
        es = get_es_client()
        es.info()
        return {"status": "healthy", "index": SEARCH_CONFIG["index"]}
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Search unavailable: {e!s}")


# =============================================================================
# Query Building
# =============================================================================


def _get_index_text_fields(es, index: str) -> list[str]:
    """Get all text fields from the index mapping."""
    try:
        mapping = es.indices.get_mapping(index=index)
        # Handle both direct index and alias
        if index in mapping:
            props = mapping[index]["mappings"].get("properties", {})
        else:
            first_index = next(iter(mapping))
            props = mapping[first_index]["mappings"].get("properties", {})

        text_fields = []
        _extract_text_fields(props, "", text_fields)
        return text_fields
    except Exception as e:
        logger.warning(f"Could not get mapping for {index}: {e}")
        return []


def _extract_text_fields(properties: dict, prefix: str, result: list):
    """Recursively extract text field names from mapping properties."""
    for field_name, field_info in properties.items():
        full_name = f"{prefix}{field_name}" if prefix else field_name
        field_type = field_info.get("type", "")

        if field_type == "text":
            result.append(full_name)
        elif "properties" in field_info:
            _extract_text_fields(field_info["properties"], f"{full_name}.", result)


def _check_field_exists(es, index: str, field: str) -> bool:
    """Check if a field exists in the index mapping."""
    try:
        mapping = es.indices.get_mapping(index=index)
        if index in mapping:
            props = mapping[index]["mappings"].get("properties", {})
        else:
            first_index = next(iter(mapping))
            props = mapping[first_index]["mappings"].get("properties", {})

        # Simple check for top-level fields
        return field in props
    except Exception:
        return False


def _get_semantic_fields(es, index: str) -> list[str]:
    """Get all semantic_text fields from the index mapping."""
    try:
        mapping = es.indices.get_mapping(index=index)
        if index in mapping:
            props = mapping[index]["mappings"].get("properties", {})
        else:
            first_index = next(iter(mapping))
            props = mapping[first_index]["mappings"].get("properties", {})

        semantic_fields: list[str] = []
        _extract_semantic_fields(props, "", semantic_fields)
        return semantic_fields
    except Exception as e:
        logger.warning(f"Could not get semantic fields for {index}: {e}")
        return []


def _extract_semantic_fields(properties: dict, prefix: str, result: list):
    """Recursively extract semantic_text field names from mapping properties."""
    for field_name, field_info in properties.items():
        full_name = f"{prefix}{field_name}" if prefix else field_name
        if field_info.get("type") == "semantic_text":
            result.append(full_name)
        elif "properties" in field_info:
            _extract_semantic_fields(field_info["properties"], f"{full_name}.", result)


def _build_search_fields(field_boosts: dict[str, float] | None) -> list[str]:
    """Return ES field^boost strings from overrides or the config defaults."""
    if field_boosts:
        fields = [f"{f}^{b}" for f, b in field_boosts.items() if b > 0]
        return fields if fields else SEARCH_CONFIG["searchFields"]
    return SEARCH_CONFIG["searchFields"]


def _build_filter_clauses(filters: dict | None) -> list[dict]:
    """Convert the request filters dict into ES filter clause list."""
    if not filters:
        return []
    clauses = []
    for field, value in filters.items():
        if value is not None:
            clauses.append({"terms": {field: value}} if isinstance(value, list) else {"term": {field: value}})
    return clauses


def _build_retriever_query(es, index: str, request: SearchRequest) -> dict:
    """Build an Elasticsearch query using the RetrieverBuilder.

    Modes:
    - keyword: standard retriever with multi_match (field boosts applied)
    - semantic: standard retriever with semantic query on semantic_text field
    - hybrid / auto: linear retriever combining text + semantic retrievers;
      semantic_weight (0-100) maps to 0.0-1.0 linear weights
    """
    search_type = request.search_type or "auto"
    search_fields = _build_search_fields(request.field_boosts)
    filter_clauses = _build_filter_clauses(request.filters)

    # Resolve facets for aggregations
    facet_config = request.facets if request.facets else SEARCH_CONFIG["facets"]
    facets_for_builder = [
        {"field": (f.field if hasattr(f, "field") else f["field"]),
         "size": (f.size if hasattr(f, "size") else f.get("size", 20))}
        for f in facet_config
    ]

    builder = RetrieverBuilder({
        "index": index,
        "searchFields": search_fields,
        "facets": facets_for_builder,
    })

    ruleset_id = SEARCH_CONFIG.get("queryRulesRulesetId")
    ruleset_ids = [ruleset_id] if (ruleset_id and request.query and request.query.strip()) else None

    # Discover semantic fields only when needed
    semantic_fields = _get_semantic_fields(es, index) if search_type != "keyword" else []
    # Use the first semantic_text field found (mapping insertion order)
    semantic_field = semantic_fields[0] if semantic_fields else None

    # Semantic weight: UI is 0-100, builder expects 0.0-1.0
    raw_weight = (request.semantic_weight if request.semantic_weight is not None else 50.0) / 100.0
    text_weight = round(1.0 - raw_weight, 3)
    sem_weight = round(raw_weight, 3)

    if search_type == "semantic":
        if not semantic_field:
            logger.warning(f"search_type='semantic' but no semantic_text fields found in '{index}'")
            return {"query": {"match_none": {}}, "from": 0, "size": request.page_size}
        # Pass the real query through so query rules (match_criteria.query_string)
        # can still match in pure-semantic mode, but suppress the text retriever
        # via disable_text_retriever so only the semantic retriever scores docs.
        return builder.build(
            query=request.query,
            disable_text_retriever=True,
            filters=filter_clauses,
            page=request.page,
            page_size=request.page_size,
            sort_by=request.sort_by,
            sort_dir=request.sort_dir,
            ruleset_ids=ruleset_ids,
            semantic_config={"field": semantic_field, "query": request.query},
        )

    elif search_type in ("hybrid", "auto") and semantic_field:
        return builder.build(
            query=request.query,
            filters=filter_clauses,
            page=request.page,
            page_size=request.page_size,
            sort_by=request.sort_by,
            sort_dir=request.sort_dir,
            ruleset_ids=ruleset_ids,
            semantic_config={"field": semantic_field, "query": request.query},
            hybrid_config={
                "semantic_weight": sem_weight,
                "text_weight": text_weight,
                "use_linear": True,
            },
        )

    else:
        # keyword mode (or hybrid with no semantic fields → degrade gracefully)
        if search_type == "hybrid" and not semantic_field:
            logger.warning(f"search_type='hybrid' but no semantic_text fields — falling back to keyword")
        return builder.build(
            query=request.query,
            filters=filter_clauses,
            page=request.page,
            page_size=request.page_size,
            sort_by=request.sort_by,
            sort_dir=request.sort_dir,
            ruleset_ids=ruleset_ids,
        )
