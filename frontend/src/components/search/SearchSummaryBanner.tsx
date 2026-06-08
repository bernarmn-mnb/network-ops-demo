/**
 * SearchSummaryBanner
 *
 * An AI-generated summary banner rendered above search results.
 * Styled after Google AI Overview / Perplexity — short, confident prose
 * with light source attribution.
 *
 * Props:
 *   query        — The active search query (triggers fetch when non-empty)
 *   results      — Top search hits from useSearchSimple / useSearch
 *   maxResults   — How many hits to send to the backend (1..10, default: 5)
 *   maxSentences — Target summary length (default: 3)
 *   enabled      — Whether to show the banner at all (default: true)
 *
 * Generic: no demo-specific logic. Pass any SearchHit array.
 */

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
  EuiPanel,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiText,
  EuiSkeletonText,
  EuiButtonIcon,
  EuiToolTip,
  EuiBadge,
} from '@elastic/eui';
import type { SearchHit } from '../../hooks/useSearchSimple'
import { API_PREFIX } from '../../services/apiBase'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * Maximum number of results the backend `/api/search/summarise` route accepts.
 * Mirrors the `max_length=10` constraint on `SummariseRequest.results`.
 * Keeping these in sync prevents 422 validation errors on the request.
 */
const BACKEND_MAX_RESULTS = 10;

export interface SearchSummaryBannerProps {
  /** Active search query. Empty string disables the banner. */
  query: string;
  /** Top search hits from the search hook. */
  results: SearchHit[];
  /** How many results to send to the AI (default: 5; clamped to [1, 10]). */
  maxResults?: number;
  /** Target sentence length passed to the prompt (default: 3). */
  maxSentences?: number;
  /** Set false to completely disable the component (default: true). */
  enabled?: boolean;
}

// ---------------------------------------------------------------------------
// SSE streaming helper (extracted so it's easy to test)
// ---------------------------------------------------------------------------

interface SummaryResult {
  title: string;
  snippet: string;
  url?: string;
}

async function streamSummary(
  query: string,
  results: SummaryResult[],
  maxSentences: number,
  onChunk: (text: string) => void,
  onDone: () => void,
  onError: (msg: string) => void,
  signal: AbortSignal,
): Promise<void> {
  // Track terminal callback exactly once. The reader's `finally` block always
  // runs (success / error / abort), but we only want to call `onDone()` on a
  // clean completion — otherwise it overwrites the error/loading state in the
  // caller and the UI ends up blank.
  let settled = false;
  const finishOk = () => {
    if (settled) return;
    settled = true;
    onDone();
  };
  const finishErr = (msg: string) => {
    if (settled) return;
    settled = true;
    onError(msg);
  };

  let response: Response;
  try {
    response = await fetch(`${API_PREFIX}/api/search/summarise`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, results, max_sentences: maxSentences }),
      signal,
    });
  } catch (err: unknown) {
    if ((err as Error).name === 'AbortError') {
      settled = true;
      return;
    }
    finishErr('Could not reach the summary API.');
    return;
  }

  if (!response.ok) {
    finishErr(`Summary API returned ${response.status}.`);
    return;
  }

  if (!response.body) {
    finishErr('No response body from summary API.');
    return;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let currentEventType: string | null = null;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';

      for (const line of lines) {
        // Ignore SSE keepalive comments (e.g. ": 0000...")
        if (line.startsWith(':')) continue;

        if (line.startsWith('event: ')) {
          currentEventType = line.slice(7).trim();
        } else if (line.startsWith('data: ')) {
          const raw = line.slice(6).trim();
          if (!raw) continue;

          let parsed: Record<string, unknown>;
          try {
            parsed = JSON.parse(raw) as Record<string, unknown>;
          } catch {
            continue;
          }

          // Unwrap Agent Builder nested payload (data.data quirk)
          let payload = (parsed.data as Record<string, unknown>) ?? parsed;
          if (payload.data && typeof payload.data === 'object') {
            payload = payload.data as Record<string, unknown>;
          }

          const eventType = currentEventType ?? (parsed.event as string | undefined);
          currentEventType = null;

          if (eventType === 'error') {
            const msg =
              (payload.message as string | undefined) ??
              (parsed.message as string | undefined) ??
              'Unknown error from summary API.';
            finishErr(msg);
            return;
          }

          // message_chunk — accumulate text
          const chunk = payload.text_chunk as string | undefined;
          if (chunk) {
            onChunk(chunk);
          }
        }
      }
    }

    // Loop exited normally — mark as success.
    finishOk();
  } catch (err: unknown) {
    if (signal.aborted || (err as Error).name === 'AbortError') {
      // Caller cancelled (e.g. new query). Do not flip state to done/error.
      settled = true;
      return;
    }
    finishErr('Stream interrupted.');
  } finally {
    try {
      reader.releaseLock();
    } catch {
      // Reader was already released or stream is closed.
    }
  }
}

// ---------------------------------------------------------------------------
// Extract snippet from a SearchHit
// ---------------------------------------------------------------------------

/**
 * Strip HTML tags from a highlight excerpt.
 *
 * Different retrievers use different tag styles for highlight markers:
 *   - Default Elasticsearch  → `<em>`/`</em>`
 *   - RetrieverBuilder       → `<mark>`/`</mark>`
 *   - Some demos             → custom tags
 *
 * We strip ANY HTML tag rather than hard-coding each variant, so the LLM
 * prompt receives plain text regardless of which highlight strategy ran.
 */
function stripHtmlTags(input: string): string {
  return input.replace(/<\/?[^>]+>/g, '');
}

function extractSnippet(hit: SearchHit): string {
  // Prefer highlight (ES-marked excerpt)
  if (hit.highlight) {
    const hValues = Object.values(hit.highlight).flat();
    if (hValues.length > 0) {
      return stripHtmlTags(hValues[0]).slice(0, 300);
    }
  }
  // Fall back to known content fields
  const s = hit.source;
  const text =
    (s.description as string | undefined) ??
    (s.search_text as string | undefined) ??
    (s.body as string | undefined) ??
    (s.content as string | undefined) ??
    '';
  return String(text).slice(0, 300);
}

function extractTitle(hit: SearchHit): string {
  const s = hit.source;
  return String(
    (s.title as string | undefined) ?? (s.name as string | undefined) ?? hit.id,
  ).slice(0, 120);
}

function extractUrl(hit: SearchHit): string | undefined {
  const s = hit.source;
  const url = (s.url as string | undefined) ?? (s.link as string | undefined);
  return url ? String(url) : undefined;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

type BannerState = 'idle' | 'loading' | 'streaming' | 'done' | 'error' | 'dismissed';

// Inject @keyframes blink once into the document head (SSR-safe)
const BLINK_STYLE_ID = 'search-summary-blink';
function useBlinkKeyframes() {
  useLayoutEffect(() => {
    if (typeof document === 'undefined') return;
    if (document.getElementById(BLINK_STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = BLINK_STYLE_ID;
    style.textContent = `@keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }`;
    document.head.appendChild(style);
  }, []);
}

export function SearchSummaryBanner({
  query,
  results,
  maxResults = 5,
  maxSentences = 3,
  enabled = true,
}: SearchSummaryBannerProps) {
  useBlinkKeyframes();

  const [state, setState] = useState<BannerState>('idle');
  const [summaryText, setSummaryText] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [dismissed, setDismissed] = useState(false);

  // Track which query+results combination we last fetched for
  const lastFetchKey = useRef<string>('');
  const abortRef = useRef<AbortController | null>(null);

  // Reset dismissed state when query changes
  useEffect(() => {
    setDismissed(false);
  }, [query]);

  const fetchSummary = useCallback(async () => {
    if (!enabled || !query.trim() || results.length === 0) return;

    // Clamp `maxResults` to the backend's hard limit so we never trigger a
    // 422 from the summarise endpoint (`SummariseRequest.results` has
    // `max_length=10`). Lower bound is 1 so we always send at least one item.
    const effectiveMax = Math.max(1, Math.min(maxResults, BACKEND_MAX_RESULTS));

    // Build a stable cache key: query + top-N result IDs
    const topResults = results.slice(0, effectiveMax);
    const fetchKey = `${query.trim().toLowerCase()}::${topResults.map(r => r.id).join(',')}`;

    if (fetchKey === lastFetchKey.current) return;
    lastFetchKey.current = fetchKey;

    // Cancel any in-flight request
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setSummaryText('');
    setErrorMsg('');
    setState('loading');

    const summaryResults = topResults.map(hit => ({
      title: extractTitle(hit),
      snippet: extractSnippet(hit),
      url: extractUrl(hit),
    }));

    await streamSummary(
      query,
      summaryResults,
      maxSentences,
      (chunk) => {
        setSummaryText(prev => prev + chunk);
        setState('streaming');
      },
      () => {
        setState('done');
      },
      (msg) => {
        setErrorMsg(msg);
        setState('error');
      },
      controller.signal,
    );
  }, [enabled, query, results, maxResults, maxSentences]);

  // Trigger fetch whenever query or results change
  useEffect(() => {
    if (!dismissed) {
      void fetchSummary();
    }
  }, [fetchSummary, dismissed]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  // Nothing to show
  if (!enabled || !query.trim() || dismissed) return null;

  // Error: hide silently (don't break the search experience)
  if (state === 'error') {
    if (import.meta.env.DEV) {
      console.warn('[SearchSummaryBanner] error:', errorMsg);
    }
    return null;
  }

  // Idle (haven't started yet) or results not loaded — render nothing
  if (state === 'idle' || results.length === 0) return null;

  return (
    <EuiPanel
      paddingSize="m"
      hasBorder
      hasShadow={false}
      style={{
        borderLeft: '3px solid var(--euiColorPrimary)',
        background: 'var(--euiColorLightestShade)',
        borderRadius: 6,
      }}
    >
      {/* Header row */}
      <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiIcon type="sparkles" color="primary" size="m" />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiBadge color="hollow" style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.03em' }}>
            AI Summary
          </EuiBadge>
        </EuiFlexItem>
        <EuiFlexItem />
        {/* Dismiss button */}
        <EuiFlexItem grow={false}>
          <EuiToolTip content="Hide AI summary">
            <EuiButtonIcon
              iconType="cross"
              aria-label="Dismiss AI summary"
              size="xs"
              color="text"
              onClick={() => setDismissed(true)}
            />
          </EuiToolTip>
        </EuiFlexItem>
      </EuiFlexGroup>

      {/* Content */}
      {state === 'loading' ? (
        <div style={{ marginTop: 8 }}>
          <EuiSkeletonText lines={2} size="s" />
        </div>
      ) : (
        <EuiText
          size="s"
          style={{ marginTop: 8, lineHeight: 1.6 }}
          aria-live="polite"
          aria-label="AI-generated search summary"
        >
          <p style={{ margin: 0, color: 'var(--euiTextColor)' }}>
            {summaryText}
            {/* Blinking cursor while streaming */}
            {state === 'streaming' && (
              <span
                aria-hidden="true"
                style={{
                  display: 'inline-block',
                  width: 2,
                  height: '1em',
                  background: 'var(--euiColorPrimary)',
                  marginLeft: 2,
                  verticalAlign: 'text-bottom',
                  animation: 'blink 1s step-end infinite',
                }}
              />
            )}
          </p>
        </EuiText>
      )}
    </EuiPanel>
  );
}

export default SearchSummaryBanner;
