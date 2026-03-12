import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  normalizeToolId,
  getBrowserToolParams,
  dispatchBrowserTool,
  getBrowserToolLog,
} from './browserToolDispatch'
import type { BrowserToolInvocation, BrowserToolHandlerMap } from '../types/browserTools'

// ---------------------------------------------------------------------------
// normalizeToolId
// ---------------------------------------------------------------------------

describe('normalizeToolId', () => {
  it('converts underscore prefix to dotted form', () => {
    expect(normalizeToolId('browser_show_results')).toBe('browser.show_results')
  })

  it('preserves already-dotted form', () => {
    expect(normalizeToolId('browser.show_results')).toBe('browser.show_results')
  })

  it('collapses double browser_ prefix', () => {
    expect(normalizeToolId('browser_browser_foo')).toBe('browser.foo')
  })

  it('passes through non-browser IDs unchanged', () => {
    expect(normalizeToolId('some_other_tool')).toBe('some_other_tool')
  })

  it('handles browser_ with no action', () => {
    expect(normalizeToolId('browser_')).toBe('browser.')
  })
})

// ---------------------------------------------------------------------------
// getBrowserToolParams
// ---------------------------------------------------------------------------

describe('getBrowserToolParams', () => {
  it('unwraps kwargs when it is the only key', () => {
    expect(getBrowserToolParams({ kwargs: { query: 'shoes' } })).toEqual({ query: 'shoes' })
  })

  it('does NOT unwrap kwargs when sibling keys exist', () => {
    const input = { kwargs: { query: 'shoes' }, extra: true }
    expect(getBrowserToolParams(input)).toBe(input)
  })

  it('does NOT unwrap kwargs: null', () => {
    const input = { kwargs: null }
    expect(getBrowserToolParams(input)).toBe(input)
  })

  it('does NOT unwrap kwargs when it is an array', () => {
    const input = { kwargs: [1, 2, 3] }
    expect(getBrowserToolParams(input)).toBe(input)
  })

  it('returns primitives as-is', () => {
    expect(getBrowserToolParams('hello')).toBe('hello')
    expect(getBrowserToolParams(42)).toBe(42)
    expect(getBrowserToolParams(null)).toBe(null)
    expect(getBrowserToolParams(undefined)).toBe(undefined)
  })

  it('returns arrays as-is', () => {
    const arr = [1, 2]
    expect(getBrowserToolParams(arr)).toBe(arr)
  })

  it('returns plain objects without kwargs as-is', () => {
    const obj = { query: 'shoes' }
    expect(getBrowserToolParams(obj)).toBe(obj)
  })
})

// ---------------------------------------------------------------------------
// dispatchBrowserTool
// ---------------------------------------------------------------------------

describe('dispatchBrowserTool', () => {
  const makeInvocation = (toolId: string, payload: unknown = {}): BrowserToolInvocation => ({
    toolId,
    toolCallId: 'call-123',
    payload,
    timestamp: Date.now(),
  })

  beforeEach(() => {
    // Clear the dispatch log between tests
    while (getBrowserToolLog().length > 0) {
      ;(getBrowserToolLog() as unknown as unknown[]).shift()
    }
  })

  it('returns true and calls handler when matched', () => {
    const handler = vi.fn()
    const handlers: BrowserToolHandlerMap = { 'browser.show_results': handler }
    const inv = makeInvocation('browser.show_results', { query: 'test' })

    const result = dispatchBrowserTool(inv, handlers)

    expect(result).toBe(true)
    expect(handler).toHaveBeenCalledOnce()
    expect(handler.mock.calls[0][0]).toEqual({ query: 'test' })
  })

  it('returns false when no handler matches', () => {
    const handlers: BrowserToolHandlerMap = {}
    const inv = makeInvocation('browser.unknown')

    expect(dispatchBrowserTool(inv, handlers, { log: false })).toBe(false)
  })

  it('contains sync handler errors and returns false', () => {
    const handlers: BrowserToolHandlerMap = {
      'browser.boom': () => { throw new Error('sync bang') },
    }
    const inv = makeInvocation('browser.boom')

    expect(dispatchBrowserTool(inv, handlers)).toBe(false)
  })

  it('contains async handler errors without crashing', async () => {
    const handlers: BrowserToolHandlerMap = {
      'browser.async_boom': () => Promise.reject(new Error('async bang')),
    }
    const inv = makeInvocation('browser.async_boom')

    // Should return true (handler was found) — error is caught asynchronously
    expect(dispatchBrowserTool(inv, handlers)).toBe(true)

    // Let the microtask queue flush so the .catch handler runs
    await new Promise(resolve => setTimeout(resolve, 0))
  })

  it('normalizes underscore IDs when looking up handlers', () => {
    const handler = vi.fn()
    const handlers: BrowserToolHandlerMap = { 'browser.show_results': handler }
    const inv = makeInvocation('browser_show_results')

    expect(dispatchBrowserTool(inv, handlers)).toBe(true)
    expect(handler).toHaveBeenCalledOnce()
  })

  it('unwraps kwargs before passing to handler', () => {
    const handler = vi.fn()
    const handlers: BrowserToolHandlerMap = { 'browser.search': handler }
    const inv = makeInvocation('browser.search', { kwargs: { q: 'test' } })

    dispatchBrowserTool(inv, handlers)

    expect(handler.mock.calls[0][0]).toEqual({ q: 'test' })
  })

  it('logs known-but-unhandled tools as errors', () => {
    const handlers: BrowserToolHandlerMap = {}
    const inv = makeInvocation('browser.missing')

    dispatchBrowserTool(inv, handlers, {
      knownToolIds: new Set(['browser.missing']),
    })

    const log = getBrowserToolLog()
    const last = log[log.length - 1]
    expect(last.success).toBe(false)
    expect(last.error).toContain('Known tool but no handler')
  })
})
