"""
Tracking API - Record search interaction events.

This endpoint receives user behavior events from the frontend and records them
as OTel spans. This is necessary because browsers can't send traces
directly to Elastic APM due to CORS restrictions.

Endpoints:
- POST /api/track/click - Record a search result click
- POST /api/track/cart - Record an add-to-cart event
- POST /api/track/checkout - Record a checkout completion
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
import logging

from ..otel import get_tracer

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/track", tags=["tracking"])


class ClickEvent(BaseModel):
    """Click event data from frontend."""
    document_id: str
    position: int
    search_query: str
    session_id: str | None = None
    user_id: str | None = None  # User profile ID for personalization
    # Product metadata for analytics
    product_brand: str | None = None
    product_category: str | None = None
    product_price: float | None = None
    product_name: str | None = None


class TrackingResponse(BaseModel):
    """Response from tracking endpoint."""
    status: str
    message: str


@router.post("/click", response_model=TrackingResponse)
async def track_click(event: ClickEvent):
    """
    Record a search result click event.
    
    This endpoint is called by the frontend when a user clicks on a search result.
    It creates an OTel span with the click data that gets exported to Elastic APM.
    
    Attributes recorded:
    - search.result_click_id: Document ID that was clicked
    - search.result_click_position: Position in search results (1-based)
    - search.user_query: The search query that produced this result
    - session.id: User session ID for correlation
    """
    try:
        # Create a span for the click event using app's configured tracer
        tracer = get_tracer()
        logger.info(f"Using tracer: {type(tracer).__name__}")
        
        with tracer.start_as_current_span("search.result.click") as span:
            logger.info(f"Span created: {type(span).__name__}, name={span.name if hasattr(span, 'name') else 'N/A'}")
            
            # Set click attributes per semantic conventions
            span.set_attribute("search.result_click_id", event.document_id)
            span.set_attribute("search.result_click_position", event.position)
            span.set_attribute("search.user_query", event.search_query)
            
            # Session and user identification
            if event.session_id:
                span.set_attribute("search.session_id", event.session_id)
            if event.user_id:
                span.set_attribute("search.user_id", event.user_id)
            
            # Product metadata for analytics
            if event.product_brand:
                span.set_attribute("search.result_click_brand", event.product_brand)
            if event.product_category:
                span.set_attribute("search.result_click_category", event.product_category)
            if event.product_price is not None:
                span.set_attribute("search.result_click_price", event.product_price)
            if event.product_name:
                span.set_attribute("search.result_click_name", event.product_name)
            
            logger.info(
                f"Click tracked: doc={event.document_id}, "
                f"pos={event.position}, query='{event.search_query}', "
                f"user={event.user_id}, brand={event.product_brand}"
            )
        
        return TrackingResponse(
            status="success",
            message=f"Click recorded for document {event.document_id}"
        )
    
    except Exception as e:
        logger.error(f"Failed to track click: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to track click: {str(e)}")


# =============================================================================
# Cart Tracking
# =============================================================================

class CartEvent(BaseModel):
    """Add to cart event data from frontend."""
    product_id: str
    product_title: str
    product_price: float
    quantity: int = 1
    session_id: Optional[str] = None
    user_id: Optional[str] = None
    # Search attribution - which query led to this cart add
    search_query: Optional[str] = None
    search_position: Optional[int] = None
    # Product metadata
    product_brand: Optional[str] = None
    product_category: Optional[str] = None


@router.post("/cart", response_model=TrackingResponse)
async def track_cart(event: CartEvent):
    """
    Record an add-to-cart event.
    
    This is part of the conversion funnel: search → click → cart → checkout.
    The search_query and search_position enable attribution analysis.
    
    Attributes recorded:
    - cart.product_id: Product added to cart
    - cart.product_title: Product name
    - cart.product_price: Price at time of add
    - cart.quantity: Quantity added
    - cart.from_search: Boolean - was this from a search result
    - search.user_query: The search query that led to this (if from search)
    - search.result_position: Position in search results (if from search)
    """
    try:
        tracer = get_tracer()
        
        with tracer.start_as_current_span("cart.add") as span:
            # Cart item details
            span.set_attribute("cart.product_id", event.product_id)
            span.set_attribute("cart.product_title", event.product_title)
            span.set_attribute("cart.product_price", event.product_price)
            span.set_attribute("cart.quantity", event.quantity)
            
            # Session and user
            if event.session_id:
                span.set_attribute("search.session_id", event.session_id)
            if event.user_id:
                span.set_attribute("search.user_id", event.user_id)
            
            # Search attribution
            from_search = bool(event.search_query)
            span.set_attribute("cart.from_search", from_search)
            if event.search_query:
                span.set_attribute("search.user_query", event.search_query)
            if event.search_position is not None:
                span.set_attribute("search.result_position", event.search_position)
            
            # Product metadata
            if event.product_brand:
                span.set_attribute("cart.product_brand", event.product_brand)
            if event.product_category:
                span.set_attribute("cart.product_category", event.product_category)
            
            logger.info(
                f"Cart add: product={event.product_id}, "
                f"query='{event.search_query or 'N/A'}', "
                f"price={event.product_price}"
            )
        
        return TrackingResponse(
            status="success",
            message=f"Cart add recorded for product {event.product_id}"
        )
    
    except Exception as e:
        logger.error(f"Failed to track cart add: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to track cart: {str(e)}")


# =============================================================================
# Checkout Tracking
# =============================================================================

class CheckoutItem(BaseModel):
    """Single item in checkout."""
    product_id: str
    product_title: str
    product_price: float
    quantity: int
    # Search attribution
    search_query: Optional[str] = None
    search_position: Optional[int] = None


class CheckoutEvent(BaseModel):
    """Checkout completion event from frontend."""
    order_id: str
    total_amount: float
    item_count: int
    items: list[CheckoutItem] = []
    session_id: Optional[str] = None
    user_id: Optional[str] = None


@router.post("/checkout", response_model=TrackingResponse)
async def track_checkout(event: CheckoutEvent):
    """
    Record a checkout completion event.
    
    This is the conversion event in the funnel: search → click → cart → checkout.
    Links back to originating search queries for attribution.
    
    Attributes recorded:
    - checkout.order_id: Unique order identifier
    - checkout.total_amount: Order total
    - checkout.item_count: Number of items
    - checkout.from_search_count: Items that came from search
    - checkout.search_queries: Array of search queries that led to this order
    """
    try:
        tracer = get_tracer()
        
        with tracer.start_as_current_span("checkout.complete") as span:
            # Order details
            span.set_attribute("checkout.order_id", event.order_id)
            span.set_attribute("checkout.total_amount", event.total_amount)
            span.set_attribute("checkout.item_count", event.item_count)
            
            # Session and user
            if event.session_id:
                span.set_attribute("search.session_id", event.session_id)
            if event.user_id:
                span.set_attribute("search.user_id", event.user_id)
            
            # Search attribution - collect unique queries that led to this order
            search_queries = set()
            from_search_count = 0
            
            for item in event.items:
                if item.search_query:
                    search_queries.add(item.search_query)
                    from_search_count += 1
            
            span.set_attribute("checkout.from_search_count", from_search_count)
            if search_queries:
                span.set_attribute("checkout.search_queries", list(search_queries))
            
            # Log each item as an event for detailed attribution
            for item in event.items:
                span.add_event(
                    "checkout.item",
                    attributes={
                        "product_id": item.product_id,
                        "product_title": item.product_title,
                        "quantity": item.quantity,
                        "price": item.product_price,
                        "from_search": bool(item.search_query),
                        "search_query": item.search_query or "",
                        "search_position": item.search_position or 0,
                    }
                )
            
            logger.info(
                f"Checkout: order={event.order_id}, "
                f"total=${event.total_amount:.2f}, "
                f"items={event.item_count}, "
                f"from_search={from_search_count}"
            )
        
        return TrackingResponse(
            status="success",
            message=f"Checkout recorded for order {event.order_id}"
        )
    
    except Exception as e:
        logger.error(f"Failed to track checkout: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to track checkout: {str(e)}")

