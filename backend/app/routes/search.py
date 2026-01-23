"""Search API endpoint - Config-driven with template support.

POST /api/search - Search with filters and pagination
POST /api/search/config - Update search configuration
GET /api/search/config - Get current configuration
GET /api/search/fields/{index} - Introspect index fields
GET /api/search/health - Check search availability

OTel Instrumentation:
- Custom span attributes for search analytics (search.user_query, search.result_count, etc.)
- Follows semantic conventions from docs/SEMANTIC-CONVENTIONS.md
"""

import json
import logging
from contextlib import contextmanager
from typing import Any, Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from ..config import settings
from ..elasticsearch.client import get_es_client
from ..elasticsearch.models import (
    FeatureWeights,
    FieldBoost,
    QueryTypeConfig,
    SessionContext,
    UserPreferences,
)
from ..elasticsearch.query_builder import (
    QueryBuilder,
    build_filter_clauses,
    get_index_fields,
)
from ..elasticsearch.retriever_builder import RetrieverBuilder

# Optional OpenTelemetry support - gracefully degrade if not available
try:
    from opentelemetry import trace

    from ..otel import get_tracer

    tracer = get_tracer()
    OTEL_AVAILABLE = True
except ImportError:
    OTEL_AVAILABLE = False
    tracer = None

# Query Rules ruleset ID - must match query_rules.py
MERCHANDISING_RULESET_ID = "search-merchandising"

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


class DiversifyConfig(BaseModel):
    """Configuration for result diversification.

    Supports two strategies:

    1. FIELD COLLAPSE (strategy='collapse')
       Groups results by a field value, returning only the top-scoring
       document per group. Useful for variants, category/brand diversity.

    2. MMR DIVERSIFY RETRIEVER (strategy='mmr')
       Uses Maximum Marginal Relevance with dense vectors to remove
       semantically similar results. Requires embeddings field.
    """

    enabled: bool = Field(default=False, description="Enable result diversification")
    strategy: str = Field(
        default="collapse",
        description="Diversification strategy: 'collapse' (field collapse) or 'mmr' (MMR retriever)",
    )

    # Field Collapse settings
    collapse_field: str = Field(
        default="parent_id",
        description="Field to collapse on: parent_id (variants), category, or brand",
    )
    inner_hits_count: int = Field(
        default=3,
        ge=0,
        le=10,
        description="Number of variants to show per group (0 = no inner hits)",
    )
    inner_hits_sort: str | None = Field(
        default="price",
        description="Sort field for inner hits (e.g., price, rating, _score)",
    )
    inner_hits_sort_dir: str = Field(
        default="asc", description="Sort direction for inner hits: asc or desc"
    )

    # MMR Diversify Retriever settings
    mmr_field: str = Field(
        default="embedding",
        description="Dense vector field for MMR similarity calculation",
    )
    mmr_lambda: float = Field(
        default=0.5,
        ge=0.0,
        le=1.0,
        description="Relevance vs diversity tradeoff (1.0=pure relevance, 0.0=max diversity)",
    )
    mmr_rank_window_size: int = Field(
        default=100,
        ge=10,
        le=500,
        description="Number of candidates to consider for MMR",
    )
    mmr_inference_id: str = Field(
        default=".jina-embeddings-v3",
        description="Inference model ID for query vector generation (jina on EIS)",
    )


class LtrConfig(BaseModel):
    """Configuration for Learning to Rank (LTR) rescoring.

    LTR uses a trained XGBoost model to rescore the top N results from the initial
    query. The model was trained on features like BM25 scores plus quality signals
    (rating, review_count) to learn what "good" results look like.

    Demo narrative:
    - Without LTR = pure text relevance (BM25)
    - With LTR = text relevance + quality signals (rating, reviews)

    The model reranks so that highly-rated, well-reviewed products bubble up
    even if their raw text relevance score is slightly lower.
    """

    enabled: bool = Field(default=False, description="Enable LTR rescoring")
    model_id: str = Field(
        default="demo-ltr-model", description="Trained LTR model ID in Elasticsearch"
    )
    window_size: int = Field(
        default=50,
        ge=10,
        le=200,
        description="Number of top results to rescore (larger = more accurate but slower)",
    )


class SearchRequest(BaseModel):
    """Search request parameters."""

    query: str = Field(default="", description="Search query string")
    page: int = Field(default=1, ge=1, description="Page number (1-indexed)")
    page_size: int = Field(default=12, ge=1, le=100, description="Results per page")
    filters: dict[str, Any] | None = Field(default=None, description="Field filters")
    sort_by: str | None = Field(default=None, description="Sort field")
    sort_dir: str = Field(default="desc", description="Sort direction: asc or desc")
    feature_weights: FeatureWeights | None = Field(
        default=None, description="Rank feature weights for lab mode"
    )
    user_preferences: UserPreferences | None = Field(
        default=None, description="User personalization preferences"
    )
    session_context: SessionContext | None = Field(
        default=None, description="Session context for ranking"
    )
    explain: bool = Field(
        default=False,
        description="Include ranking explanation (matched_queries with scores)",
    )
    query_type_config: QueryTypeConfig | None = Field(
        default=None, description="Query type and field boosting config"
    )
    debug: bool = Field(
        default=False,
        description="Include raw Elasticsearch query in response for debugging",
    )
    use_retrievers: bool = Field(
        default=True, description="Use Retriever API instead of query DSL (ES 8.17+)"
    )
    diversify: DiversifyConfig | None = Field(
        default=None, description="Result diversification via field collapse"
    )
    ltr: LtrConfig | None = Field(
        default=None, description="Learning to Rank rescoring configuration"
    )


class SearchConfigRequest(BaseModel):
    """Configuration update request."""

    index: str | None = None
    queryTemplate: str | None = None
    templateVars: dict | None = None
    searchFields: list[str] | None = None
    facets: list[dict] | None = None
    rangeFilters: list[dict] | None = None
    pageSize: int | None = None


class InnerHit(BaseModel):
    """A variant/inner hit within a collapsed group."""

    id: str
    score: float | None = None
    source: dict


class SearchHit(BaseModel):
    """Single search result - generic fields."""

    id: str
    score: float | None = None
    source: dict  # Raw document fields
    highlight: dict | None = None
    matched_queries: dict[str, float] | None = None  # Named query -> score contribution
    inner_hits: list[InnerHit] | None = (
        None  # Variants when using field collapse/diversify
    )


class AggregationBucket(BaseModel):
    """Aggregation bucket."""

    key: str
    count: int


class DiversifyInfo(BaseModel):
    """Information about diversification applied to results."""

    enabled: bool = False
    collapse_field: str | None = None
    groups_returned: int = 0  # Number of unique groups in results
    total_variants_hidden: int = 0  # Estimated variants not shown


class SearchResponse(BaseModel):
    """Search response."""

    hits: list[SearchHit]
    total: int
    page: int
    page_size: int
    total_pages: int
    took_ms: int
    query: str
    aggregations: dict[str, list[AggregationBucket]]
    config: dict  # Include current config for frontend
    debug_query: dict | None = Field(
        default=None, description="Raw Elasticsearch query (when debug=true)"
    )
    diversify: DiversifyInfo | None = Field(
        default=None, description="Diversification info when enabled"
    )


class FieldInfo(BaseModel):
    """Field metadata from index mapping."""

    type: str
    searchable: bool
    aggregatable: bool
    sortable: bool


class HealthResponse(BaseModel):
    """Health check response."""

    status: str
    elasticsearch: str
    index: str
    document_count: int


class IndexCapabilities(BaseModel):
    """Index capability information for feature detection."""

    has_rank_features: bool = False
    rank_feature_fields: list[str] = []
    has_semantic: bool = False
    semantic_fields: list[str] = []  # semantic_text fields (for semantic query)
    dense_vector_fields: list[str] = []  # dense_vector fields (for kNN query)
    searchable_fields: list[str] = []
    message: str = ""


# =============================================================================
# Helper Functions
# =============================================================================


def _build_hybrid_config(query_type_config: QueryTypeConfig | None) -> dict | None:
    """Build hybrid search config for the linear retriever.

    Converts frontend QueryTypeConfig (with semantic_weight 0-100) to
    linear retriever config (with text_weight and semantic_weight 0-1).

    Args:
        query_type_config: Frontend config with query_type and semantic_weight

    Returns:
        Dict for RetrieverBuilder.hybrid_config or None if not hybrid mode
    """
    if not query_type_config:
        return None

    if query_type_config.query_type != "hybrid":
        return None

    # Convert 0-100 scale to 0-1 scale
    semantic_pct = query_type_config.semantic_weight or 50
    semantic_weight = semantic_pct / 100.0
    text_weight = 1.0 - semantic_weight

    return {
        "enabled": True,
        "semantic_weight": semantic_weight,
        "text_weight": text_weight,
        "semantic_field": query_type_config.semantic_field or "semantic_text",
        "use_linear": True,  # Always use linear retriever for better control
    }


# =============================================================================
# Endpoints
# =============================================================================


@router.post("", response_model=SearchResponse)
async def search(request: SearchRequest) -> SearchResponse:
    """Search with config-driven query building.

    The query is built from templates based on current configuration.
    Filters, facets, and display are all configurable.

    OTel Instrumentation (per SEMANTIC-CONVENTIONS.md):
    - search.user_query: User's search text
    - search.result_count: Total matching results
    - search.result_ids: IDs of returned results (top N)
    - search.page: Current page (1-indexed)
    - search.page_size: Results per page
    - search.took_ms: Search engine query time (ms)
    - search.zero_results: Boolean - query returned no results
    - search.index: Index searched
    - search.filters: JSON of applied filters
    - search.sort: Sort configuration
    """
    # Create a span for the search operation
    with optional_span("search") as span:
        # Set search request attributes immediately
        span and span.set_attribute("search.user_query", request.query)
        span and span.set_attribute("search.page", request.page)
        span and span.set_attribute("search.page_size", request.page_size)

        # Set filter attributes if present
        if request.filters:
            span and span.set_attribute("search.filters", json.dumps(request.filters))

        # Set sort attributes if present
        if request.sort_by:
            span and span.set_attribute(
                "search.sort", f"{request.sort_by}:{request.sort_dir}"
            )

        # Set feature weights if present (for ranking lab mode)
        if request.feature_weights:
            span and span.set_attribute(
                "search.feature_weights",
                json.dumps(request.feature_weights.model_dump(exclude_none=True)),
            )

        try:
            es = get_es_client()
        except Exception as e:
            logger.error(f"Elasticsearch connection error: {e}")
            span and span.set_attribute("search.error", str(e))
            span.set_status(trace.StatusCode.ERROR, str(e))
            raise HTTPException(
                status_code=503,
                detail="Search service unavailable. Check Elasticsearch connection.",
            )

        try:
            # Convert feature_weights to dict if provided
            feature_weights_dict = None
            if request.feature_weights:
                feature_weights_dict = {
                    k: v
                    for k, v in request.feature_weights.model_dump().items()
                    if v is not None
                }

            # Convert user_preferences to dict if provided
            user_preferences_dict = None
            if request.user_preferences:
                user_preferences_dict = {
                    k: v
                    for k, v in request.user_preferences.model_dump().items()
                    if v is not None
                }
                span and span.set_attribute(
                    "search.user_preferences", json.dumps(user_preferences_dict)
                )

            # Convert session_context to dict if provided
            session_context_dict = None
            if request.session_context:
                session_context_dict = {
                    k: v
                    for k, v in request.session_context.model_dump().items()
                    if v is not None
                }
                span and span.set_attribute(
                    "search.session_context", json.dumps(session_context_dict)
                )

            index = _search_config["index"]
            span and span.set_attribute("search.index", index)
            span and span.set_attribute("search.explain", request.explain)
            span and span.set_attribute("search.use_retrievers", request.use_retrievers)

            # =====================================================================
            # RETRIEVER API PATH (ES 8.17+ / Serverless)
            # Uses composable retrievers with rule retriever as outermost wrapper
            # =====================================================================
            if request.use_retrievers:
                logger.info(f"Using Retriever API for search: '{request.query}'")

                # Build filter clauses from request.filters dict
                filter_clauses = (
                    build_filter_clauses(request.filters) if request.filters else []
                )

                # Check for query rules
                ruleset_ids = None
                if request.query.strip():
                    try:
                        es.query_rules.get_ruleset(ruleset_id=MERCHANDISING_RULESET_ID)
                        ruleset_ids = [MERCHANDISING_RULESET_ID]
                        span and span.set_attribute("search.query_rules_applied", True)
                        logger.info(
                            f"Applying query rules via rule retriever: {MERCHANDISING_RULESET_ID}"
                        )
                    except Exception:
                        # Ruleset doesn't exist - continue without rules
                        span and span.set_attribute("search.query_rules_applied", False)

                # Normalize feature weights (0-100 → 0-10 scale)
                normalized_weights = None
                if feature_weights_dict:
                    normalized_weights = {
                        k: v / 10.0 if v > 0 else 0.001
                        for k, v in feature_weights_dict.items()
                        if v is not None
                    }

                # Build semantic config if hybrid/semantic mode requested
                # NOTE: Semantic/hybrid requires a non-empty query for inference
                semantic_config = None
                if request.query_type_config and request.query.strip():
                    if request.query_type_config.query_type in ("semantic", "hybrid"):
                        semantic_config = {
                            "field": request.query_type_config.semantic_field
                            or "semantic_text",
                            "query": request.query,
                        }

                # Build retriever query
                config_to_use = _search_config.copy()
                retriever_builder = RetrieverBuilder(config_to_use)

                # Debug: Log what personalization is being passed
                if user_preferences_dict:
                    logger.info(
                        f"Personalization: user_preferences={user_preferences_dict}"
                    )
                if session_context_dict:
                    logger.info(
                        f"Personalization: session_context={session_context_dict}"
                    )

                # Build diversification config
                collapse_config = None
                mmr_config = None
                if request.diversify and request.diversify.enabled:
                    span and span.set_attribute("search.diversify_enabled", True)
                    span and span.set_attribute(
                        "search.diversify_strategy", request.diversify.strategy
                    )

                    if request.diversify.strategy == "mmr":
                        # MMR Diversify Retriever (semantic diversity)
                        mmr_config = {
                            "enabled": True,
                            "field": request.diversify.mmr_field,
                            "lambda_": request.diversify.mmr_lambda,
                            "rank_window_size": request.diversify.mmr_rank_window_size,
                            "inference_id": request.diversify.mmr_inference_id,
                        }
                        span and span.set_attribute(
                            "search.mmr_lambda", request.diversify.mmr_lambda
                        )
                        logger.info(
                            f"MMR diversification enabled: lambda={request.diversify.mmr_lambda}, field={request.diversify.mmr_field}"
                        )
                    else:
                        # Field Collapse (exact field grouping)
                        collapse_config = {
                            "field": request.diversify.collapse_field,
                            "inner_hits_count": request.diversify.inner_hits_count,
                            "inner_hits_sort": request.diversify.inner_hits_sort,
                            "inner_hits_sort_dir": request.diversify.inner_hits_sort_dir,
                        }
                        span and span.set_attribute(
                            "search.diversify_field", request.diversify.collapse_field
                        )
                        logger.info(
                            f"Field collapse enabled: field={request.diversify.collapse_field}"
                        )

                # Build LTR config if enabled
                ltr_config = None
                if request.ltr and request.ltr.enabled:
                    ltr_config = {
                        "model_id": request.ltr.model_id,
                        "window_size": request.ltr.window_size,
                    }
                    span and span.set_attribute("search.ltr_enabled", True)
                    span and span.set_attribute(
                        "search.ltr_model", request.ltr.model_id
                    )
                    logger.info(
                        f"LTR enabled: model={request.ltr.model_id}, window={request.ltr.window_size}"
                    )

                query_body = retriever_builder.build(
                    query=request.query,
                    filters=filter_clauses,
                    page=request.page,
                    page_size=request.page_size,
                    sort_by=request.sort_by,
                    sort_dir=request.sort_dir,
                    ruleset_ids=ruleset_ids,
                    feature_weights=normalized_weights,
                    user_preferences=user_preferences_dict,
                    session_context=session_context_dict,
                    semantic_config=semantic_config,
                    hybrid_config=_build_hybrid_config(request.query_type_config),
                    collapse_config=collapse_config,
                    ltr_config=ltr_config,
                    mmr_config=mmr_config,
                )

                logger.info(f"Retriever search: '{request.query}' in {index}")

                # Execute search with retrievers
                search_params = {}
                if request.explain:
                    search_params["include_named_queries_score"] = True

                response = es.search(index=index, body=query_body, **search_params)

            # =====================================================================
            # LEGACY QUERY DSL PATH (template-based)
            # Uses rule_query wrapping for query rules
            # =====================================================================
            else:
                # Auto-switch to rank_features template when Lab Mode is active
                config_to_use = _search_config.copy()
                rank_features_available = False

                # Handle query_type_config for text/hybrid/semantic switching
                query_type_config_dict = None
                if request.query_type_config:
                    query_type_config_dict = request.query_type_config.model_dump()
                    span and span.set_attribute(
                        "search.query_type", request.query_type_config.query_type
                    )

                    # Update search fields from field_boosts if provided
                    if request.query_type_config.field_boosts:
                        boosted_fields = []
                        for fb in request.query_type_config.field_boosts:
                            if fb.boost > 0:
                                if fb.boost == 1.0:
                                    boosted_fields.append(fb.field)
                                else:
                                    boosted_fields.append(f"{fb.field}^{fb.boost}")
                        if boosted_fields:
                            config_to_use["searchFields"] = boosted_fields
                            logger.info(f"Using custom field boosts: {boosted_fields}")

                    # Switch template based on query type
                    if request.query_type_config.query_type == "semantic":
                        config_to_use["queryTemplate"] = "semantic"
                        config_to_use["templateVars"] = {
                            "semantic_field": request.query_type_config.semantic_field
                            or "semantic_text",
                        }
                        logger.info("Using semantic search template")
                    elif request.query_type_config.query_type == "hybrid":
                        config_to_use["queryTemplate"] = "hybrid"
                        # Calculate boost values from semantic_weight (0-100)
                        semantic_weight = (
                            request.query_type_config.semantic_weight or 50
                        )
                        text_boost = (100 - semantic_weight) / 50  # 0-2 scale
                        semantic_boost = semantic_weight / 50  # 0-2 scale
                        config_to_use["templateVars"] = {
                            "semantic_field": request.query_type_config.semantic_field
                            or "semantic_text",
                            "text_boost": text_boost,
                            "semantic_boost": semantic_boost,
                        }
                        logger.info(
                            f"Using hybrid search template (text_boost={text_boost}, semantic_boost={semantic_boost})"
                        )

                if feature_weights_dict:
                    # Check if rank_features fields exist before using rank_features template
                    try:
                        mapping = es.indices.get_mapping(index=index)
                        index_name = list(mapping.keys())[0]
                        properties = mapping[index_name]["mappings"].get(
                            "properties", {}
                        )
                        rank_features_available = "rank_features" in properties
                    except Exception as mapping_err:
                        logger.warning(
                            f"Could not check for rank_features: {mapping_err}"
                        )
                        rank_features_available = False

                    if rank_features_available:
                        # Use personalized_named if user preferences are also present
                        if user_preferences_dict or session_context_dict:
                            config_to_use["queryTemplate"] = "personalized_named"
                            logger.info(
                                "Personalized Mode: Using personalized_named template"
                            )
                        else:
                            config_to_use["queryTemplate"] = "rank_features"
                        logger.info(
                            f"Lab Mode: Using {config_to_use['queryTemplate']} template with weights: {feature_weights_dict}"
                        )
                    else:
                        # Fall back to simple search - don't break the search
                        logger.warning(
                            "Lab Mode requested but rank_features fields not found in index. "
                            "Falling back to simple search. Reload data with --with-rank-features to enable."
                        )
                        feature_weights_dict = (
                            None  # Disable weights for simple template
                        )
                        span and span.set_attribute("search.lab_mode_fallback", True)

                # Build query from config
                builder = QueryBuilder(config_to_use)

                query_body = builder.build(
                    query=request.query,
                    filters=request.filters,
                    page=request.page,
                    page_size=request.page_size,
                    sort_by=request.sort_by,
                    sort_dir=request.sort_dir,
                    feature_weights=feature_weights_dict,
                    user_preferences=user_preferences_dict,
                    session_context=session_context_dict,
                )

                logger.info(
                    f"Searching '{request.query}' in {index} (explain={request.explain})"
                )

                # Check if query rules should be applied
                # Only apply for simple/rank_features templates (not personalized which may conflict)
                # and only if there's a query and the ruleset exists
                template_name = config_to_use.get("queryTemplate", "simple")
                compatible_templates = ["simple", "rank_features"]
                apply_rules = False

                if request.query.strip() and template_name in compatible_templates:
                    try:
                        es.query_rules.get_ruleset(ruleset_id=MERCHANDISING_RULESET_ID)
                        apply_rules = True
                        span and span.set_attribute("search.query_rules_applied", True)
                        logger.info(
                            f"Applying query rules from ruleset: {MERCHANDISING_RULESET_ID}"
                        )
                    except Exception as ruleset_err:
                        # Ruleset doesn't exist or error - continue without rules
                        if "resource_not_found" not in str(
                            ruleset_err
                        ).lower() and "404" not in str(ruleset_err):
                            logger.warning(f"Error checking query rules: {ruleset_err}")
                        span and span.set_attribute("search.query_rules_applied", False)
                elif (
                    request.query.strip() and template_name not in compatible_templates
                ):
                    span and span.set_attribute("search.query_rules_applied", False)
                    logger.info(
                        f"Skipping query rules - template '{template_name}' not compatible with rule_query"
                    )

                # Wrap query with rule_query if applicable
                if apply_rules:
                    query_body["query"] = {
                        "rule_query": {
                            "organic": query_body.get("query", {"match_all": {}}),
                            "match_criteria": {"query_string": request.query},
                            "ruleset_ids": [MERCHANDISING_RULESET_ID],
                        }
                    }

                # Add include_named_queries_score if explain mode is enabled
                search_params = {}
                if request.explain:
                    search_params["include_named_queries_score"] = True

                response = es.search(index=index, body=query_body, **search_params)

            # Format results
            hits = []
            result_ids = []
            total_variants_hidden = 0

            for hit in response["hits"]["hits"]:
                # Extract matched_queries if present (when explain=True)
                matched_queries = None
                if request.explain and "matched_queries" in hit:
                    # matched_queries can be a dict with scores or just a list of names
                    mq = hit["matched_queries"]
                    if isinstance(mq, dict):
                        matched_queries = mq
                    elif isinstance(mq, list):
                        # Convert list to dict with score 1.0 for each
                        matched_queries = {name: 1.0 for name in mq}

                # Extract inner_hits (variants) if present from field collapse
                inner_hits_list = None
                if "inner_hits" in hit:
                    variants_data = hit["inner_hits"].get("variants", {})
                    if "hits" in variants_data and "hits" in variants_data["hits"]:
                        inner_hits_list = [
                            InnerHit(
                                id=ih["_id"],
                                score=ih.get("_score"),
                                source=ih["_source"],
                            )
                            for ih in variants_data["hits"]["hits"]
                        ]
                        # Track how many variants exist beyond what we show
                        total_in_group = variants_data["hits"]["total"]["value"]
                        shown_in_group = len(inner_hits_list) + 1  # +1 for the main hit
                        if total_in_group > shown_in_group:
                            total_variants_hidden += total_in_group - shown_in_group

                hits.append(
                    SearchHit(
                        id=hit["_id"],
                        score=hit.get("_score"),
                        source=hit["_source"],
                        highlight=hit.get("highlight"),
                        matched_queries=matched_queries,
                        inner_hits=inner_hits_list,
                    )
                )
                result_ids.append(hit["_id"])

            total = response["hits"]["total"]["value"]
            took_ms = response["took"]

            # Set search result attributes (per SEMANTIC-CONVENTIONS.md)
            span and span.set_attribute("search.result_count", total)
            span and span.set_attribute(
                "search.result_ids", result_ids[:10]
            )  # Top 10 IDs
            span and span.set_attribute("search.took_ms", took_ms)
            span and span.set_attribute("search.zero_results", total == 0)

            # Emit zero_results event for analytics
            if total == 0:
                span and span.add_event(
                    "search.zero_results",
                    attributes={
                        "search.user_query": request.query,
                        "search.index": index,
                    },
                )

            # Extract aggregations
            aggs = {}
            if "aggregations" in response:
                for agg_name, agg_data in response["aggregations"].items():
                    if "buckets" in agg_data:
                        aggs[agg_name] = [
                            AggregationBucket(key=b["key"], count=b["doc_count"])
                            for b in agg_data["buckets"]
                        ]

            # Build diversify info if diversification was enabled
            diversify_info = None
            if request.diversify and request.diversify.enabled:
                diversify_info = DiversifyInfo(
                    enabled=True,
                    collapse_field=request.diversify.collapse_field,
                    groups_returned=len(hits),
                    total_variants_hidden=total_variants_hidden,
                )
                logger.info(
                    f"Search: query='{request.query}' "
                    f"results={total} groups={len(hits)} variants_hidden={total_variants_hidden} "
                    f"took={took_ms}ms"
                )
            else:
                logger.info(
                    f"Search: query='{request.query}' "
                    f"results={total} "
                    f"took={took_ms}ms "
                    f"zero_results={total == 0}"
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
                config=_search_config,
                # Always include query for debugging/inspection - minimal overhead (~2KB)
                debug_query=query_body,
                diversify=diversify_info,
            )

        except Exception as e:
            logger.error(f"Search error: {e}")
            span and span.set_attribute("search.error", str(e))
            span.set_status(trace.StatusCode.ERROR, str(e))
            raise HTTPException(status_code=500, detail=f"Search failed: {e!s}")


@router.get("/config")
async def get_config() -> dict:
    """Get current search configuration."""
    return _search_config


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


class SuggestRequest(BaseModel):
    """Suggest request parameters."""

    q: str = Field(..., min_length=1, description="Query prefix for suggestions")
    limit: int = Field(default=8, ge=1, le=20, description="Number of suggestions")


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


@router.get("/health", response_model=HealthResponse)
async def search_health() -> HealthResponse:
    """Check search service health."""
    try:
        es = get_es_client()
        index = _search_config["index"]

        if es.indices.exists(index=index):
            count = es.count(index=index)["count"]
            return HealthResponse(
                status="healthy",
                elasticsearch="connected",
                index=index,
                document_count=count,
            )
        else:
            return HealthResponse(
                status="degraded",
                elasticsearch="connected",
                index=f"{index} (not found)",
                document_count=0,
            )

    except Exception as e:
        logger.error(f"Health check failed: {e}")
        raise HTTPException(status_code=503, detail=f"Search service unhealthy: {e!s}")


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
