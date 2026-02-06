/**
 * Simplified Search Hook for Starter Template
 * 
 * A clean, minimal search hook (~150 lines) that provides:
 * - Query state management
 * - Results, pagination, and loading states
 * - Filter and sort support
 * - Aggregations for faceted search
 * - Error handling
 * 
 * This is the "starter" version without advanced features like:
 * - Lab Mode / Feature weights
 * - Personalization (user preferences, session context)
 * - Diversification (field collapse, MMR)
 * - Learning to Rank
 * - Position delta tracking
 * - Query type configuration
 * 
 * For the full-featured version, see useSearch.ts
 */

import { useState, useCallback, useEffect } from 'react';

// Types (inline to keep this file self-contained for starter template)
export interface SearchHit {
  id: string;
  score: number;
  source: Record<string, unknown>;
  highlight?: Record<string, string[]>;
}

export interface AggregationBucket {
  key: string;
  doc_count: number;
}

export interface SearchFilters {
  [key: string]: unknown;
}

export interface UseSearchOptions {
  /** Initial search query */
  initialQuery?: string;
  /** Results per page (default: 12) */
  pageSize?: number;
  /** Auto-search when filters change (default: false) */
  autoSearch?: boolean;
  /** API base URL (default: '' for relative paths via Vite proxy) */
  apiUrl?: string;
}

export interface UseSearchResult {
  // State
  query: string;
  results: SearchHit[];
  total: number;
  page: number;
  totalPages: number;
  loading: boolean;
  error: string | null;
  aggregations: Record<string, AggregationBucket[]>;
  tookMs: number | null;
  
  // Filters & Sort
  filters: SearchFilters;
  sortBy: string | null;
  sortDir: 'asc' | 'desc';
  
  // Actions
  setQuery: (query: string) => void;
  search: () => Promise<void>;
  setPage: (page: number) => void;
  setFilter: (field: string, value: unknown) => void;
  setSort: (field: string | null, dir?: 'asc' | 'desc') => void;
  clearFilters: () => void;
  reset: () => void;
}

export function useSearchSimple(options: UseSearchOptions = {}): UseSearchResult {
  const { 
    initialQuery = '', 
    pageSize = 12,
    autoSearch = false,
    apiUrl = '',
  } = options;

  // Core state
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<SearchHit[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPageState] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aggregations, setAggregations] = useState<Record<string, AggregationBucket[]>>({});
  const [tookMs, setTookMs] = useState<number | null>(null);
  
  // Filter & sort state
  const [filters, setFilters] = useState<SearchFilters>({});
  const [sortBy, setSortBy] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  // Search function
  const search = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${apiUrl}/api/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query,
          page,
          page_size: pageSize,
          filters: Object.keys(filters).length > 0 ? filters : undefined,
          sort_by: sortBy || undefined,
          sort_dir: sortDir,
        }),
      });

      if (!response.ok) {
        throw new Error(`Search failed: ${response.status}`);
      }

      const data = await response.json();
      
      setResults(data.hits || []);
      setTotal(data.total || 0);
      setTotalPages(data.total_pages || 0);
      setAggregations(data.aggregations || {});
      setTookMs(data.took_ms ?? null);
      setPageState(data.page || 1);

    } catch (err) {
      const message = err instanceof Error ? err.message : 'Search failed';
      setError(message);
      setResults([]);
      setTotal(0);
      setTotalPages(0);
    } finally {
      setLoading(false);
    }
  }, [query, page, pageSize, filters, sortBy, sortDir, apiUrl]);

  // Page change triggers search
  const setPage = useCallback((newPage: number) => {
    setPageState(newPage);
  }, []);

  // Filter management
  const setFilter = useCallback((field: string, value: unknown) => {
    setFilters(prev => {
      const next = { ...prev };
      if (value === undefined || value === null || value === '') {
        delete next[field];
      } else {
        next[field] = value;
      }
      return next;
    });
    setPageState(1); // Reset to first page on filter change
  }, []);

  // Sort management
  const setSort = useCallback((field: string | null, dir: 'asc' | 'desc' = 'desc') => {
    setSortBy(field);
    setSortDir(dir);
    setPageState(1); // Reset to first page on sort change
  }, []);

  // Clear all filters
  const clearFilters = useCallback(() => {
    setFilters({});
    setSortBy(null);
    setSortDir('desc');
    setPageState(1);
  }, []);

  // Reset everything
  const reset = useCallback(() => {
    setQuery('');
    setResults([]);
    setTotal(0);
    setPageState(1);
    setTotalPages(0);
    setError(null);
    setAggregations({});
    setTookMs(null);
    setFilters({});
    setSortBy(null);
    setSortDir('desc');
  }, []);

  // Auto-search when filters/sort/page change
  useEffect(() => {
    if (autoSearch) {
      search();
    }
  }, [autoSearch, filters, sortBy, sortDir, page, search]);

  return {
    query,
    results,
    total,
    page,
    totalPages,
    loading,
    error,
    aggregations,
    tookMs,
    filters,
    sortBy,
    sortDir,
    setQuery,
    search,
    setPage,
    setFilter,
    setSort,
    clearFilters,
    reset,
  };
}

export default useSearchSimple;

