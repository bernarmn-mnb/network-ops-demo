"""
Shared Pydantic models for Elasticsearch search requests and responses.
"""

from pydantic import BaseModel, Field
from typing import Optional, Any

class FeatureWeights(BaseModel):
    """Rank feature weights for boosting business signals (0-100 scale)."""
    popularity: Optional[float] = Field(default=None, ge=0, le=100, description="Engagement/popularity boost")
    margin_score: Optional[float] = Field(default=None, ge=0, le=100, description="Business margin boost")
    freshness: Optional[float] = Field(default=None, ge=0, le=100, description="Recency boost")
    conversion_rate: Optional[float] = Field(default=None, ge=0, le=100, description="Proven seller boost")
    inventory_priority: Optional[float] = Field(default=None, ge=0, le=100, description="Stock optimization boost")


class UserPreferences(BaseModel):
    """User personalization preferences."""
    preferred_brands: Optional[list[str]] = Field(default=None, description="Brands to boost in results")
    excluded_brands: Optional[list[str]] = Field(default=None, description="Brands to exclude from results")
    preferred_categories: Optional[list[str]] = Field(default=None, description="Categories to boost")
    brand_boost: Optional[float] = Field(default=2.0, ge=0.1, le=10.0, description="Boost factor for preferred brands")
    category_boost: Optional[float] = Field(default=1.5, ge=0.1, le=10.0, description="Boost factor for preferred categories")
    price_range_min: Optional[float] = Field(default=None, ge=0, description="Minimum price preference")
    price_range_max: Optional[float] = Field(default=None, ge=0, description="Maximum price preference")


class SessionContext(BaseModel):
    """Session-based context for ranking."""
    recent_categories: Optional[list[str]] = Field(default=None, description="Recently engaged categories")
    recent_brands: Optional[list[str]] = Field(default=None, description="Recently engaged brands")
    recent_category_boost: Optional[float] = Field(default=1.3, ge=0.1, le=5.0, description="Boost for recent categories")


class FieldBoost(BaseModel):
    """Field boost configuration."""
    field: str = Field(..., description="Field name")
    boost: float = Field(default=1.0, ge=0, le=10, description="Boost factor (0-10)")


class QueryTypeConfig(BaseModel):
    """Query type and field boosting configuration."""
    query_type: str = Field(default="text", description="Query type: text, hybrid, or semantic")
    field_boosts: Optional[list[FieldBoost]] = Field(default=None, description="Field-specific boost values")
    semantic_weight: Optional[float] = Field(default=50, ge=0, le=100, description="Semantic weight for hybrid (0-100)")
    semantic_field: Optional[str] = Field(default="semantic_text", description="Field name for semantic search")

