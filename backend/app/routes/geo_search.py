"""Geo Search API for store finder and map-based search.

Endpoints:
- POST /api/geo/nearby        - Store finder with distance sort
- POST /api/geo/bounding-box  - Map viewport search
- POST /api/geo/aggregations  - Heatmap / cluster data
- GET  /api/geo/vector-tiles/{z}/{x}/{y} - Vector tile proxy to ES _mvt API
- POST /api/geo/delivery-zone-check - Point-in-polygon check
- GET  /api/geo/health         - Check stores index exists
"""

import logging
from typing import Any

from fastapi import APIRouter, HTTPException
from fastapi.responses import Response
from opentelemetry import trace
from pydantic import BaseModel, Field

from ..config import settings
from ..elasticsearch.client import get_es_client
from ..elasticsearch.geo_queries import (
    build_geo_bounding_box_filter,
    build_geo_distance_filter,
    build_geo_distance_sort,
    build_geo_aggregation,
    build_geo_shape_filter,
)
from ..otel import get_tracer

logger = logging.getLogger(__name__)
tracer = get_tracer()

router = APIRouter(prefix="/api/geo", tags=["geo-search"])

STORES_INDEX = "ootb-stores"


# =============================================================================
# Request / Response Models
# =============================================================================


class GeoPoint(BaseModel):
    lat: float = Field(..., ge=-90, le=90)
    lon: float = Field(..., ge=-180, le=180)


class BoundingBox(BaseModel):
    top_left: GeoPoint
    bottom_right: GeoPoint


class NearbySearchRequest(BaseModel):
    location: GeoPoint
    distance: str = Field(default="10km", description="Distance string e.g. '10km', '5mi'")
    query: str = Field(default="", description="Optional text query")
    page: int = Field(default=1, ge=1)
    page_size: int = Field(default=20, ge=1, le=100)
    filters: dict[str, Any] | None = None


class BoundingBoxSearchRequest(BaseModel):
    bounds: BoundingBox
    query: str = Field(default="", description="Optional text query")
    page: int = Field(default=1, ge=1)
    page_size: int = Field(default=50, ge=1, le=200)
    filters: dict[str, Any] | None = None


class GeoAggregationRequest(BaseModel):
    bounds: BoundingBox | None = None
    agg_type: str = Field(default="geotile_grid", description="geotile_grid or geohash_grid")
    precision: int = Field(default=8, ge=1, le=29)
    query: str = Field(default="", description="Optional text query")
    filters: dict[str, Any] | None = None


class DeliveryZoneCheckRequest(BaseModel):
    point: GeoPoint
    query: str = Field(default="", description="Optional text query to filter stores")
    filters: dict[str, Any] | None = None


class StoreHit(BaseModel):
    id: str
    score: float
    source: dict[str, Any]
    sort: list[Any] | None = None


class GeoSearchResponse(BaseModel):
    hits: list[StoreHit]
    total: int
    took_ms: int


class GeoAggregationBucket(BaseModel):
    key: str
    doc_count: int
    location: GeoPoint | None = None


class GeoAggregationResponse(BaseModel):
    buckets: list[GeoAggregationBucket]
    total: int
    took_ms: int


# =============================================================================
# Helpers
# =============================================================================


def _build_text_query(query: str) -> dict[str, Any]:
    if query and query.strip():
        return {
            "simple_query_string": {
                "query": query,
                "fields": ["name^3", "address", "city^2", "type"],
                "default_operator": "AND",
            }
        }
    return {"match_all": {}}


def _build_filter_clauses(filters: dict[str, Any] | None) -> list[dict[str, Any]]:
    if not filters:
        return []
    clauses = []
    for field, value in filters.items():
        if value is not None:
            if isinstance(value, list):
                clauses.append({"terms": {field: value}})
            else:
                clauses.append({"term": {field: value}})
    return clauses


def _extract_hits(response: dict) -> list[StoreHit]:
    hits = []
    for hit in response["hits"]["hits"]:
        hits.append(
            StoreHit(
                id=hit["_id"],
                score=hit.get("_score", 0.0) or 0.0,
                source=hit["_source"],
                sort=hit.get("sort"),
            )
        )
    return hits


# =============================================================================
# Endpoints
# =============================================================================


@router.post("/nearby", response_model=GeoSearchResponse, operation_id="geoNearbySearch")
async def nearby_search(request: NearbySearchRequest) -> GeoSearchResponse:
    """Find stores near a location, sorted by distance."""
    with tracer.start_as_current_span("geo.nearby_search") as span:
        span.set_attribute("geo.lat", request.location.lat)
        span.set_attribute("geo.lon", request.location.lon)
        span.set_attribute("geo.distance", request.distance)

        try:
            es = get_es_client()

            bool_query: dict[str, Any] = {
                "must": [_build_text_query(request.query)],
                "filter": [
                    build_geo_distance_filter(
                        "location",
                        request.location.lat,
                        request.location.lon,
                        request.distance,
                    )
                ] + _build_filter_clauses(request.filters),
            }

            body = {
                "query": {"bool": bool_query},
                "sort": [
                    build_geo_distance_sort(
                        "location", request.location.lat, request.location.lon
                    ),
                    {"_score": "desc"},
                ],
                "from": (request.page - 1) * request.page_size,
                "size": request.page_size,
            }

            response = es.search(index=STORES_INDEX, body=body)
            total = response["hits"]["total"]["value"]
            took_ms = response.get("took", 0)

            span.set_attribute("geo.result_count", total)
            span.set_attribute("geo.took_ms", took_ms)

            return GeoSearchResponse(
                hits=_extract_hits(response),
                total=total,
                took_ms=took_ms,
            )

        except Exception as e:
            logger.error(f"Nearby search error: {e}")
            span.set_status(trace.StatusCode.ERROR, str(e))
            raise HTTPException(status_code=500, detail=f"Nearby search failed: {e!s}")


@router.post("/bounding-box", response_model=GeoSearchResponse, operation_id="geoBoundingBoxSearch")
async def bounding_box_search(request: BoundingBoxSearchRequest) -> GeoSearchResponse:
    """Search stores within a map viewport bounding box."""
    with tracer.start_as_current_span("geo.bounding_box_search") as span:
        try:
            es = get_es_client()

            bool_query: dict[str, Any] = {
                "must": [_build_text_query(request.query)],
                "filter": [
                    build_geo_bounding_box_filter(
                        "location",
                        {"lat": request.bounds.top_left.lat, "lon": request.bounds.top_left.lon},
                        {"lat": request.bounds.bottom_right.lat, "lon": request.bounds.bottom_right.lon},
                    )
                ] + _build_filter_clauses(request.filters),
            }

            body = {
                "query": {"bool": bool_query},
                "from": (request.page - 1) * request.page_size,
                "size": request.page_size,
            }

            response = es.search(index=STORES_INDEX, body=body)
            total = response["hits"]["total"]["value"]
            took_ms = response.get("took", 0)

            span.set_attribute("geo.result_count", total)
            span.set_attribute("geo.took_ms", took_ms)

            return GeoSearchResponse(
                hits=_extract_hits(response),
                total=total,
                took_ms=took_ms,
            )

        except Exception as e:
            logger.error(f"Bounding box search error: {e}")
            span.set_status(trace.StatusCode.ERROR, str(e))
            raise HTTPException(status_code=500, detail=f"Bounding box search failed: {e!s}")


@router.post("/aggregations", response_model=GeoAggregationResponse, operation_id="geoAggregations")
async def aggregations(request: GeoAggregationRequest) -> GeoAggregationResponse:
    """Get geo grid aggregations for heatmap or clustering."""
    with tracer.start_as_current_span("geo.aggregations") as span:
        span.set_attribute("geo.agg_type", request.agg_type)
        span.set_attribute("geo.precision", request.precision)

        try:
            es = get_es_client()

            bool_query: dict[str, Any] = {
                "must": [_build_text_query(request.query)],
                "filter": _build_filter_clauses(request.filters),
            }

            if request.bounds:
                bool_query["filter"].append(
                    build_geo_bounding_box_filter(
                        "location",
                        {"lat": request.bounds.top_left.lat, "lon": request.bounds.top_left.lon},
                        {"lat": request.bounds.bottom_right.lat, "lon": request.bounds.bottom_right.lon},
                    )
                )

            body = {
                "query": {"bool": bool_query},
                "size": 0,
                "aggs": {
                    "geo_grid": {
                        **build_geo_aggregation("location", request.agg_type, request.precision),
                        "aggs": {
                            "centroid": {"geo_centroid": {"field": "location"}}
                        },
                    }
                },
            }

            response = es.search(index=STORES_INDEX, body=body)
            total = response["hits"]["total"]["value"]
            took_ms = response.get("took", 0)

            buckets = []
            for bucket in response.get("aggregations", {}).get("geo_grid", {}).get("buckets", []):
                centroid = bucket.get("centroid", {}).get("location")
                loc = None
                if centroid:
                    loc = GeoPoint(lat=centroid["lat"], lon=centroid["lon"])
                buckets.append(
                    GeoAggregationBucket(
                        key=bucket["key"],
                        doc_count=bucket["doc_count"],
                        location=loc,
                    )
                )

            span.set_attribute("geo.bucket_count", len(buckets))
            span.set_attribute("geo.took_ms", took_ms)

            return GeoAggregationResponse(
                buckets=buckets,
                total=total,
                took_ms=took_ms,
            )

        except Exception as e:
            logger.error(f"Geo aggregation error: {e}")
            span.set_status(trace.StatusCode.ERROR, str(e))
            raise HTTPException(status_code=500, detail=f"Geo aggregation failed: {e!s}")


@router.get(
    "/vector-tiles/{z}/{x}/{y}",
    response_class=Response,
    operation_id="geoVectorTiles",
)
async def vector_tiles(z: int, x: int, y: int) -> Response:
    """Proxy to Elasticsearch _mvt (Map Vector Tiles) API.

    Returns application/x-protobuf vector tile data.
    """
    with tracer.start_as_current_span("geo.vector_tiles") as span:
        span.set_attribute("geo.tile.z", z)
        span.set_attribute("geo.tile.x", x)
        span.set_attribute("geo.tile.y", y)

        try:
            es = get_es_client()
            tile_response = es.search_mvt(
                index=STORES_INDEX,
                field="location",
                zoom=z,
                x=x,
                y=y,
                exact_bounds=True,
            )

            return Response(
                content=tile_response,
                media_type="application/x-protobuf",
            )

        except Exception as e:
            logger.error(f"Vector tile error: {e}")
            span.set_status(trace.StatusCode.ERROR, str(e))
            raise HTTPException(status_code=500, detail=f"Vector tile request failed: {e!s}")


@router.post("/delivery-zone-check", response_model=GeoSearchResponse, operation_id="geoDeliveryZoneCheck")
async def delivery_zone_check(request: DeliveryZoneCheckRequest) -> GeoSearchResponse:
    """Find stores whose delivery zone contains the given point."""
    with tracer.start_as_current_span("geo.delivery_zone_check") as span:
        span.set_attribute("geo.lat", request.point.lat)
        span.set_attribute("geo.lon", request.point.lon)

        try:
            es = get_es_client()

            point_shape = {
                "type": "point",
                "coordinates": [request.point.lon, request.point.lat],
            }

            bool_query: dict[str, Any] = {
                "must": [_build_text_query(request.query)],
                "filter": [
                    build_geo_shape_filter("delivery_zone", point_shape, "intersects")
                ] + _build_filter_clauses(request.filters),
            }

            body = {
                "query": {"bool": bool_query},
                "size": 50,
                "sort": [{"_score": "desc"}],
            }

            response = es.search(index=STORES_INDEX, body=body)
            total = response["hits"]["total"]["value"]
            took_ms = response.get("took", 0)

            span.set_attribute("geo.result_count", total)
            span.set_attribute("geo.took_ms", took_ms)

            return GeoSearchResponse(
                hits=_extract_hits(response),
                total=total,
                took_ms=took_ms,
            )

        except Exception as e:
            logger.error(f"Delivery zone check error: {e}")
            span.set_status(trace.StatusCode.ERROR, str(e))
            raise HTTPException(status_code=500, detail=f"Delivery zone check failed: {e!s}")


@router.get("/health", operation_id="geoSearchHealth")
async def health_check() -> dict:
    """Check if the stores index exists and is searchable."""
    try:
        es = get_es_client()
        exists = es.indices.exists(index=STORES_INDEX)
        if not exists:
            return {"status": "unavailable", "index": STORES_INDEX, "reason": "index does not exist"}

        count = es.count(index=STORES_INDEX)
        return {
            "status": "healthy",
            "index": STORES_INDEX,
            "doc_count": count["count"],
        }
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Geo search unavailable: {e!s}")
