/**
 * Browser tools for the main Chat page — registered with Agent Builder on each request.
 *
 * Agent Builder tool `name` uses underscores; the stream normalizes to `browser.*` for dispatch.
 */

import type { BrowserApiTool } from '../types/browserTools'

/** Normalized handler id (after normalizeToolId). */
export const BROWSER_SHOW_SOURCE_LINKS_ID = 'browser.show_source_links'

/**
 * Sent once per conversation (first message) — reinforces Sources panel + tool usage.
 */
export const CHAT_SOURCES_PROFILE_CONTEXT =
  'This chat UI has a **Sources** column: whenever your answer is grounded in specific web pages you retrieved, populate it by calling the **browser_show_source_links** client tool with real https URLs (not invented links).'

/**
 * Sent on **every** user message from ChatPage — keeps browser tool top-of-mind for the model.
 */
export const CHAT_SOURCES_MODE_CONTEXT = `[Sources panel — required when you have URLs]
After you answer using retrieved pages, call **browser_show_source_links** once with:
• **header**: short CTA (e.g. "Verify on example.com")
• **intro** (optional): one sentence on what you searched or concluded
• **links**: 2–5 items, each with **url** (https), optional **title**, and **description** (one line)
Use only URLs you actually used from search/RAG. If you have no concrete URLs, skip the tool.`

export interface SourceLinkItem {
  url: string
  /** Optional label; UI falls back to hostname. */
  title?: string
  /** Short line under the link (e.g. why it matters for the answer). */
  description?: string
}

export interface SourceLinksPayload {
  header: string
  intro?: string
  links: SourceLinkItem[]
}

/**
 * Allow-list for source link protocols.
 *
 * The model is told to send `https` URLs only (see `CHAT_SOURCES_MODE_CONTEXT`
 * above), and the Sources panel will be embedded in pages that may be served
 * over https. Allowing `http:` URLs through would invite mixed-content errors
 * and undermines the prompt contract, so we enforce `https:` only.
 */
function isAllowedHttpUrl(href: string): boolean {
  try {
    const u = new URL(href)
    return u.protocol === 'https:'
  } catch {
    return false
  }
}

/**
 * Parse and validate browser tool payload from the agent.
 * Returns null if nothing usable (handler should no-op).
 */
export function parseSourceLinksPayload(raw: unknown): SourceLinksPayload | null {
  if (raw == null || typeof raw !== 'object') return null
  const o = raw as Record<string, unknown>

  const headerRaw =
    (typeof o.header === 'string' && o.header.trim()) ||
    (typeof o.title === 'string' && o.title.trim()) ||
    (typeof o.panel_header === 'string' && o.panel_header.trim()) ||
    'Sources'

  const intro =
    (typeof o.intro === 'string' && o.intro.trim()) ||
    (typeof o.panel_intro === 'string' && o.panel_intro.trim()) ||
    (typeof o.subtitle === 'string' && o.subtitle.trim()) ||
    undefined

  const rawLinks = o.links
  if (!Array.isArray(rawLinks) || rawLinks.length === 0) return null

  const links: SourceLinkItem[] = []
  for (const item of rawLinks) {
    if (item == null || typeof item !== 'object') continue
    const li = item as Record<string, unknown>
    const url = typeof li.url === 'string' ? li.url.trim() : ''
    if (!url || !isAllowedHttpUrl(url)) continue
    const title = typeof li.title === 'string' ? li.title.trim() : undefined
    const description = typeof li.description === 'string' ? li.description.trim() : ''
    links.push({ url, title, description: description || undefined })
  }

  if (links.length === 0) return null
  return { header: headerRaw, intro, links }
}

/** Tool definition sent to Kibana Agent Builder (`browser_api_tools`). */
export const SHOW_SOURCE_LINKS_BROWSER_TOOL: BrowserApiTool = {
  id: 'browser_show_source_links',
  description:
    'REQUIRED whenever your reply cites specific https URLs from search/RAG. Pushes those links into the ' +
    'demo **Sources** side panel so the audience can click them (new tab). Call **in the same turn** as your ' +
    'answer. Pass header (CTA title), optional intro (one line), and links[] with url + short description per row. ' +
    '2–5 links typical. Omit only if you truly have no URLs to show.',
  schema: {
    type: 'object',
    properties: {
      header: {
        type: 'string',
        description: 'Panel title or call to action (e.g. “Sources for this answer”).',
      },
      title: {
        type: 'string',
        description: 'Alias for header if you prefer the word “title”.',
      },
      intro: {
        type: 'string',
        description: 'Optional short context under the header (e.g. what was searched or summarized).',
      },
      links: {
        type: 'array',
        description: 'List of sources to display as clickable links.',
        items: {
          type: 'object',
          properties: {
            url: { type: 'string', description: 'Full https URL (http is rejected).' },
            title: { type: 'string', description: 'Optional link label.' },
            description: {
              type: 'string',
              description: 'Short line shown under the link (recommended for each item).',
            },
          },
          required: ['url'],
        },
      },
    },
    required: ['links'],
  },
}
