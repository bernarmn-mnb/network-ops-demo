"""
Search Fields Discovery API

Provides endpoint to discover available fields in the search index.
Used by LLM onboarding to configure the search experience.

Endpoints:
- GET /api/search/fields - Get index mapping with field types
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Any
import logging

from ..elasticsearch.client import get_es_client
from ..config import settings

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/search/fields", tags=["search-fields"])


class FieldInfo(BaseModel):
    """Information about a single field."""
    name: str
    type: str
    searchable: bool
    aggregatable: bool
    # Common field patterns for LLM to understand purpose
    likely_purpose: str | None = None


class FieldsResponse(BaseModel):
    """Response containing index field information."""
    index: str
    configured: bool
    fields: list[FieldInfo]
    suggested_config: dict[str, Any] | None = None


# Field name patterns to suggest purpose
FIELD_PATTERNS = {
    "title": ["title", "name", "product_name", "item_name", "headline"],
    "description": ["description", "desc", "summary", "body", "content", "text"],
    "image": ["image", "img", "image_url", "imageUrl", "photo", "thumbnail", "picture"],
    "price": ["price", "cost", "amount", "msrp", "sale_price"],
    "brand": ["brand", "manufacturer", "vendor", "maker"],
    "category": ["category", "categories", "type", "product_type", "department"],
    "rating": ["rating", "score", "stars", "review_score"],
}


def infer_purpose(field_name: str) -> str | None:
    """Infer the likely purpose of a field based on its name."""
    name_lower = field_name.lower()
    for purpose, patterns in FIELD_PATTERNS.items():
        for pattern in patterns:
            if pattern in name_lower:
                return purpose
    return None


def is_searchable(field_type: str) -> bool:
    """Determine if a field type is searchable."""
    searchable_types = {"text", "keyword", "match_only_text"}
    return field_type in searchable_types


def is_aggregatable(field_type: str) -> bool:
    """Determine if a field type can be used in aggregations."""
    aggregatable_types = {"keyword", "integer", "long", "float", "double", "date", "boolean"}
    return field_type in aggregatable_types


def flatten_mapping(mapping: dict, prefix: str = "") -> list[tuple[str, str]]:
    """Flatten nested mapping to list of (field_name, field_type) tuples."""
    fields = []
    
    properties = mapping.get("properties", {})
    for field_name, field_info in properties.items():
        full_name = f"{prefix}{field_name}" if prefix else field_name
        
        # Get the field type
        field_type = field_info.get("type", "object")
        
        if field_type == "object" or "properties" in field_info:
            # Recurse into nested objects
            fields.extend(flatten_mapping(field_info, f"{full_name}."))
        else:
            fields.append((full_name, field_type))
            
            # Also check for multi-fields (e.g., title.keyword)
            if "fields" in field_info:
                for sub_name, sub_info in field_info["fields"].items():
                    sub_type = sub_info.get("type", "keyword")
                    fields.append((f"{full_name}.{sub_name}", sub_type))
    
    return fields


def generate_suggested_config(fields: list[FieldInfo]) -> dict[str, Any]:
    """Generate a suggested searchConfig based on discovered fields."""
    config = {
        "searchFields": [],
        "display": {},
        "facets": [],
    }
    
    # Find fields by purpose
    purpose_map: dict[str, list[FieldInfo]] = {}
    for field in fields:
        if field.likely_purpose:
            if field.likely_purpose not in purpose_map:
                purpose_map[field.likely_purpose] = []
            purpose_map[field.likely_purpose].append(field)
    
    # Build search fields (prioritize text fields)
    for field in fields:
        if field.searchable and field.type == "text":
            boost = 1
            if field.likely_purpose == "title":
                boost = 3
            elif field.likely_purpose == "brand":
                boost = 2
            elif field.likely_purpose == "category":
                boost = 1.5
            config["searchFields"].append(f"{field.name}^{boost}" if boost != 1 else field.name)
    
    # Build display mapping
    for purpose in ["title", "description", "image", "price", "brand", "category", "rating"]:
        if purpose in purpose_map:
            # Prefer text fields for display, keyword for filtering
            candidates = purpose_map[purpose]
            best = next((f for f in candidates if f.type == "text"), candidates[0])
            config["display"][purpose] = best.name
    
    # Build facets (keyword fields that are aggregatable)
    for field in fields:
        if field.aggregatable and field.type == "keyword":
            if field.likely_purpose in ["brand", "category"]:
                config["facets"].append({
                    "field": field.name,
                    "label": field.likely_purpose.title(),
                    "size": 20,
                })
    
    return config


@router.get("", response_model=FieldsResponse)
async def get_fields() -> FieldsResponse:
    """
    Get available fields from the search index.
    
    Returns field names, types, and suggested configuration for the LLM
    to use when setting up the search experience.
    """
    index = settings.SEARCH_INDEX
    
    if not index:
        raise HTTPException(
            status_code=400,
            detail="SEARCH_INDEX not configured. Run ./setup.sh to configure Elasticsearch."
        )
    
    try:
        es = get_es_client()
        
        # Get index mapping
        mapping_response = es.indices.get_mapping(index=index)
        
        # Handle both single index and alias responses
        if index in mapping_response:
            mapping = mapping_response[index]["mappings"]
        else:
            # Might be an alias - get first index
            first_index = next(iter(mapping_response))
            mapping = mapping_response[first_index]["mappings"]
        
        # Flatten the mapping
        flat_fields = flatten_mapping(mapping)
        
        # Build field info list
        fields = []
        for field_name, field_type in flat_fields:
            # Skip internal fields
            if field_name.startswith("_"):
                continue
                
            fields.append(FieldInfo(
                name=field_name,
                type=field_type,
                searchable=is_searchable(field_type),
                aggregatable=is_aggregatable(field_type),
                likely_purpose=infer_purpose(field_name),
            ))
        
        # Generate suggested config
        suggested = generate_suggested_config(fields)
        
        # Check if search is "configured" (has meaningful suggested fields)
        configured = bool(suggested.get("searchFields")) and bool(suggested.get("display", {}).get("title"))
        
        logger.info(f"Discovered {len(fields)} fields in index '{index}', configured={configured}")
        
        return FieldsResponse(
            index=index,
            configured=configured,
            fields=fields,
            suggested_config=suggested,
        )
        
    except Exception as e:
        logger.error(f"Failed to get fields for index '{index}': {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get index mapping: {str(e)}"
        )


@router.get("/health")
async def fields_health() -> dict:
    """Check if field discovery is available."""
    try:
        es = get_es_client()
        es.info()
        return {
            "status": "healthy",
            "index": settings.SEARCH_INDEX,
            "configured": bool(settings.SEARCH_INDEX),
        }
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Elasticsearch unavailable: {str(e)}")
