/**
 * OpenTelemetry Web SDK Setup
 * 
 * Configures browser-side tracing for search analytics:
 * - OTLP HTTP exporter to Elastic APM
 * - Fetch instrumentation for API calls
 * - W3C traceparent propagation to link browser → backend traces
 * - Session ID for user journey correlation
 * 
 * Follows semantic conventions from docs/SEMANTIC-CONVENTIONS.md
 */

import { WebTracerProvider, BatchSpanProcessor } from '@opentelemetry/sdk-trace-web';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { ZoneContextManager } from '@opentelemetry/context-zone';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { FetchInstrumentation } from '@opentelemetry/instrumentation-fetch';
import { registerInstrumentations } from '@opentelemetry/instrumentation';
import { trace, context, SpanStatusCode, type Attributes } from '@opentelemetry/api';

// Service configuration
const SERVICE_NAME = 'search-frontend';
const SERVICE_VERSION = '0.1.0';

// Get or generate session ID for user journey correlation
function getSessionId(): string {
  const SESSION_KEY = 'otel_session_id';
  let sessionId = sessionStorage.getItem(SESSION_KEY);
  
  if (!sessionId) {
    sessionId = crypto.randomUUID();
    sessionStorage.setItem(SESSION_KEY, sessionId);
  }
  
  return sessionId;
}

// Get anonymous user ID (persisted across sessions)
function getAnonymousUserId(): string {
  const USER_KEY = 'otel_anonymous_user_id';
  let userId = localStorage.getItem(USER_KEY);
  
  if (!userId) {
    userId = `anon-${crypto.randomUUID()}`;
    localStorage.setItem(USER_KEY, userId);
  }
  
  return userId;
}

/**
 * Configuration for OTel initialization
 */
export interface OTelConfig {
  /** OTLP endpoint URL (e.g., https://...apm.elastic-cloud.com:443) */
  endpoint?: string;
  /** Bearer token for authentication */
  authToken?: string;
  /** Enable debug logging */
  debug?: boolean;
}

// Store tracer instance and initialization state
let _tracer: ReturnType<typeof trace.getTracer> | null = null;
let _initialized = false;
let _enabled = false; // True if OTel is actually sending traces

/**
 * Initialize OpenTelemetry Web SDK
 * 
 * @param config - OTel configuration
 * @returns true if initialized, false if skipped (disabled or no endpoint)
 */
export function initOTel(config: OTelConfig = {}): boolean {
  if (_initialized) {
    console.warn('[OTel] Already initialized');
    return true;
  }

  // Check for explicit disable flag
  const explicitlyDisabled = import.meta.env.VITE_OTEL_ENABLED === 'false';
  if (explicitlyDisabled) {
    console.info('[OTel] Explicitly disabled via VITE_OTEL_ENABLED=false');
    _initialized = true; // Mark as initialized to prevent re-init
    _enabled = false;
    return false;
  }

  // Get configuration from environment or config
  const endpoint = config.endpoint || import.meta.env.VITE_OTEL_ENDPOINT;
  const authToken = config.authToken || import.meta.env.VITE_OTEL_AUTH_TOKEN;
  
  if (!endpoint) {
    console.warn('[OTel] No endpoint configured - tracing disabled');
    console.info('[OTel] Set VITE_OTEL_ENDPOINT to enable browser tracing');
    console.info('[OTel] Or set VITE_OTEL_ENABLED=false to explicitly disable');
    return false;
  }

  const sessionId = getSessionId();
  const anonymousUserId = getAnonymousUserId();

  if (config.debug) {
    console.log('[OTel] Initializing with:', {
      endpoint,
      sessionId,
      anonymousUserId,
      hasAuthToken: !!authToken,
    });
  }

  // Create resource with service identity and session context
  const resource = resourceFromAttributes({
    'service.name': SERVICE_NAME,
    'service.version': SERVICE_VERSION,
    'deployment.environment': import.meta.env.MODE || 'development',
    'service.namespace': 'search-otel-ubi',
    'session.id': sessionId,
    'user.anonymous_id': anonymousUserId,
    'browser.language': navigator.language,
    'browser.user_agent': navigator.userAgent,
  });

  // Configure OTLP exporter
  const traceEndpoint = endpoint.endsWith('/v1/traces') 
    ? endpoint 
    : `${endpoint.replace(/\/$/, '')}/v1/traces`;

  const headers: Record<string, string> = {};
  if (authToken) {
    // Ensure Bearer prefix
    headers['Authorization'] = authToken.startsWith('Bearer ') 
      ? authToken 
      : `Bearer ${authToken}`;
  }

  const exporter = new OTLPTraceExporter({
    url: traceEndpoint,
    headers,
  });

  // Create tracer provider with resource and span processors
  const provider = new WebTracerProvider({
    resource,
    spanProcessors: [new BatchSpanProcessor(exporter)],
  });

  // Use Zone.js for context propagation across async boundaries
  provider.register({
    contextManager: new ZoneContextManager(),
  });

  // Instrument fetch for automatic tracing of API calls
  // This adds W3C traceparent headers to propagate trace context to backend
  registerInstrumentations({
    instrumentations: [
      new FetchInstrumentation({
        // Propagate trace context to our API
        propagateTraceHeaderCorsUrls: [
          /localhost/,
          /127\.0\.0\.1/,
          // Add production API URLs here
        ],
        // Add custom attributes to fetch spans
        applyCustomAttributesOnSpan: (span, request) => {
          if (request instanceof Request) {
            span.setAttribute('http.url', request.url);
          }
        },
      }),
    ],
  });

  _tracer = trace.getTracer(SERVICE_NAME, SERVICE_VERSION);
  _initialized = true;
  _enabled = true;

  console.log(`[OTel] Browser tracing initialized: ${SERVICE_NAME}@${SERVICE_VERSION}`);
  console.log(`[OTel] Session: ${sessionId.substring(0, 8)}...`);
  console.log(`[OTel] Exporting to: ${traceEndpoint}`);

  return true;
}

/**
 * Check if OTel tracing is enabled and sending data
 */
export function isOTelEnabled(): boolean {
  return _enabled;
}

/**
 * Get OTel status for display
 */
export function getOTelStatus(): { enabled: boolean; endpoint: string | null; sessionId: string | null } {
  return {
    enabled: _enabled,
    endpoint: _enabled ? (import.meta.env.VITE_OTEL_ENDPOINT || null) : null,
    sessionId: _enabled ? getSessionId() : null,
  };
}

/**
 * Get the OTel tracer for creating custom spans
 * 
 * Usage:
 * ```typescript
 * const tracer = getTracer();
 * const span = tracer.startSpan('search.submit');
 * span.setAttribute('search.user_query', query);
 * // ... do work ...
 * span.end();
 * ```
 */
export function getTracer(): ReturnType<typeof trace.getTracer> {
  if (!_tracer) {
    // Return a noop tracer if not initialized
    return trace.getTracer(SERVICE_NAME);
  }
  return _tracer;
}

/**
 * Get the current session ID
 * Useful for including in API requests for correlation
 */
export function getSessionId2(): string {
  return getSessionId();
}

/**
 * Create a span for a search interaction
 * 
 * Convenience wrapper that sets common search attributes
 */
export function createSearchSpan(name: string, attributes?: Record<string, unknown>) {
  const tracer = getTracer();
  const span = tracer.startSpan(name);
  
  if (attributes) {
    for (const [key, value] of Object.entries(attributes)) {
      if (value !== undefined && value !== null) {
        span.setAttribute(key, value as string | number | boolean);
      }
    }
  }
  
  return span;
}

/**
 * Record a search event on the current span
 */
export function recordSearchEvent(
  eventName: string, 
  attributes?: Attributes
) {
  const currentSpan = trace.getActiveSpan();
  if (currentSpan) {
    currentSpan.addEvent(eventName, attributes);
  }
}

/**
 * Product metadata for click tracking
 */
export interface ProductMetadata {
  brand?: string;
  category?: string;
  price?: number;
  name?: string;
}

/**
 * Record a click event via the backend tracking API.
 * 
 * Sends click data to the backend which creates the OTel span.
 * This is necessary because browsers can't send traces directly to 
 * Elastic APM due to CORS restrictions.
 * 
 * The backend records:
 * - search.result_click_id: The document ID that was clicked
 * - search.result_click_position: The position (1-based) in the result list
 * - search.user_query: The search query that led to this result
 * - search.user_id: The user profile ID for personalization analytics
 * - Product metadata (brand, category, price) for behavior analysis
 */
export async function recordClickEvent(
  documentId: string,
  position: number,
  searchQuery: string,
  userId?: string,
  productMetadata?: ProductMetadata
) {
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8001';
  
  try {
    const response = await fetch(`${apiUrl}/api/track/click`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        document_id: documentId,
        position: position,
        search_query: searchQuery,
        session_id: getSessionId(),
        user_id: userId,
        product_brand: productMetadata?.brand,
        product_category: productMetadata?.category,
        product_price: productMetadata?.price,
        product_name: productMetadata?.name,
      }),
    });
    
    if (!response.ok) {
      console.warn('[OTel] Failed to track click:', response.status);
      return;
    }
    
    console.log('[OTel] Click tracked via backend:', { 
      documentId, position, searchQuery, userId, 
      brand: productMetadata?.brand 
    });
  } catch (error) {
    // Don't fail silently but don't crash either
    console.warn('[OTel] Click tracking error:', error);
  }
}

// Re-export useful OTel APIs
export { trace, context, SpanStatusCode };
