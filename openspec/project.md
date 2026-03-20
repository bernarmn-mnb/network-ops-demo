# Project Context: elastic-demo-starter

## Overview

A reusable template for building Elastic-powered demo applications. Each clone is customised per customer demo with domain-specific data, branding, search configuration, and AI agent personas.

## Tech Stack

- **Frontend**: Vite + React 18 + EUI 110 + TypeScript
- **Backend**: Python 3.11+ FastAPI
- **Styling**: EUI components + Tailwind CSS (where EUI doesn't cover)
- **Search**: Elasticsearch via official `elasticsearch-py` client
- **AI Agent**: Elastic Agent Builder (SSE streaming via backend proxy)
- **Observability**: OpenTelemetry (browser SDK + FastAPI instrumentation)
- **Deployment**: Google Cloud Run with sidecar containers + IAP

## Key Configuration Files

| File | Purpose |
|------|---------|
| `frontend/src/config/searchConfig.ts` | Search index, field mappings, facets, display rules |
| `frontend/src/config/demoConfig.ts` | Navigation, demo title/subtitle, visible pages |
| `frontend/src/config/demoTracks.ts` | Demo guide scenarios, talking points, navigation pills |
| `frontend/src/config/demoPrompts.ts` | Suggested chat/search prompts |
| `backend/.env` | Elasticsearch URL, API key, search index, agent ID |
| `frontend/src/branding/{brand}Theme.ts` | Brand themes (colours, fonts, gradients) |

## Architecture Conventions

- Every FastAPI route lives in its own file under `backend/app/routes/`
- Frontend pages are in `frontend/src/pages/`, one component per file
- Routes are registered in `frontend/src/App.tsx` inside `<Route element={<Layout />}>`
- Pages do NOT import or render AppHeader (Layout wrapper handles this)
- All EUI icons must be registered in `frontend/src/iconCache.ts`
- Use CSS variables for theme-dependent colours, never hardcode hex values
- Use `var(--brand-*)` CSS variables for brand-specific styling
- Backend proxy routes keep API keys secure; never call Kibana directly from frontend

## Composable Hooks

| Hook | Purpose |
|------|---------|
| `useAgentChat` | SSE streaming chat state for Agent Builder |
| `useSearchSimple` | Search with filters, pagination, aggregations |
| `useA2AChat` | Multi-agent orchestration |

## Testing & Verification

- `./dev verify-template` — structural integrity checks (routes, contracts, builds)
- `npx tsc --noEmit` — TypeScript compilation check
- Visual verification via browser tools is mandatory for UI changes
- `./dev test-agent` — Agent Builder connectivity test

## Naming Conventions

- Frontend components: PascalCase (`SearchPageSimple.tsx`)
- Backend routes: snake_case files (`search.py`, `branding.py`)
- Config files: camelCase (`searchConfig.ts`, `demoConfig.ts`)
- OpenSpec changes: kebab-case (`add-search-page`, `configure-branding`)
- Beads issues: auto-generated IDs (`elastic-agent-starter-abc`)

## External Dependencies

- Elasticsearch cluster (configured via `backend/.env`)
- Elastic Agent Builder (optional, for AI chat features)
- LLM proxy at `https://litellm-proxy-service-*.run.app/v1` (OpenAI-compatible)
- Hive Mind submodule at `./hive-mind` (patterns, skills, recipes)
