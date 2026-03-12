/**
 * Browser Tool Dispatch Layer
 *
 * Normalizes tool IDs, extracts parameters, and dispatches to registered
 * handlers with error containment and logging.
 *
 * This is the single entry point for all browser tool invocations.
 * Pages register handlers via a BrowserToolHandlerMap; this module
 * handles the rest.
 *
 * @example
 * import { dispatchBrowserTool, normalizeToolId } from './browserToolDispatch'
 * import type { BrowserToolHandlerMap } from '../types/browserTools'
 *
 * const handlers: BrowserToolHandlerMap = {
 *   'browser.show_results': (params) => updatePanel(params),
 * }
 *
 * // In your onBrowserToolCall callback:
 * dispatchBrowserTool(invocation, handlers)
 */

import type {
  BrowserToolInvocation,
  BrowserToolHandlerMap,
  BrowserToolLogEntry,
  DispatchOptions,
} from '../types/browserTools'

// ---------------------------------------------------------------------------
// Tool ID normalization
// ---------------------------------------------------------------------------

/**
 * Normalize an Agent Builder tool ID to dotted form.
 *
 * Agent Builder may send IDs in various formats:
 *   - `browser_show_results`    → `browser.show_results`
 *   - `browser.show_results`    → `browser.show_results` (already correct)
 *   - `browser_browser_foo`     → `browser.foo` (double prefix from some configs)
 *
 * @param rawId - The raw tool ID from the SSE stream
 * @returns Normalized dotted-form tool ID
 */
export function normalizeToolId(rawId: string): string {
  // Strip double browser_ prefix (some Agent Builder configs emit this)
  let id = rawId
  if (id.startsWith('browser_browser_')) {
    id = 'browser_' + id.slice('browser_browser_'.length)
  }

  // Already in dotted form
  if (id.startsWith('browser.')) {
    return id
  }

  // Convert browser_<action> to browser.<action>
  if (id.startsWith('browser_')) {
    return 'browser.' + id.slice('browser_'.length)
  }

  return id
}

// ---------------------------------------------------------------------------
// Parameter extraction
// ---------------------------------------------------------------------------

/**
 * Extract tool parameters, unwrapping kwargs if present.
 *
 * Some Agent Builder configurations wrap parameters in a `kwargs` key.
 * This function normalizes both formats.
 *
 * @param rawParams - Raw parameters from the tool call event
 * @returns Unwrapped parameters
 */
export function getBrowserToolParams(rawParams: unknown): unknown {
  if (rawParams && typeof rawParams === 'object' && !Array.isArray(rawParams)) {
    const obj = rawParams as Record<string, unknown>
    // Unwrap kwargs if it's the only key or contains the actual params
    if ('kwargs' in obj && typeof obj.kwargs === 'object') {
      return obj.kwargs
    }
  }
  return rawParams
}

// ---------------------------------------------------------------------------
// Dispatch log (in-memory ring buffer for observability)
// ---------------------------------------------------------------------------

const LOG_MAX_ENTRIES = 50
const dispatchLog: BrowserToolLogEntry[] = []

function logDispatch(entry: BrowserToolLogEntry): void {
  dispatchLog.push(entry)
  if (dispatchLog.length > LOG_MAX_ENTRIES) {
    dispatchLog.shift()
  }

  const prefix = entry.success ? '[browser-tool OK]' : '[browser-tool ERR]'
  console.log(`${prefix} ${entry.normalizedId}`, entry.error || '')
}

/**
 * Get the dispatch log for debugging.
 * Call from browser console: `window.__browserToolLog?.()`
 */
export function getBrowserToolLog(): readonly BrowserToolLogEntry[] {
  return dispatchLog
}

// Expose on window for console access in dev
if (typeof window !== 'undefined') {
  ;(window as unknown as Record<string, unknown>).__browserToolLog = getBrowserToolLog
}

// ---------------------------------------------------------------------------
// Strict mode
// ---------------------------------------------------------------------------

/**
 * Check if strict browser tools mode is enabled.
 * In strict mode, unrecognized tool calls are treated as errors.
 */
export function isStrictMode(): boolean {
  try {
    return import.meta.env.VITE_STRICT_BROWSER_TOOLS === 'true'
  } catch {
    return false
  }
}

// ---------------------------------------------------------------------------
// Main dispatch function
// ---------------------------------------------------------------------------

/**
 * Dispatch a browser tool invocation to the appropriate handler.
 *
 * This function:
 * 1. Normalizes the tool ID
 * 2. Extracts parameters (unwrapping kwargs if needed)
 * 3. Looks up the handler in the registry
 * 4. Calls the handler with error containment
 * 5. Logs the result
 *
 * Returns `true` if a handler was found and called, `false` otherwise.
 * Handler errors are caught and logged — they never propagate to callers.
 *
 * @param invocation - The browser tool invocation from useAgentChat
 * @param handlers - Map of tool IDs to handler functions
 * @param options - Optional dispatch configuration
 * @returns Whether a handler was found and called successfully
 */
export function dispatchBrowserTool(
  invocation: BrowserToolInvocation,
  handlers: BrowserToolHandlerMap,
  options?: DispatchOptions,
): boolean {
  const { context, knownToolIds, log = true } = options ?? {}
  const normalizedId = normalizeToolId(invocation.toolId)
  const now = Date.now()

  // Look up the handler
  const handler = handlers[normalizedId]

  if (!handler) {
    // Warn if this was a known tool without a handler (possible wiring bug)
    if (knownToolIds?.has(normalizedId)) {
      if (log) {
        logDispatch({
          toolId: invocation.toolId,
          normalizedId,
          timestamp: now,
          success: false,
          error: `Known tool but no handler registered: ${normalizedId}`,
          summary: {},
        })
      }
    }
    return false
  }

  // Execute with error containment
  try {
    const params = getBrowserToolParams(invocation.payload)
    const result = handler(params, { ...invocation, toolId: normalizedId }, context)

    // Handle async handlers
    if (result instanceof Promise) {
      result.catch((err: unknown) => {
        const errorMessage = err instanceof Error ? err.message : String(err)
        if (log) {
          logDispatch({
            toolId: invocation.toolId,
            normalizedId,
            timestamp: now,
            success: false,
            error: errorMessage,
            summary: {},
          })
        }
      })
    }

    if (log) {
      logDispatch({
        toolId: invocation.toolId,
        normalizedId,
        timestamp: now,
        success: true,
        summary: {},
      })
    }

    return true
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err)

    if (log) {
      logDispatch({
        toolId: invocation.toolId,
        normalizedId,
        timestamp: now,
        success: false,
        error: errorMessage,
        summary: {},
      })
    }

    return false
  }
}
