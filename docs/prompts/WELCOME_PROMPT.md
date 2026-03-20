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

### Plan Creation overlay: OpenSpec proposal + specs

**Use `/opsx:propose` to create the full plan.** This replaces the previous DEMO_PLAN.md + beads template workflow.

The `/opsx:propose` command will:

1. **Create `proposal.md`** from the coaching conversation output (replaces DEMO_PLAN.md):
   - Uses template at `openspec/templates/proposal-template.md`
   - Captures: customer context, interview output contract, persona, user journey, demo script, impact criteria, capabilities list

2. **Auto-inventory the component library**:
   - Reads `docs/COMPONENT_REGISTRY.md`, scans pages/hooks/routes
   - Understands what the template already provides

3. **Produce gap analysis in `design.md`**:
   - Categorizes every component as: Reuse / Modify / Build New / Not Needed
   - Makes effort distribution visible (prevents config-only work on complex demos)

4. **Create capability specs** from templates in `openspec/templates/specs/`:
   - `demo-experience` — ALWAYS (quality contract preventing shortcuts)
   - `search-page` — if search UI needed
   - One `custom-page` spec per custom page
   - `agent-persona` — per agent (supports multi-agent)
   - `branding` — if customer branding needed
   - `golden-paths` — ALWAYS (UAT scenarios + demoTracks.ts source)
   - `data-architecture` — if multi-index or multi-agent

5. **Derive `tasks.md`** from the gap analysis (not from generic templates):
   - Reuse items → lightweight config tasks
   - Build New items → full implementation tasks with spec references
   - Includes: "Generate demoTracks.ts from golden path specs"

6. **Bridge to beads**: `./scripts/openspec-to-beads.sh <change-name> --epic <epic-id>`

**If beads is not available:**

The OpenSpec artifacts (proposal.md, design.md, specs/, tasks.md) serve as the complete plan.

**Handoff:**

> "The plan is saved as an OpenSpec change with {N} capability specs and {M} implementation tasks. I recommend starting a fresh session for execution — the build agent will read the specs directly. After build, run `/opsx:verify` for UAT golden path tests."

### Session boundary (IMPORTANT)

After creating the OpenSpec plan, **strongly recommend ending this session**. The three-phase flow (Plan → Build → UAT) works best with session boundaries between each phase.

Say something like:

> "The plan is saved as an OpenSpec change with {N} capability specs and {M} implementation tasks, bridged to beads. I recommend starting a fresh session for execution — the build agent will read the specs directly for full context on what the experience should be. After build, run `/opsx:verify` for UAT."
>
> "Want to stop here, or would you prefer I start executing now?"

If the user chooses to continue:
- Treat this as a new execution phase — run `bd ready` and work task-by-task
- The build agent's PRIMARY input is the OpenSpec specs (not beads checklists)
- Do NOT skip beads workflow (update status, comment progress, write close reasons)
- Generate `demoTracks.ts` from golden path specs (read structured metadata, write TypeScript)
- If you catch yourself defaulting to config-only changes, re-read the gap analysis and specs
