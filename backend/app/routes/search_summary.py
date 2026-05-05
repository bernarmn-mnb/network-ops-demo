"""AI Search Summary Route

POST /api/search/summarise

Takes the top N search results and streams an AI-generated summary banner
using the Elastic Agent Builder (Kibana converse/async endpoint).

The summary is styled after Google AI Overview / Perplexity:
  - 2-3 sentences answering the query directly, OR
  - A confident summary of what the top results are about
  - Light numbered source attribution

This route is intentionally generic: it receives query + result snippets
and is not tied to any demo-specific field schema.
"""

import json
import logging

import requests
from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from ..config import settings

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/search", tags=["search"])


# ---------------------------------------------------------------------------
# Request / Response models
# ---------------------------------------------------------------------------


class SummaryResult(BaseModel):
    """A single result snippet to include in the summary prompt."""

    title: str = Field(default="", description="Document title")
    snippet: str = Field(default="", description="Excerpt or highlight text")
    url: str | None = Field(default=None, description="Source URL (optional)")


class SummariseRequest(BaseModel):
    """Request body for the summarise endpoint."""

    query: str = Field(description="The user's search query")
    results: list[SummaryResult] = Field(
        description="Top N search results (title + snippet pairs). Usually 3-5.",
        max_length=10,
    )
    max_sentences: int = Field(
        default=3,
        ge=1,
        le=6,
        description="Approximate target length in sentences.",
    )


# ---------------------------------------------------------------------------
# Prompt builder
# ---------------------------------------------------------------------------

_SYSTEM_PROMPT = """You are a search assistant that synthesises information concisely.
Given a user query and a list of search results, provide a direct, confident answer or summary.

Rules:
- Answer the question directly if the results contain enough information.
- If they do not fully answer it, summarise what they say instead.
- Be concise: {max_sentences} sentences maximum.
- End with a brief attribution line: "Based on {n} results" — nothing longer.
- Do NOT repeat the query. Do NOT say "the search results show".
- Do NOT use markdown headers or bullet lists. Plain prose only."""

_USER_PROMPT = """Query: {query}

Results:
{results_block}

Write a {max_sentences}-sentence summary."""


def _build_prompt(request: SummariseRequest) -> str:
    results_lines = []
    for i, r in enumerate(request.results, 1):
        title = r.title.strip() if r.title else f"Result {i}"
        snippet = r.snippet.strip() if r.snippet else "(no snippet)"
        results_lines.append(f"[{i}] {title} — {snippet}")
    results_block = "\n".join(results_lines)

    system = _SYSTEM_PROMPT.format(
        max_sentences=request.max_sentences,
        n=len(request.results),
    )
    user = _USER_PROMPT.format(
        query=request.query,
        results_block=results_block,
        max_sentences=request.max_sentences,
    )
    # Combined as a single turn for the Kibana converse endpoint
    return f"{system}\n\n---\n\n{user}"


# ---------------------------------------------------------------------------
# Streaming endpoint
# ---------------------------------------------------------------------------


@router.post("/summarise")
async def summarise(request: SummariseRequest) -> StreamingResponse:
    """Stream an AI summary banner above search results.

    Uses the Elastic Agent Builder streaming endpoint (converse/async).
    Streams SSE events back to the frontend; the frontend component
    accumulates text_chunk events into the displayed summary text.

    Returns 200 with an SSE stream even on soft errors (error event is
    emitted in-stream so the UI can fall back gracefully).
    """
    if not settings.KIBANA_URL or not settings.ELASTIC_API_KEY:
        # Graceful no-op: emit a single error event so the banner hides itself
        def _no_config():
            payload = json.dumps({"event": "error", "data": {"message": "Agent Builder not configured"}})
            yield f"data: {payload}\n\n".encode()

        return StreamingResponse(
            _no_config(),
            media_type="text/event-stream",
            headers={"Cache-Control": "no-cache", "Connection": "keep-alive"},
        )

    prompt = _build_prompt(request)
    agent_id = settings.AGENT_ID or None

    payload: dict = {"input": prompt}
    if agent_id:
        payload["agent_id"] = agent_id
    if settings.CONNECTOR_ID:
        payload["connector_id"] = settings.CONNECTOR_ID

    streaming_url = f"{settings.KIBANA_URL.rstrip('/')}/api/agent_builder/converse/async"
    headers = {
        "Authorization": f"ApiKey {settings.ELASTIC_API_KEY}",
        "Content-Type": "application/json",
        "kbn-xsrf": "true",
    }

    try:
        upstream = requests.post(
            streaming_url,
            headers=headers,
            json=payload,
            stream=True,
            timeout=60,
        )
    except requests.RequestException as exc:
        def _conn_err():
            payload_err = json.dumps({"event": "error", "data": {"message": str(exc)}})
            yield f"data: {payload_err}\n\n".encode()

        return StreamingResponse(
            _conn_err(),
            media_type="text/event-stream",
            headers={"Cache-Control": "no-cache", "Connection": "keep-alive"},
        )

    if not upstream.ok:
        err_text = upstream.text[:200]
        logger.warning(f"Agent Builder returned {upstream.status_code}: {err_text}")

        def _http_err():
            payload_err = json.dumps({
                "event": "error",
                "data": {"message": f"Agent Builder error {upstream.status_code}"},
            })
            yield f"data: {payload_err}\n\n".encode()

        upstream.close()
        return StreamingResponse(
            _http_err(),
            media_type="text/event-stream",
            headers={"Cache-Control": "no-cache", "Connection": "keep-alive"},
        )

    def event_generator():
        try:
            for chunk in upstream.iter_content(chunk_size=None):
                if chunk:
                    yield chunk
        except Exception as exc:
            err = json.dumps({"event": "error", "data": {"message": str(exc)}})
            yield f"data: {err}\n\n".encode()
        finally:
            upstream.close()

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
