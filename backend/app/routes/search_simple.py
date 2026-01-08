"""
Simplified Search API for Starter Template

A clean, minimal search endpoint (~200 lines) with:
- POST /api/search - Search with filters and pagination
- GET /api/search/config - Get current configuration
- GET /api/search/health - Check search availability

OTel Instrumentation:
- Custom span attributes for search analytics
- Follows semantic conventions from docs/SEMANTIC-CONVENTIONS.md

Removed features (see search.py for full version):
- Lab Mode / Feature weights
- Personalization (user preferences, session context)
- Diversification (field collapse, MMR)
- Learning to Rank
- Query type configuration / Hybrid search
- Explain mode
- Config update endpoint
- Fields introspection
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Optional, Any
import logging

from opentelemetry import trace

from ..elasticsearch.client import get_es_client
from ..config import settings
from ..otel import get_tracer

logger = logging.getLogger(__name__)
tracer = get_tracer()

router = APIRouter(prefix="/api/search", tags=["search"])


# =============================================================================
# Configuration
# =============================================================================

SEARCH_CONFIG = {
    "index": settings.SEARCH_INDEX,
    "searchFields": ["title^3", "description", "brand^2", "category^1.5"],
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
    filters: Optional[dict[str, Any]] = Field(default=None, description="Field filters")
    sort_by: Optional[str] = Field(default=None, description="Sort field")
    sort_dir: str = Field(default="desc", description="Sort direction: asc or desc")


class SearchHit(BaseModel):
    """A single search result."""
    id: str
    score: float
    source: dict[str, Any]
    highlight: Optional[dict[str, list[str]]] = None


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

@router.post("", response_model=SearchResponse)
async def search(request: SearchRequest) -> SearchResponse:
    """
    Search with filters and pagination.
    
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
            query_body = _build_query(request)
            
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
                hits.append(SearchHit(
                    id=hit["_id"],
                    score=hit.get("_score", 0.0) or 0.0,
                    source=hit["_source"],
                    highlight=hit.get("highlight"),
                ))
            
            # Build aggregations
            aggs = {}
            for facet in SEARCH_CONFIG["facets"]:
                field = facet["field"]
                if field in response.get("aggregations", {}):
                    aggs[field] = [
                        AggregationBucket(key=b["key"], doc_count=b["doc_count"])
                        for b in response["aggregations"][field]["buckets"]
                    ]
            
            logger.info(f"Search: query='{request.query}' results={total} took={took_ms}ms")
            
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
            raise HTTPException(status_code=500, detail=f"Search failed: {str(e)}")


@router.get("/config")
async def get_config() -> dict:
    """Get current search configuration."""
    return SEARCH_CONFIG


@router.get("/health")
async def health_check() -> dict:
    """Check if search is available."""
    try:
        es = get_es_client()
        es.info()
        return {"status": "healthy", "index": SEARCH_CONFIG["index"]}
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Search unavailable: {str(e)}")


# =============================================================================
# Query Building
# =============================================================================

def _build_query(request: SearchRequest) -> dict:
    """Build Elasticsearch query from request."""
    
    # Build bool query
    bool_query: dict[str, Any] = {}
    
    # Text search
    if request.query and request.query.strip():
        bool_query["must"] = [{
            "multi_match": {
                "query": request.query,
                "fields": SEARCH_CONFIG["searchFields"],
                "type": "best_fields",
                "fuzziness": "AUTO",
            }
        }]
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
    
    # Aggregations for facets
    query_body["aggs"] = {}
    for facet in SEARCH_CONFIG["facets"]:
        query_body["aggs"][facet["field"]] = {
            "terms": {"field": facet["field"], "size": facet.get("size", 20)}
        }
    
    # Sort
    if request.sort_by and request.sort_by != "_score":
        query_body["sort"] = [
            {request.sort_by: request.sort_dir},
            {"_score": "desc"},
        ]
    
    return query_body

