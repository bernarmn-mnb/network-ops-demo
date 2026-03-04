# Beads UI Task Templates

> Pre-written task templates for the build agent to copy when creating UI work items.
> Each template includes acceptance criteria so the agent knows what "done" looks like.
>
> **Usage**: When creating beads issues during Plan Creation, copy the relevant template
> below and fill in the `{placeholders}` with domain-specific values.

---

## Configure searchConfig.ts

```
bd create "Configure searchConfig.ts for {domain}" \
  --type task \
  --priority 1 \
  --acceptance "- [ ] index set to actual index name (not template default)
- [ ] fields.search populated with domain text fields and appropriate boosts
- [ ] display.title, display.description mapped to real fields
- [ ] display.image mapped (if image URLs exist in data)
- [ ] display.badges mapped to keyword fields that add context
- [ ] facets render in sidebar and produce non-empty buckets
- [ ] range filters work with correct min/max/step for the data
- [ ] sort options include domain-relevant fields
- [ ] results display correctly with actual data (no missing fields)"
```

---

## Capture interview output contract

> Create this immediately after strategy/UX agreement and before implementation.
> This task locks outcomes and rationale, not implementation shape.

```
bd create "Capture interview output contract for {domain}" \
  --type task \
  --priority 1 \
  --acceptance "- [ ] Target audience and stakeholder(s) recorded in DEMO_PLAN.md
- [ ] Top 3 wow moments captured and ordered by narrative arc
- [ ] 1-3 main demo paths defined with exact actions and expected outcomes
- [ ] UX archetype selected and justified for this use case
- [ ] 2-4 Elastic capabilities mapped to concrete audience outcomes and proof points
- [ ] Minimum bar for impact documented
- [ ] Out-of-scope / non-goals documented
- [ ] Delivery method and timeline confirmed
- [ ] Scope freeze acknowledged before build execution starts"
```

---

## Build custom page: {PageName}

```
bd create "Build custom page: {PageName}" \
  --type feature \
  --priority 2 \
  --acceptance "- [ ] Page component created in frontend/src/pages/{PageName}Page.tsx
- [ ] Route added in App.tsx at /{page-path}
- [ ] Page path added to NAV_PAGES in demoConfig.ts
- [ ] Hooks connected: {list hooks — useAgentChat, useSearchSimple, useA2AChat}
- [ ] Data flows end-to-end (search returns results, chat responds, etc.)
- [ ] Styled with var(--brand-*) CSS variables (no hardcoded colours)
- [ ] Uses EUI components for layout
- [ ] Responsive at mobile and desktop widths
- [ ] Works with actual indexed data (not mock data)
- [ ] Any new EUI icons verified against icon cache before use
VISUAL QUALITY (see CLAUDE.md Visual Quality Standards):
- [ ] Page includes domain-relevant imagery (hero banners, photos, thumbnails — not text-only)
- [ ] Empty states have visual elements and actionable prompts
- [ ] Chat assistant has a custom name, avatar, and personalised greeting (if page has chat)
- [ ] Content not hidden behind fixed header (visually verified in browser)
- [ ] Dark mode tested — toggle theme and confirm no invisible text or broken colours
- [ ] Visually verified via browser screenshot before marking complete"
```

---

## Customize demoPrompts.ts

```
bd create "Customize demoPrompts for {domain}" \
  --type task \
  --priority 2 \
  --acceptance "- [ ] All prompts are domain-specific (not generic template text)
- [ ] Prompts tell a story: problem discovery → search → chat → resolution
- [ ] At least 3-4 suggested prompts that showcase different capabilities
- [ ] Prompts trigger expected agent behaviours (tool calls, search, recommendations)
- [ ] Prompts work with the actual indexed data and configured agent"
```

---

## Populate DemoGuidePage

> **Key file**: `frontend/src/config/demoTracks.ts` — this is where demo tracks live (not in the page component).
> The UX Design conversation already produced the narrative — this task structures it into `DemoTrack[]` format.

```
bd create "Populate DemoGuidePage for {domain}" \
  --type task \
  --priority 2 \
  --acceptance "VALUE PROP TRACEABILITY (every claim must have a demo moment):
- [ ] Each pain point from DEMO_PLAN.md Section 1 maps to a specific demo interaction
- [ ] Each wow moment from Impact Criteria has a corresponding scenario step
- [ ] Each audience-specific hook is surfaced in a talking point
- [ ] Traceability table in DEMO_PLAN.md Section 2 is fully populated (no empty rows)
DEMO GUIDE CONTENT:
- [ ] demoTracks.ts has 1-3 domain-specific tracks (not template defaults)
- [ ] Each track has title, description, valueProposition, and 3-5 scenarios
- [ ] Each scenario has steps (what to do), talkingPoints (what to say), and demoPills (where to navigate)
- [ ] Track narrative follows: problem → search/chat → wow moment → resolution
- [ ] Talking points reference actual features and custom pages built in this demo
- [ ] Demo pills link to correct routes (custom pages, search, chat)
- [ ] DEMO_TITLE and DEMO_SUBTITLE set in demoConfig.ts
- [ ] Guide page renders correctly with branding applied
- [ ] Visually verified via browser screenshot"
```

---

## Set demoConfig.ts

```
bd create "Configure demoConfig.ts for {domain}" \
  --type task \
  --priority 1 \
  --acceptance "- [ ] NAV_PAGES filtered to show only pages relevant to this demo
- [ ] DEMO_TITLE set to domain-specific title
- [ ] DEMO_SUBTITLE set to a one-liner explaining the demo's value
- [ ] Navigation shows correct pages in the header
- [ ] Hidden pages are not accessible via direct URL (or acceptable if they are)"
```

---

## End-to-end demo walkthrough

```
bd create "End-to-end demo walkthrough" \
  --type task \
  --priority 1 \
  --acceptance "- [ ] All pages load without console errors
- [ ] Search returns results with correct display fields
- [ ] Facets filter correctly and update result counts
- [ ] Chat responds with domain-relevant answers
- [ ] Custom page(s) function as designed
- [ ] Branding is applied consistently across all visible pages
- [ ] Demo prompts trigger the expected demo narrative
- [ ] No broken images, missing data, or placeholder text visible
- [ ] Dark mode: toggle theme on every page — no invisible text, broken borders, or hardcoded colours
- [ ] Each page visually verified via browser screenshot (not just TypeScript compilation)
- [ ] Chat assistant has branded name, avatar, and persona-aware greeting
- [ ] Empty states on all pages have visual weight (not bare text)"
```

---

## Golden path smoke test + release gate

> Run this after stability testing and value verification. This is the final readiness gate.
> Pass criteria are outcome-based and should work for any demo shape (analytics, search, agentic, workflow, etc.).

```
bd create "Golden path smoke test + release gate" \
  --type task \
  --priority 1 \
  --acceptance "- [ ] Main demo path(s) from DEMO_PLAN.md executed end-to-end
- [ ] For each path: expected outcome achieved and fail conditions absent
- [ ] No P0/P1 defects on any main path
- [ ] ./dev verify-template passes
- [ ] npx tsc --noEmit passes
- [ ] Console/network checked during walkthrough (no blocking errors)
- [ ] Screenshot evidence captured for each wow moment
- [ ] Final readiness verdict recorded in DEMO_PLAN.md (present tomorrow: yes/no with rationale)"
```

---

## Create Agent Builder agent via API

```
bd create "Create Agent Builder agent for {domain}" \
  --type task \
  --priority 1 \
  --acceptance "- [ ] index_search tools created via POST /api/agent/tools for each data index
- [ ] System prompt designed with: persona, tool usage instructions, output format, conversation style
- [ ] Agent created via POST /api/agent/agents with prompt and tool IDs
- [ ] Agent tested via POST /api/agent/chat/test with representative messages
- [ ] Agent looks up customer/user profile on first greeting
- [ ] Agent uses search tools to find domain-relevant results
- [ ] Agent response quality verified: correct tone, formatting, personalisation
- [ ] AGENT_ID set in backend/.env
- [ ] Chat works via the app UI (./dev test-agent passes)"
```

> **IMPORTANT**: Create agents and tools via the API, not the Kibana UI.
> See `hive-mind/patterns/agent-builder/AGENT_BUILDER_API_MANAGEMENT.md`.

---

## Create and test workflows via API

```
bd create "Create workflows for {domain}" \
  --type task \
  --priority 2 \
  --acceptance "- [ ] Workflow YAML authored with correct step types and template syntax
- [ ] Workflow created via POST /api/workflows with yaml body
- [ ] Workflow tested via POST /api/workflows/{id}/run with sample inputs
- [ ] Workflow execution monitored via GET /api/workflowExecutions/{execId}
- [ ] (If agent tool) workflow tool created and added to agent's tool_ids
- [ ] Workflow results are correct and useful for the demo scenario"
```

> **IMPORTANT**: Workflows require header `x-elastic-internal-origin: kibana` on all API calls.
> See `hive-mind/patterns/agent-builder/WORKFLOW_INTEGRATION.md`.

---

## Value verification against plan

> **When**: After stability testing passes. This is the final quality gate before the SA returns.
> **Philosophy**: "Does it work?" is necessary but not sufficient. This checks "does it land?"

```
bd create "Value verification: does the demo deliver on the value proposition?" \
  --type task \
  --priority 1 \
  --acceptance "PASS 1 — API FLOW SIMULATION (fast, catches content/logic gaps):
- [ ] Re-read Impact Criteria and Wow Moments from DEMO_PLAN.md Section 1
- [ ] Hit search API with each demo prompt — results are relevant and high-quality
- [ ] Hit chat API with demo scenario messages — agent persona, tone, and tool usage match design
- [ ] Walk the full demo scenario via API calls in sequence (simulating what the UI would do)
- [ ] Happy path has no empty results, errors, or generic fallback responses
- [ ] Workflow APIs return correct outputs (if applicable)
PASS 2 — BROWSER WALKTHROUGH (visual, catches experience gaps):
- [ ] Navigate each page following demo guide track order
- [ ] Screenshot each key moment and each defined wow moment
- [ ] Branding consistent and professional throughout
- [ ] Imagery loads and is domain-relevant (not placeholders)
- [ ] Chat greeting is personalised and on-brand
- [ ] Transitions between demo scenes feel natural
- [ ] Dark and light mode both polished
PASS 3 — IMPACT GAP ANALYSIS (the 'would this land?' check):
- [ ] Each wow moment from Impact Criteria verified as delivered, partial, or missing
- [ ] Each audience-specific hook verified
- [ ] Traceability table checked — every row has a working demo moment
- [ ] Gaps categorised: auto-fix (apply immediately) or consult-SA (flag for review)
- [ ] Auto-fixes applied: prompt tweaks, config, copy, images, sort order
- [ ] Issues for SA review documented with clear description of the gap
- [ ] Overall assessment recorded in DEMO_PLAN.md Section 5: verdict, confidence, honest answer to 'would you present this tomorrow?'"
```

> **Auto-fix vs. Consult SA decision framework:**
> - **Auto-fix** (do it now): Prompt wording, config values, copy/text, missing images, sort order,
>   facet labels, demo prompt phrasing, CSS tweaks — anything that doesn't change the agreed narrative
> - **Consult SA** (flag for review): New pages, different data, changed narrative flow, additional features,
>   removing agreed wow moments, significant persona changes — anything that changes the plan

---

## Notes for Build Agents

- Create these tasks during the **Plan Creation** beat of the consultation
- Link all tasks to the demo epic with `bd dep add`
- Tasks should be created in dependency order: agent setup before custom pages, searchConfig before custom pages, demoConfig before walkthrough, stability testing before value verification
- Always run `bd ready` after creating tasks to verify the dependency graph
- Reference `docs/CUSTOM_PAGE_PATTERNS.md` when working on custom page tasks
- **Never tell the user to "go to Kibana"** for agent or workflow setup — use the API. See `hive-mind/patterns/agent-builder/AGENT_BUILDER_API_MANAGEMENT.md` and `WORKFLOW_INTEGRATION.md`
- **Always test agents and workflows via API** before wiring up the UI — catch prompt issues early
