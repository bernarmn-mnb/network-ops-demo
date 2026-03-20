---
name: /opsx-propose
id: opsx-propose
category: Workflow
description: "Propose a demo build: coaching output + auto-inventory + gap analysis + specs + tasks"
---

Propose a new demo build. Creates a complete change with:
- proposal.md (from coaching output — replaces DEMO_PLAN.md)
- design.md (auto-inventory of component library + gap analysis)
- specs/ (qualitative experience requirements + golden path UAT scenarios)
- tasks.md (derived from gap analysis, not generic templates)

When ready to implement, run `/opsx:apply`. After build, run `/opsx:verify` for UAT.

---

**Input**: The argument after `/opsx:propose` is the change name (kebab-case), OR a description of the demo to build.

**Steps**

1. **Understand what to build**

   If no input provided, use the **AskUserQuestion tool** to ask:
   > "What demo do you want to build? Describe the customer, domain, and key experiences."

   From their description, derive a kebab-case name (e.g., "kwikfit automotive demo" → `build-kwikfit-demo`).

   **IMPORTANT**: Do NOT proceed without understanding customer, domain, and key experiences.

2. **Create the change directory**
   ```bash
   openspec new change "<name>"
   ```

3. **Create proposal.md (from coaching output)**

   Use the template at `openspec/templates/proposal-template.md` as the structure.
   Fill in all sections from the coaching conversation output: customer context, pain points,
   interview output contract, persona, user journey, demo script, impact criteria, capabilities.

   The Capabilities section is critical — it defines which spec templates to use:
   - `demo-experience` — ALWAYS include (quality contract)
   - `search-page` — if search UI is needed
   - `{custom-page-name}` — one per custom page
   - `agent-persona` — if agent chat is needed (one per agent)
   - `branding` — if customer branding is needed
   - `golden-paths` — ALWAYS include (UAT scenarios + demo guide source)
   - `data-architecture` — if multiple indexes or agents needed

4. **Auto-inventory the component library**

   Read these files to understand what the template provides:
   - `docs/COMPONENT_REGISTRY.md` — full inventory of pages, components, hooks, services
   - `docs/CUSTOM_PAGE_PATTERNS.md` — page composition patterns and UX examples
   - `frontend/src/config/searchConfig.ts` — current search configuration
   - `frontend/src/config/demoConfig.ts` — current demo configuration

   Also scan:
   - `frontend/src/pages/` — existing page components
   - `frontend/src/hooks/` — available hooks
   - `backend/app/routes/` — available backend routes

5. **Create design.md with gap analysis**

   Using the auto-inventory results and the proposal's capabilities, produce a gap analysis:

   ```markdown
   ## Reuse (config-only)
   | Component | Current State | Required Change |

   ## Modify (extend existing)
   | Component | Current State | What Changes |

   ## Build New
   | Component | Why It's New | Hooks to Compose |

   ## Not Needed (template features to hide)
   | Component | Why |
   ```

   Also include standard design.md sections: Context, Goals/Non-Goals, Decisions, Risks.
   The gap analysis makes the effort distribution visible and prevents config-only effort on complex demos.

6. **Create capability specs**

   For each capability listed in the proposal:
   - Copy the corresponding template from `openspec/templates/specs/{capability}/spec-template.md`
   - Fill in all `{placeholders}` with domain-specific values from the proposal
   - Create the file at `openspec/changes/<name>/specs/{capability}/spec.md`

   **CRITICAL for golden-paths**: Include structured metadata (Navigation, Steps, Talking Points, Expected Outcome) in each scenario. The build agent will read this to generate `demoTracks.ts`.

   **CRITICAL for demo-experience**: This spec prevents shortcuts. Every demo MUST have this spec. Requirements about domain authenticity, production feel, and no template artifacts are non-negotiable.

7. **Create tasks.md from the gap analysis**

   Derive tasks from the design.md gap analysis:
   - **Reuse items** → lightweight config tasks ("Configure searchConfig.ts for {index}")
   - **Modify items** → focused modification tasks with spec references
   - **Build New items** → full implementation tasks with spec references
   - **Not Needed items** → task to hide/remove from NAV_PAGES

   Add standard tasks:
   - "Generate demoTracks.ts from golden path specs" (agent reads specs, writes code)
   - "Run build-time browser verification for each capability"
   - "Bridge tasks to beads: `./scripts/openspec-to-beads.sh <name>`"

   Tasks reference their spec file: "Implement per specs/{capability}/spec.md"

8. **Show final status and summary**

   ```bash
   openspec status --change "<name>"
   ```

   Summarize:
   - Change name and location
   - Gap analysis summary: N reuse, N modify, N build-new, N hide
   - Specs created (list)
   - Task count by category
   - "All artifacts created! Ready for implementation with `/opsx:apply`."
   - "After build, run `/opsx:verify` for UAT golden path tests."
   - "Recommend ending this session and starting a fresh one for build execution."

**Artifact Creation Guidelines**

- Use templates from `openspec/templates/` as the starting point for all artifacts
- Fill ALL `{placeholders}` — unfilled placeholders indicate incomplete specs
- The golden-paths spec is the source for demoTracks.ts — include all Navigation/Steps/TalkingPoints metadata
- The demo-experience spec is the quality contract — never weaken or skip its requirements
- The gap analysis in design.md must be honest — if something needs building, say so

**Guardrails**
- ALWAYS create `demo-experience` and `golden-paths` specs regardless of demo complexity
- The gap analysis must read actual files (COMPONENT_REGISTRY.md, pages/, hooks/) — never guess what exists
- If the coaching conversation hasn't happened yet, do NOT proceed — the proposal needs real customer context
- If a change with that name already exists, ask if user wants to continue it or create a new one
- After creating all artifacts, recommend ending the session for context headroom
