"""Demo User Profiles API

Serves predefined demo personas from a JSON data file.
Profiles drive personalisation across the app: search boosting,
agent context injection, planner defaults, and UI greetings.

Endpoints:
  GET  /api/profiles         — List all profiles
  GET  /api/profiles/{id}    — Get a single profile by ID
"""

import json
import logging
from pathlib import Path
from typing import Any

from fastapi import APIRouter, HTTPException

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/profiles", tags=["profiles"])

# Load profiles from data file once at import time
_DATA_PATH = Path(__file__).resolve().parents[2] / "data" / "profiles.json"
_profiles: list[dict[str, Any]] = []
_profiles_by_id: dict[str, dict[str, Any]] = {}

def _load_profiles() -> None:
    """Load profiles from the JSON data file."""
    global _profiles, _profiles_by_id
    try:
        raw = _DATA_PATH.read_text(encoding="utf-8")
        _profiles = json.loads(raw)
        _profiles_by_id = {p["id"]: p for p in _profiles}
        logger.info("Loaded %d demo profiles from %s", len(_profiles), _DATA_PATH)
    except FileNotFoundError:
        logger.warning("Profiles data file not found at %s", _DATA_PATH)
    except Exception:
        logger.exception("Failed to load profiles from %s", _DATA_PATH)

_load_profiles()


@router.get("/")
async def list_profiles() -> list[dict[str, Any]]:
    """Return all demo profiles."""
    return _profiles


@router.get("/{profile_id}")
async def get_profile(profile_id: str) -> dict[str, Any]:
    """Return a single profile by ID."""
    profile = _profiles_by_id.get(profile_id)
    if not profile:
        raise HTTPException(status_code=404, detail=f"Profile '{profile_id}' not found")
    return profile


@router.post("/reload")
async def reload_profiles() -> dict[str, str]:
    """Hot-reload profiles from disk (dev convenience)."""
    _load_profiles()
    return {"status": "ok", "count": str(len(_profiles))}
