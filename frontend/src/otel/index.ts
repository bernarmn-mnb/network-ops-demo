/**
 * OpenTelemetry Browser SDK Module
 * 
 * Provides browser-side tracing for search analytics.
 * 
 * Usage:
 * ```typescript
 * import { initOTel, getTracer, createSearchSpan } from './otel';
 * 
 * // Initialize at app startup
 * initOTel({ endpoint: '...', authToken: '...' });
 * 
 * // Create custom spans for search interactions
 * const span = createSearchSpan('search.submit', {
 *   'search.user_query': query,
 * });
 * // ... do work ...
 * span.end();
 * ```
 */

export {
  initOTel,
  getTracer,
  getSessionId2 as getSessionId,
  createSearchSpan,
  recordSearchEvent,
  recordClickEvent,
  isOTelEnabled,
  getOTelStatus,
  trace,
  context,
  SpanStatusCode,
} from './setup';

export type { ProductMetadata } from './setup';

export type { OTelConfig } from './setup';

