"""Visual search routes: text-to-image and image-to-image kNN search using Jina CLIP v2."""

import logging
import os
from typing import Any

import httpx
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from ..config import settings
from ..elasticsearch.client import get_es_client

logger = logging.getLogger(__name__)

router = APIRouter()

JINA_EMBEDDINGS_URL = "https://api.jina.ai/v1/embeddings"
JINA_MODEL = "jina-clip-v2"


def _get_visual_search_index() -> str:
    """Index for visual search. Configurable via VISUAL_SEARCH_INDEX in settings or env."""
    return settings.VISUAL_SEARCH_INDEX or os.getenv("VISUAL_SEARCH_INDEX", "products")


def _get_embedding_field() -> str:
    """Field name for image embeddings. Configurable via VISUAL_SEARCH_EMBEDDING_FIELD env."""
    return os.getenv("VISUAL_SEARCH_EMBEDDING_FIELD", "image_embedding")


def _get_jina_api_key() -> str:
    key = settings.JINA_API_KEY or os.getenv("JINA_API_KEY", "")
    if not key:
        raise HTTPException(
            status_code=503,
            detail="JINA_API_KEY is not configured. Set JINA_API_KEY in backend/.env for visual search.",
        )
    return key


class TextSearchRequest(BaseModel):
    query: str = Field(..., min_length=1)
    size: int = Field(default=12, ge=1, le=100)
    lambda_mmr: float = Field(default=0.5, ge=0.0, le=1.0)


class ImageSearchRequest(BaseModel):
    image_url: str = Field(..., min_length=1)
    size: int = Field(default=12, ge=1, le=100)
    lambda_mmr: float = Field(default=0.5, ge=0.0, le=1.0)


class VisualSearchHit(BaseModel):
    id: str
    score: float
    source: dict[str, Any]


class VisualSearchResponse(BaseModel):
    hits: list[VisualSearchHit]
    total: int
    took_ms: int


def _fetch_text_embedding(query: str, api_key: str) -> list[float]:
    with httpx.Client(timeout=30.0) as client:
        resp = client.post(
            JINA_EMBEDDINGS_URL,
            json={"model": JINA_MODEL, "input": [{"text": query}]},
            headers={"Authorization": f"Bearer {api_key}"},
        )
        resp.raise_for_status()
        return resp.json()["data"][0]["embedding"]


def _fetch_image_embedding(image_url: str, api_key: str) -> list[float]:
    with httpx.Client(timeout=30.0) as client:
        resp = client.post(
            JINA_EMBEDDINGS_URL,
            json={"model": JINA_MODEL, "input": [{"image": image_url}]},
            headers={"Authorization": f"Bearer {api_key}"},
        )
        resp.raise_for_status()
        return resp.json()["data"][0]["embedding"]


def _knn_search(embedding: list[float], size: int) -> dict:
    es = get_es_client()
    index = _get_visual_search_index()
    field = _get_embedding_field()
    num_candidates = size * 5
    body = {
        "knn": {
            "field": field,
            "query_vector": embedding,
            "k": size,
            "num_candidates": num_candidates,
        },
        "size": size,
        "_source": {"excludes": [field]},
    }
    return es.search(index=index, body=body)


def _format_response(response: dict) -> VisualSearchResponse:
    hits_data = response["hits"]
    total = hits_data["total"]["value"]
    took_ms = response.get("took", 0)
    hits = [
        VisualSearchHit(
            id=hit["_id"],
            score=float(hit.get("_score") or 0.0),
            source=hit["_source"],
        )
        for hit in hits_data["hits"]
    ]
    return VisualSearchResponse(hits=hits, total=total, took_ms=took_ms)


@router.post("/text", response_model=VisualSearchResponse)
async def visual_search_text(request: TextSearchRequest) -> VisualSearchResponse:
    api_key = _get_jina_api_key()
    try:
        embedding = _fetch_text_embedding(request.query, api_key)
    except httpx.HTTPStatusError as e:
        logger.error(f"Jina API error: {e.response.status_code} {e.response.text}")
        raise HTTPException(
            status_code=502,
            detail=f"Jina embedding failed: {e.response.text}",
        ) from e
    except Exception as e:
        logger.error(f"Jina embedding error: {e}")
        raise HTTPException(status_code=502, detail=str(e)) from e

    try:
        response = _knn_search(embedding, request.size)
        return _format_response(response)
    except Exception as e:
        logger.error(f"Elasticsearch kNN error: {e}")
        raise HTTPException(status_code=500, detail=str(e)) from e


@router.post("/image", response_model=VisualSearchResponse)
async def visual_search_image(request: ImageSearchRequest) -> VisualSearchResponse:
    api_key = _get_jina_api_key()
    try:
        embedding = _fetch_image_embedding(request.image_url, api_key)
    except httpx.HTTPStatusError as e:
        logger.error(f"Jina API error: {e.response.status_code} {e.response.text}")
        raise HTTPException(
            status_code=502,
            detail=f"Jina embedding failed: {e.response.text}",
        ) from e
    except Exception as e:
        logger.error(f"Jina embedding error: {e}")
        raise HTTPException(status_code=502, detail=str(e)) from e

    try:
        response = _knn_search(embedding, request.size)
        return _format_response(response)
    except Exception as e:
        logger.error(f"Elasticsearch kNN error: {e}")
        raise HTTPException(status_code=500, detail=str(e)) from e


@router.get("/health")
async def visual_search_health() -> dict:
    """Health check: reports whether JINA_API_KEY is configured."""
    try:
        _get_jina_api_key()
        return {"status": "healthy", "jina_configured": True}
    except HTTPException:
        return {"status": "degraded", "jina_configured": False}
