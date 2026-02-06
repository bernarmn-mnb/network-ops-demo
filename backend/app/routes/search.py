"""Advanced Search API endpoints - Config management, suggest, field introspection, capabilities.

POST /api/search/config - Update search configuration
GET /api/search/fields/{index} - Introspect index fields
GET /api/search/indices - List available indices
GET /api/search/suggest - Autocomplete suggestions
GET /api/search/capabilities - Index feature detection

Note: The core search endpoints (POST /api/search, GET /api/search/config,
GET /api/search/health) are in search_simple.py.

OTel Instrumentation:
- Custom span attributes for search analytics (search.user_query, search.result_count, etc.)
- Follows semantic conventions from docs/SEMANTIC-CONVENTIONS.md
"""

import logging
from contextlib import contextmanager

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from ..config import settings
from ..elasticsearch.client import get_es_client
from ..elasticsearch.query_builder import get_index_fields

# Optional OpenTelemetry support - gracefully degrade if not available
try:
    from opentelemetry import trace

    from ..otel import get_tracer

    tracer = get_tracer()
    OTEL_AVAILABLE = True
except ImportError:
    OTEL_AVAILABLE = False
    tracer = None

logger = logging.getLogger(__name__)


@contextmanager
def optional_span(name: str):
    """Context manager that creates a span if OTel is available, otherwise no-op."""
    if OTEL_AVAILABLE and tracer:
        with tracer.start_as_current_span(name) as span:
            yield span
    else:
        yield None


router = APIRouter(prefix="/api/search", tags=["search"])


# =============================================================================
# In-Memory Config Store (would be persisted in production)
# =============================================================================

# Default configuration - matches frontend searchConfig.ts
_search_config = {
    "index": settings.SEARCH_INDEX,
    "queryTemplate": "simple",
    "templateVars": {},
    "modifiers": [],
    "searchFields": ["title^3", "description", "brand^2", "category^1.5", "tags"],
    "facets": [
        {"field": "category", "label": "Category", "size": 20},
        {"field": "brand", "label": "Brand", "size": 20},
    ],
    "rangeFilters": [
        {"field": "price", "label": "Price", "min": 0, "max": 2500},
        {"field": "rating", "label": "Rating", "min": 0, "max": 5},
    ],
    "pageSize": 12,
}


# =============================================================================
# Request/Response Models
# =============================================================================


class SearchConfigRequest(BaseModel):
    """Configuration update request."""

    index: str | None = None
    queryTemplate: str | None = None
    templateVars: dict | None = None
    searchFields: list[str] | None = None
    facets: list[dict] | None = None
    rangeFilters: list[dict] | None = None
    pageSize: int | None = None


class FieldInfo(BaseModel):
    """Field metadata from index mapping."""

    type: str
    searchable: bool
    aggregatable: bool
    sortable: bool


class IndexCapabilities(BaseModel):
    """Index capability information for feature detection."""

    has_rank_features: bool = False
    rank_feature_fields: list[str] = []
    has_semantic: bool = False
    semantic_fields: list[str] = []  # semantic_text fields (for semantic query)
    dense_vector_fields: list[str] = []  # dense_vector fields (for kNN query)
    searchable_fields: list[str] = []
    message: str = ""


class Suggestion(BaseModel):
    """Single suggestion item."""

    text: str
    score: float | None = None
    source: dict | None = None  # Product data if from product index


class SuggestResponse(BaseModel):
    """Suggest response."""

    suggestions: list[Suggestion]
    query: str
    took_ms: int


# =============================================================================
# Endpoints
# =============================================================================


@router.post("/config")
async def update_config(request: SearchConfigRequest) -> dict:
    """Update search configuration.

    Only provided fields are updated; others remain unchanged.
    This allows LLM agents to make targeted updates.
    """
    global _search_config

    if request.index is not None:
        _search_config["index"] = request.index
    if request.queryTemplate is not None:
        _search_config["queryTemplate"] = request.queryTemplate
    if request.templateVars is not None:
        _search_config["templateVars"] = request.templateVars
    if request.searchFields is not None:
        _search_config["searchFields"] = request.searchFields
    if request.facets is not None:
        _search_config["facets"] = request.facets
    if request.rangeFilters is not None:
        _search_config["rangeFilters"] = request.rangeFilters
    if request.pageSize is not None:
        _search_config["pageSize"] = request.pageSize

    logger.info(
        f"Config updated: index={_search_config['index']}, template={_search_config['queryTemplate']}"
    )

    return {"status": "updated", "config": _search_config}


@router.get("/fields/{index}")
async def get_fields(index: str) -> dict[str, FieldInfo]:
    """Introspect an index to discover its fields.

    Useful for LLM agents to understand what fields are available
    when configuring search for a new index.
    """
    try:
        es = get_es_client()
        fields = get_index_fields(es, index)
        return {name: FieldInfo(**info) for name, info in fields.items()}
    except Exception as e:
        raise HTTPException(status_code=404, detail=f"Index not found: {e!s}")


@router.get("/indices")
async def list_indices() -> list[dict]:
    """List available indices with document counts.

    Useful for LLM agents to discover what data is available.
    """
    try:
        es = get_es_client()
        indices = es.cat.indices(format="json")
        return [
            {
                "index": idx["index"],
                "docs": int(idx.get("docs.count", 0)),
                "size": idx.get("store.size", "0b"),
            }
            for idx in indices
            if not idx["index"].startswith(".")
        ]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to list indices: {e!s}")


# =============================================================================
# Autocomplete / Suggest
# =============================================================================


@router.get("/suggest", response_model=SuggestResponse)
async def suggest(
    q: str,
    limit: int = 8,
) -> SuggestResponse:
    """Get autocomplete suggestions for search.

    Uses prefix matching on product titles and brands.
    Returns up to `limit` suggestions ranked by relevance.

    OTel Instrumentation:
    - search.suggest.query: The prefix being searched
    - search.suggest.count: Number of suggestions returned
    """
    with optional_span("search.suggest") as span:
        span and span.set_attribute("search.suggest.query", q)
        span and span.set_attribute("search.suggest.limit", limit)

        try:
            es = get_es_client()
        except Exception as e:
            logger.error(f"Elasticsearch connection error: {e}")
            span and span.set_attribute("search.error", str(e))
            span.set_status(trace.StatusCode.ERROR, str(e))
            raise HTTPException(
                status_code=503,
                detail="Suggest service unavailable. Check Elasticsearch connection.",
            )

        try:
            index = _search_config["index"]
            span and span.set_attribute("search.index", index)

            # Use multi_match with prefix for suggestions
            # This approach works without special mapping requirements
            query_body = {
                "size": limit,
                "query": {
                    "bool": {
                        "should": [
                            # Prefix match on title (highest weight)
                            {"prefix": {"title": {"value": q.lower(), "boost": 3.0}}},
                            # Match phrase prefix for multi-word queries
                            {
                                "match_phrase_prefix": {
                                    "title": {"query": q, "boost": 2.0}
                                }
                            },
                            # Prefix on brand
                            {"prefix": {"brand": {"value": q.lower(), "boost": 1.5}}},
                            # Fallback fuzzy match
                            {
                                "match": {
                                    "title": {
                                        "query": q,
                                        "fuzziness": "AUTO",
                                        "prefix_length": 2,
                                        "boost": 1.0,
                                    }
                                }
                            },
                        ],
                        "minimum_should_match": 1,
                    }
                },
                "_source": ["title", "brand", "category", "price", "image_url"],
                "highlight": {
                    "fields": {
                        "title": {"pre_tags": ["<mark>"], "post_tags": ["</mark>"]}
                    }
                },
            }

            response = es.search(index=index, body=query_body)

            # Extract suggestions from hits
            suggestions = []
            seen_titles = set()  # Deduplicate by title

            for hit in response["hits"]["hits"]:
                title = hit["_source"].get("title", "")
                if title.lower() in seen_titles:
                    continue
                seen_titles.add(title.lower())

                suggestions.append(
                    Suggestion(
                        text=title,
                        score=hit.get("_score"),
                        source={
                            "id": hit["_id"],
                            "brand": hit["_source"].get("brand"),
                            "category": hit["_source"].get("category"),
                            "price": hit["_source"].get("price"),
                            "image_url": hit["_source"].get("image_url"),
                        },
                    )
                )

            took_ms = response["took"]

            span and span.set_attribute("search.suggest.count", len(suggestions))
            span and span.set_attribute("search.took_ms", took_ms)

            logger.info(
                f"Suggest: query='{q}' results={len(suggestions)} took={took_ms}ms"
            )

            return SuggestResponse(
                suggestions=suggestions,
                query=q,
                took_ms=took_ms,
            )

        except Exception as e:
            logger.error(f"Suggest error: {e}")
            span and span.set_attribute("search.error", str(e))
            span.set_status(trace.StatusCode.ERROR, str(e))
            raise HTTPException(status_code=500, detail=f"Suggest failed: {e!s}")


@router.get("/capabilities", response_model=IndexCapabilities)
async def get_capabilities() -> IndexCapabilities:
    """Check index capabilities for feature detection.

    Returns information about what features the current index supports:
    - rank_features fields for Lab Mode
    - semantic fields for semantic/hybrid search
    - searchable text fields for field boosting UI
    """
    try:
        es = get_es_client()
        index = _search_config["index"]

        if not es.indices.exists(index=index):
            return IndexCapabilities(
                has_rank_features=False,
                rank_feature_fields=[],
                has_semantic=False,
                semantic_fields=[],
                searchable_fields=[],
                message=f"Index '{index}' not found",
            )

        # Get index mapping to check for various field types
        mapping = es.indices.get_mapping(index=index)
        index_name = list(mapping.keys())[0]
        properties = mapping[index_name]["mappings"].get("properties", {})

        # Check for rank_features nested object
        rank_feature_fields = []
        if "rank_features" in properties:
            rf_props = properties["rank_features"].get("properties", {})
            for field_name, field_def in rf_props.items():
                if field_def.get("type") == "rank_feature":
                    rank_feature_fields.append(f"rank_features.{field_name}")

        # Check for semantic_text and dense_vector fields separately
        semantic_fields = []  # semantic_text fields (work with semantic query)
        dense_vector_fields = []  # dense_vector fields (require kNN query)
        searchable_fields = []

        def extract_fields(props: dict, prefix: str = ""):
            for field_name, field_def in props.items():
                full_name = f"{prefix}{field_name}" if prefix else field_name
                field_type = field_def.get("type", "")

                # Check for semantic_text fields (work with semantic query)
                if field_type == "semantic_text":
                    semantic_fields.append(full_name)
                # Check for dense_vector fields (require kNN query, not semantic)
                elif field_type == "dense_vector":
                    dense_vector_fields.append(full_name)

                # Check for searchable text fields
                if field_type in ["text", "keyword", "search_as_you_type"]:
                    searchable_fields.append(full_name)

                # Recurse into nested/object fields
                if "properties" in field_def:
                    extract_fields(field_def["properties"], f"{full_name}.")

        extract_fields(properties)

        has_rank_features = len(rank_feature_fields) > 0
        has_semantic = (
            len(semantic_fields) > 0
        )  # Only true if semantic_text fields exist

        # Build message
        messages = []
        if has_rank_features:
            messages.append(f"Found {len(rank_feature_fields)} rank_feature fields")
        else:
            messages.append(
                "No rank_feature fields found. Lab Mode requires rank_features.* fields."
            )

        if semantic_fields:
            messages.append(
                f"Found {len(semantic_fields)} semantic_text field(s): {', '.join(semantic_fields)}"
            )
        if dense_vector_fields:
            messages.append(
                f"Found {len(dense_vector_fields)} dense_vector field(s): {', '.join(dense_vector_fields)}"
            )
        if not semantic_fields and not dense_vector_fields:
            messages.append(
                "No semantic/vector fields found. Hybrid/Semantic search unavailable."
            )

        return IndexCapabilities(
            has_rank_features=has_rank_features,
            rank_feature_fields=rank_feature_fields,
            has_semantic=has_semantic,
            semantic_fields=semantic_fields,
            dense_vector_fields=dense_vector_fields,
            searchable_fields=searchable_fields,
            message=" | ".join(messages),
        )

    except Exception as e:
        logger.error(f"Capabilities check failed: {e}")
        return IndexCapabilities(
            has_rank_features=False,
            rank_feature_fields=[],
            has_semantic=False,
            semantic_fields=[],
            searchable_fields=[],
            message=f"Failed to check capabilities: {e!s}",
        )
