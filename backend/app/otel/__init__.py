"""
OpenTelemetry configuration for Search OTel UBI Bridge.

This module provides:
1. OTel SDK initialization with OTLP export to Elastic APM
2. FastAPI and Elasticsearch auto-instrumentation
3. Custom span attributes for search analytics

Usage:
    from app.otel import init_otel, get_tracer
    
    # Initialize at app startup
    init_otel(app)
    
    # Get tracer for custom spans
    tracer = get_tracer()
"""

from .setup import init_otel, get_tracer, shutdown_otel

__all__ = ["init_otel", "get_tracer", "shutdown_otel"]

