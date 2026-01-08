"""
Elasticsearch utilities and client management.

For starter template, only includes client management.
Full search utilities (QueryBuilder, RetrieverBuilder) 
are in the search-otel-ubi branch.
"""

from .client import get_es_client, es_client, close_es_client

__all__ = [
    "get_es_client", 
    "es_client",
    "close_es_client",
]
