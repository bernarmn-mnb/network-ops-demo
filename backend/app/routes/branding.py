"""Branding API Routes

Simple CRUD for brand themes stored in a JSON file.
Designed for starter project simplicity - no database required.

Storage: backend/data/brands.json
"""

import json
from datetime import datetime
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

router = APIRouter(prefix="/api/branding", tags=["branding"])

# Storage location (in backend/data/ folder)
DATA_DIR = Path(__file__).parent.parent.parent / "data"
BRANDS_FILE = DATA_DIR / "brands.json"


# ============================================================================
# Models - Keep it simple: just essential colors + light/dark logos
# ============================================================================


class BrandColors(BaseModel):
    """Essential brand colors only."""

    primary: str = Field(..., description="Main brand color (buttons, links)")
    accent: str = Field(..., description="Secondary highlight color")
    background: str = Field("#FFFFFF", description="Page background")
    text: str = Field("#1A1C21", description="Primary text color")


class BrandLogo(BaseModel):
    """Logo for a single mode (light or dark)."""

    url: str = Field("", description="Logo URL or data:image/... base64")
    alt: str = Field("Logo", description="Alt text for accessibility")


class Brand(BaseModel):
    """Simplified brand theme.

    Just the essentials: colors + logos for light/dark mode.
    Auto-extracted themes (via vibe coding) can add more detail.
    """

    id: str = Field(..., description="Unique identifier (lowercase, no spaces)")
    name: str = Field(..., description="Display name")
    colors: BrandColors
    logoLight: BrandLogo = Field(default_factory=BrandLogo)
    logoDark: BrandLogo = Field(default_factory=BrandLogo)
    createdAt: str = Field(default_factory=lambda: datetime.now().isoformat())
    updatedAt: str = Field(default_factory=lambda: datetime.now().isoformat())


class BrandCreate(BaseModel):
    """Request body for creating a brand."""

    id: str
    name: str
    colors: BrandColors
    logoLight: BrandLogo | None = None
    logoDark: BrandLogo | None = None


class BrandUpdate(BaseModel):
    """Request body for updating a brand (all fields optional)."""

    name: str | None = None
    colors: BrandColors | None = None
    logoLight: BrandLogo | None = None
    logoDark: BrandLogo | None = None


# ============================================================================
# Storage Helpers
# ============================================================================


def ensure_data_dir():
    """Create data directory if it doesn't exist."""
    DATA_DIR.mkdir(parents=True, exist_ok=True)


def load_brands() -> dict[str, Brand]:
    """Load brands from JSON file."""
    ensure_data_dir()

    if not BRANDS_FILE.exists():
        # Initialize with default brand
        default_brands = {
            "default": Brand(
                id="default",
                name="Default Theme",
                colors=BrandColors(
                    primary="#0077CC",
                    accent="#00BFB3",
                    background="#F5F7FA",
                    text="#343741",
                ),
                logoLight=BrandLogo(url="", alt="Demo"),
                logoDark=BrandLogo(url="", alt="Demo"),
            )
        }
        save_brands(default_brands)
        return default_brands

    try:
        with open(BRANDS_FILE) as f:
            data = json.load(f)
            return {k: Brand(**v) for k, v in data.items()}
    except (json.JSONDecodeError, Exception) as e:
        print(f"Error loading brands: {e}")
        return {}


def save_brands(brands: dict[str, Brand]):
    """Save brands to JSON file."""
    ensure_data_dir()

    with open(BRANDS_FILE, "w") as f:
        # Convert to dict for JSON serialization
        data = {k: v.model_dump() for k, v in brands.items()}
        json.dump(data, f, indent=2)


# ============================================================================
# API Endpoints
# ============================================================================


@router.get("/")
async def list_brands() -> list[Brand]:
    """Get all available brands."""
    brands = load_brands()
    return list(brands.values())


@router.get("/{brand_id}")
async def get_brand(brand_id: str) -> Brand:
    """Get a specific brand by ID."""
    brands = load_brands()

    if brand_id not in brands:
        raise HTTPException(status_code=404, detail=f"Brand '{brand_id}' not found")

    return brands[brand_id]


@router.post("/", status_code=201)
async def create_brand(brand_data: BrandCreate) -> Brand:
    """Create a new brand."""
    brands = load_brands()

    # Normalize ID
    brand_id = brand_data.id.lower().replace(" ", "-")

    if brand_id in brands:
        raise HTTPException(
            status_code=400,
            detail=f"Brand '{brand_id}' already exists. Use PUT to update.",
        )

    # Create brand
    brand = Brand(
        id=brand_id,
        name=brand_data.name,
        colors=brand_data.colors,
        logoLight=brand_data.logoLight or BrandLogo(),
        logoDark=brand_data.logoDark or BrandLogo(),
    )

    brands[brand_id] = brand
    save_brands(brands)

    return brand


@router.put("/{brand_id}")
async def update_brand(brand_id: str, brand_data: BrandUpdate) -> Brand:
    """Update an existing brand."""
    brands = load_brands()

    if brand_id not in brands:
        raise HTTPException(status_code=404, detail=f"Brand '{brand_id}' not found")

    existing = brands[brand_id]

    # Update only provided fields
    if brand_data.name is not None:
        existing.name = brand_data.name
    if brand_data.colors is not None:
        existing.colors = brand_data.colors
    if brand_data.logoLight is not None:
        existing.logoLight = brand_data.logoLight
    if brand_data.logoDark is not None:
        existing.logoDark = brand_data.logoDark

    existing.updatedAt = datetime.now().isoformat()

    brands[brand_id] = existing
    save_brands(brands)

    return existing


@router.delete("/{brand_id}")
async def delete_brand(brand_id: str):
    """Delete a brand."""
    brands = load_brands()

    if brand_id not in brands:
        raise HTTPException(status_code=404, detail=f"Brand '{brand_id}' not found")

    if brand_id == "default":
        raise HTTPException(status_code=400, detail="Cannot delete the default brand")

    del brands[brand_id]
    save_brands(brands)

    return {"message": f"Brand '{brand_id}' deleted"}
