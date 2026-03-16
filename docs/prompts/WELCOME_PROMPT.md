# Demo Starter: New Session

> **This prompt layers demo-starter implementation details on top of the portable SA coaching framework in hive-mind.**
>
> The coaching methodology (conversation flow, archetypes, impact verification) lives in:
> `hive-mind/skills/hive-sa-coaching/references/COACHING_CONVERSATION.md`
>
> Read that first. The sections below provide demo-starter-specific context for each beat.

---

## Before You Speak

Do all of this silently before opening the conversation.

**Environment check:**
1. Run `./dev session` first for a single environment snapshot (setup, hive-mind, beads, config, customer context, session type). If it reports a partial failure, continue with the checks below and note the issue.
2. Run `./dev verify` and `./dev status` — if something's broken, fix it or report it briefly. Don't turn this into a checklist. Note: `./dev verify` may report a failure for `.setup-complete` even when the environment is functional — this is safe to ignore if other checks pass.
3. Read `backend/.env` — note `SEARCH_INDEX`, `ELASTICSEARCH_URL`, whether Agent Builder is configured (`AGENT_ID`).
4. If servers are running, hit `GET /api/search/fields` to understand what data is available. If this returns an error (e.g., index not found), note it silently — the index will be configured during plan execution.
5. Check if browser tools are available — try calling `mcp__playwright__browser_snapshot` or check for a `playwright` entry in `.mcp.json`. If browser tools are missing and branding extraction may be needed, mention that `./setup.sh` auto-configures Playwright MCP for Claude Code users.
6. If hive-mind has already been installed globally from another project on this machine, prioritize this repo's local instructions (`CLAUDE.md`, `docs/prompts/WELCOME_PROMPT.md`, `hive-mind/`) over machine-level defaults.

**Context gathering:**
7. Scan `customer-context/` for any files. If present, read them and extract: customer name, vertical, stakeholders, pain points, timeline, competitors, tech stack.
8. Check if `DEMO_PLAN.md` exists in the project root. If yes — this is a returning session. Read the plan, run `bd ready`, and resume where things left off. Skip the rest of this prompt.
9. Read the coaching framework: `hive-mind/skills/hive-sa-coaching/references/COACHING_CONVERSATION.md`

**Now begin the conversation using the coaching framework, with the overlays below.**

---

## Demo-Starter Overlays

These sections add implementation-specific details to the coaching framework's extension points. Apply them as you reach each beat in the conversation.

### Opening overlay

**Customer context location**: `customer-context/` directory (emails, notes, requirements, research).

**Returning session detection**: If `DEMO_PLAN.md` exists, this is a returning session — read the plan, run `bd ready`, and resume.

### Ideation overlay: Build paths and data options

When the coaching framework reaches "match to a build path", use these demo-starter-specific options:

| Path | Time | What You Get in Demo Starter |
|------|------|------------------------------|
| **OOTB Quick Build** | 1-2 hours | OOTB data (products, knowledge, support, stores) + follow a recipe + branding + custom agent persona |
| **OOTB + Custom Pages** | 2-4 hours | OOTB data + 1-2 custom pages + workflows + branded agent |
| **Custom Dataset** | 3-5 hours | LLM-generated data + full custom build |
| **Full Custom** | 5+ hours | Custom data + custom pages + workflows + analytics + branding extraction |

**OOTB data available** (via `backend/scripts/load_serverless_ootb.py`):
- `ootb-products` — E-commerce product catalogue (200 records)
- `ootb-knowledge` — Documentation and FAQ articles (150 records)
- `ootb-support` — Customer support tickets (150 records)
- `ootb-stores` — Store locations with geo data

**Data generation options**:
- **LLM generation** (30-100 records): Uses the LLM proxy configured in this project. See `hive-mind/patterns/data/LLM_DATA_GENERATION.md`.
- **Script generators** (100-1000+): `backend/scripts/generators/` has generators for products, documents, support tickets, stores, banking events.
- **External datasets**: Open Food Facts (grocery), Icecat (electronics). See `hive-mind/patterns/data/DATASET_REGISTRY.md`.

**Recipes** (end-to-end build guides for this template):
- `hive-mind/recipes/SEARCH_DEMO.md` — AI-powered search with Agent Builder
- `hive-mind/recipes/AGENT_BUILDER_DEMO.md` — Streaming chat assistant
- `hive-mind/recipes/ECOMMERCE_DEMO.md` — Search + analytics + conversion tracking

### Discovery overlay: Delivery options

- **Localhost** (present via screen share or in-person): Fastest. Run `./dev start`.
- **Cloud Run + IAP** (share a URL with Elastic colleagues): Deploy behind Identity-Aware Proxy. See `docs/DEPLOYMENT.md` and `deploy/deploy-cloudrun.sh`.

### Strategy overlay: Implementation specifics

**Branding**: Branding extraction is a beads task with its own acceptance criteria (see `docs/templates/BEADS_UI_TASKS.md`). During planning, note which browser tools are available (Firecrawl, Cursor browser, Playwright MCP, WebFetch) — the extraction task starts with tool discovery and uses whatever works. Never guess colors — if all automated tools fail, ask the SA for brand assets. See `.cursor/rules/branding-extraction.mdc` for the full process. The manual Brand Editor at `/brands` is a fallback for basic color-only customization.

**Workflows**: Elastic Workflows (Technical Preview, 9.3+) chain ES queries, AI agent calls, and connectors. See `hive-mind/patterns/agent-builder/WORKFLOW_INTEGRATION.md` for the pattern and `frontend/src/config/workflowRecipes.ts` for recipe examples.

**Agent setup**: Create agents and tools **via the API** — never tell the SA to "go to Kibana." See `hive-mind/patterns/agent-builder/AGENT_BUILDER_API_MANAGEMENT.md`. Sequence: create `index_search` tools → create agent with prompt and tool IDs → test with `POST /api/agent/chat/test` → set `AGENT_ID` in `backend/.env`.

### UX Design overlay: Components and hooks

When designing custom pages, reference this project's component library:

**Composable hooks**:
- `useAgentChat` — SSE streaming chat state
- `useSearchSimple` — Search with filters, pagination, aggregations
- `useA2AChat` — Multi-agent orchestration
- `ChatContainer` ref — External message triggers

**Visual design standards** (see `CLAUDE.md` → Visual Quality Standards):
- Dark mode first: use CSS variables (`var(--euiTextColor)`, `var(--euiColorLightShade)`, etc.)
- Include domain-relevant imagery: hero banners, photo strips, card thumbnails
- Brand the chat: custom name, avatar, personalised greeting
- Fixed header: 56px height, content needs explicit offset

**Custom page registration**:
1. Create component in `frontend/src/pages/`
2. Add route in `App.tsx`
3. Register in `NAV_PAGES` in `demoConfig.ts`
4. See `docs/CUSTOM_PAGE_PATTERNS.md` for full patterns

**Workflow integration in pages**:
- Escalation buttons on result cards that trigger workflows with one click
- Workflow management page for deploying and monitoring recipes
- See `docs/CUSTOM_PAGE_PATTERNS.md` for implementation patterns

### Plan Creation overlay: Beads tasks and templates

**If beads is available** (`.beads/` exists and `bd` works):

Create an epic and prioritised child tasks. Use the templates in `docs/templates/BEADS_UI_TASKS.md` for pre-written acceptance criteria covering:

1. **Contract + paths** — persist the interview output contract
2. **Data** — prepare, generate, or verify OOTB data
3. **Branding** — extract and apply customer theme
4. **Search config** — populate `searchConfig.ts` with actual index fields
5. **Agent setup** — create agent and tools via API
6. **Workflows** (if applicable) — create workflows via API
7. **Custom pages** — build domain-specific pages with hooks and visual standards
8. **Demo config** — set `NAV_PAGES`, `DEMO_TITLE`, `DEMO_SUBTITLE` in `demoConfig.ts`
9. **Demo guide** — populate `demoTracks.ts` with narrative from UX Design
10. **Demo prompts** — customize `demoPrompts.ts` with domain-specific questions
11. **Stability testing** — all pages load, search returns results, chat responds, no console errors
12. **Value verification** — 3-pass verification per `hive-mind/skills/hive-sa-coaching/references/IMPACT_VERIFICATION.md`
13. **Release gate** — final pass/fail with evidence
    - `./dev verify-template` passes
    - `npx tsc --noEmit` passes
    - Screenshots captured for wow moments
14. If Cloud Run delivery was chosen, add deployment tasks

Link child tasks to the epic. Set priorities based on the timeline. Add dependencies so the release gate cannot complete before stability and value verification.

**If beads is not available:**

Use the portable template from `hive-mind/skills/hive-sa-coaching/references/DEMO_PLAN_TEMPLATE.md`, extended with the implementation tasks above. Copy it to `DEMO_PLAN.md` in the project root.

**Handoff:**

> "The plan is saved. Next time you open a session, I'll pick up where we left off — just run `bd ready` or I'll read the demo plan automatically."

### Session boundary (IMPORTANT)

After creating the beads plan, **strongly recommend ending this session**. A single session that does coaching + branding + page building + agent setup + verification will exhaust context and start cutting corners. Splitting sessions keeps each execution task focused with full context headroom.

Say something like:

> "The plan is saved with {N} tasks in beads. I recommend starting a fresh session for execution — that gives me full context headroom for each task instead of rushing through everything in one go. When you open the next session, I'll automatically detect the plan and run `bd ready` to pick up where we left off."
>
> "Want to stop here, or would you prefer I start executing now?"

If the user chooses to continue:
- Treat this as a new execution phase — run `bd ready` and work task-by-task
- Do NOT skip beads workflow (update status, comment progress, write close reasons)
- If you catch yourself rushing or cutting corners, pause and tell the user
