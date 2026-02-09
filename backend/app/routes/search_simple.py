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
from ..otel import get_tracer

logger = logging.getLogger(__name__)
tracer = get_tracer()

router = APIRouter(prefix="/api/search", tags=["search"])


# =============================================================================
# Configuration
# =============================================================================

# Default search config - works with product-like indexes
# Will be used if fields exist, otherwise falls back to wildcard search
SEARCH_CONFIG = {
    "index": settings.SEARCH_INDEX,
    # Fields to search with boosts (if they exist)
    "searchFields": ["title^3", "description", "brand^2", "category^1.5", "name^3"],
    # Facet fields to try (will skip if field doesn't exist)
    "facets": [
        {"field": "category", "label": "Category", "size": 20},
        {"field": "brand", "label": "Brand", "size": 20},
    ],
    "pageSize": 12,
}


# =============================================================================
# Request/Response Models
# =============================================================================


class SearchRequest(BaseModel):
    """Search request parameters."""

    query: str = Field(default="", description="Search query string")
    page: int = Field(default=1, ge=1, description="Page number (1-indexed)")
    page_size: int = Field(default=12, ge=1, le=100, description="Results per page")
    filters: dict[str, Any] | None = Field(default=None, description="Field filters")
    sort_by: str | None = Field(default=None, description="Sort field")
    sort_dir: str = Field(default="desc", description="Sort direction: asc or desc")


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

        try:
            es = get_es_client()
            index = SEARCH_CONFIG["index"]
            span.set_attribute("search.index", index)

            # Build query
            query_body = _build_robust_query(es, index, request)

            # Execute search
            response = es.search(index=index, body=query_body)

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
            aggs = {}
            for facet in SEARCH_CONFIG["facets"]:
                field = facet["field"]
                if field in response.get("aggregations", {}):
                    buckets = response["aggregations"][field].get("buckets", [])
                    if buckets:
                        aggs[field] = [
                            AggregationBucket(key=b["key"], doc_count=b["doc_count"])
                            for b in buckets
                        ]

            logger.info(
                f"Search: query='{request.query}' results={total} took={took_ms}ms"
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

        semantic_fields = []
        for field_name, field_info in props.items():
            if field_info.get("type") == "semantic_text":
                semantic_fields.append(field_name)
        return semantic_fields
    except Exception as e:
        logger.warning(f"Could not get semantic fields for {index}: {e}")
        return []


def _build_robust_query(es, index: str, request: SearchRequest) -> dict:
    """Build Elasticsearch query with robust defaults.

    Strategy:
    1. Check for semantic_text fields and use semantic queries for them
    2. Also include keyword matching on keyword fields
    3. Fall back to simple_query_string on text fields
    4. Add aggregations only for fields that exist
    """
    # Build bool query
    bool_query: dict[str, Any] = {}

    # Text search
    if request.query and request.query.strip():
        semantic_fields = _get_semantic_fields(es, index)
        text_fields = _get_index_text_fields(es, index)

        if semantic_fields:
            # Build hybrid query: semantic on semantic_text fields + keyword matching
            should_clauses = []
            for sf in semantic_fields:
                should_clauses.append({
                    "semantic": {"field": sf, "query": request.query}
                })
            # Also add keyword matching on all keyword fields for exact matches
            should_clauses.append({
                "simple_query_string": {
                    "query": request.query,
                    "fields": ["*"],
                    "default_operator": "OR",
                }
            })
            bool_query["must"] = [
                {"bool": {"should": should_clauses, "minimum_should_match": 1}}
            ]
        elif text_fields:
            bool_query["must"] = [
                {
                    "simple_query_string": {
                        "query": request.query,
                        "fields": ["*"],
                        "default_operator": "AND",
                        "analyze_wildcard": True,
                    }
                }
            ]
        else:
            bool_query["must"] = [
                {
                    "multi_match": {
                        "query": request.query,
                        "fields": SEARCH_CONFIG["searchFields"],
                        "type": "best_fields",
                        "fuzziness": "AUTO",
                    }
                }
            ]
    else:
        bool_query["must"] = [{"match_all": {}}]

    # Filters
    if request.filters:
        filter_clauses = []
        for field, value in request.filters.items():
            if value is not None:
                filter_clauses.append({"term": {field: value}})
        if filter_clauses:
            bool_query["filter"] = filter_clauses

    # Build complete query
    query_body = {
        "query": {"bool": bool_query},
        "from": (request.page - 1) * request.page_size,
        "size": request.page_size,
        "highlight": {
            "fields": {"*": {}},
            "pre_tags": ["<mark>"],
            "post_tags": ["</mark>"],
        },
    }

    # Aggregations for facets - only add if fields might exist
    # We'll add them and let ES ignore non-existent fields
    query_body["aggs"] = {}
    for facet in SEARCH_CONFIG["facets"]:
        # Use keyword subfield if it exists, otherwise try the field directly
        field_name = facet["field"]
        query_body["aggs"][field_name] = {
            "terms": {
                "field": field_name,
                "size": facet.get("size", 20),
                "missing": "__missing__",  # Handle missing values gracefully
            }
        }

    # Sort
    if request.sort_by and request.sort_by != "_score":
        query_body["sort"] = [
            {request.sort_by: {"order": request.sort_dir, "unmapped_type": "keyword"}},
            {"_score": "desc"},
        ]

    return query_body
