/**
 * Visual Search Hook
 *
 * Wraps the /api/visual-search endpoints for kNN search using Jina CLIP v2
 * embeddings. Supports two modes:
 *   - text-to-image: describe a product visually (/api/visual-search/text)
 *   - image-to-image: paste a URL to find similar (/api/visual-search/image)
 *
 * Returns results in the same SearchHit shape as useSearchSimple so the
 * SearchResultCard component can render them without changes.
 */

import { API_PREFIX } from '../services/apiBase'

import { useState, useCallback, useEffect } from 'react';
import type { SearchHit } from './useSearchSimple';

export interface UseVisualSearchResult {
  results: SearchHit[];
  total: number;
  tookMs: number | null;
  loading: boolean;
  error: string | null;
  hasSearched: boolean;
  available: boolean | null;
  /** Text-to-image: describe what a product looks like */
  searchByText: (query: string) => Promise<void>;
  /** Image-to-image: find products visually similar to a given image URL */
  searchByImage: (imageUrl: string) => Promise<void>;
  /** Legacy alias — calls searchByText */
  search: (query: string) => Promise<void>;
  reset: () => void;
}

export function useVisualSearch(): UseVisualSearchResult {
  const [results, setResults] = useState<SearchHit[]>([]);
  const [total, setTotal] = useState(0);
  const [tookMs, setTookMs] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [available, setAvailable] = useState<boolean | null>(null);

  useEffect(() => {
    fetch(`${API_PREFIX}/api/visual-search/health`)
      .then((r) => r.json())
      .then((d) => setAvailable(d.jina_configured !== false))
      .catch(() => setAvailable(false));
  }, []);

  const executeSearch = useCallback(async (endpoint: string, body: Record<string, unknown>) => {
    setLoading(true);
    setError(null);
    setHasSearched(true);

    try {
      const resp = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!resp.ok) {
        const errData = await resp.json().catch(() => null);
        throw new Error(errData?.detail || `Visual search failed (${resp.status})`);
      }

      const data = await resp.json();

      const hits: SearchHit[] = (data.hits || []).map(
        (h: { id: string; score: number; source: Record<string, unknown> }) => ({
          id: h.id,
          score: h.score,
          source: h.source,
          highlight: undefined,
        }),
      );

      setResults(hits);
      setTotal(data.total || 0);
      setTookMs(data.took_ms ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Visual search failed');
      setResults([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, []);

  const searchByText = useCallback(
    async (query: string) => {
      if (!query.trim()) return;
      await executeSearch('/api/visual-search/text', { query: query.trim(), size: 24 });
    },
    [executeSearch],
  );

  const searchByImage = useCallback(
    async (imageUrl: string) => {
      if (!imageUrl.trim()) return;
      await executeSearch('/api/visual-search/image', { image_url: imageUrl.trim(), size: 24 });
    },
    [executeSearch],
  );

  const reset = useCallback(() => {
    setResults([]);
    setTotal(0);
    setTookMs(null);
    setError(null);
    setHasSearched(false);
  }, []);

  return {
    results,
    total,
    tookMs,
    loading,
    error,
    hasSearched,
    available,
    searchByText,
    searchByImage,
    search: searchByText,
    reset,
  };
}

export default useVisualSearch;
