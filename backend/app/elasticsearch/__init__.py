"""
Elasticsearch utilities and client management.

Provides:
- Client connection management
- Query building utilities
- RetrieverBuilder for configurable search
- Search execution helpers
"""

from .client import get_es_client, es_client, close_es_client
from .search import search_products
from .query_builder import QueryBuilder, get_index_fields, build_filter_clauses
from .retriever_builder import RetrieverBuilder

__all__ = [
    "get_es_client", 
    "es_client",
    "close_es_client",
    "search_products",
    "QueryBuilder",
    "RetrieverBuilder",
    "get_index_fields",
    "build_filter_clauses",
]
