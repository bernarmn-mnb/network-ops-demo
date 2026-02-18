# Demo Plan: {Project Name}

> **Created**: {date}
> **Last Updated**: {date}
> **Status**: Planning | In Progress | Ready | Delivered

---

## Executive Summary

**One-liner**: {What this demo shows in one sentence}

---

## 1. Value Proposition

### Customer Context

| Field | Value |
|-------|-------|
| **Customer** | {Company name or persona} |
| **Industry** | {e.g., Retail, Finance, Healthcare} |
| **Audience** | {Who will see this demo?} |
| **Demo Type** | Customer Demo | Internal Showcase | POC | Training |

### Problem Statement

{What business problem are we solving? Be specific.}

**Pain points**:
- {Pain point 1}
- {Pain point 2}
- {Pain point 3}

### Solution

{How does Elastic solve this? What's the "aha" moment?}

**Key capabilities demonstrated**:
- {Capability 1}
- {Capability 2}
- {Capability 3}

### Differentiation

{Why Elastic vs alternatives? What's unique?}

### Success Metrics

{What does success look like for this demo?}

- [ ] {Metric 1 - e.g., "Audience understands AI search capabilities"}
- [ ] {Metric 2 - e.g., "Customer requests follow-up meeting"}
- [ ] {Metric 3 - e.g., "POC approved"}

---

## 2. Demo Scenario

### Persona

| Field | Value |
|-------|-------|
| **Name** | {e.g., "Sarah, the Product Manager"} |
| **Role** | {Job title} |
| **Goals** | {What does this persona want to achieve?} |
| **Frustrations** | {What problems do they face today?} |

### User Journey

| Step | Action | What We Show | Talking Point |
|------|--------|--------------|---------------|
| 1 | {User action} | {Feature/screen} | {Key message} |
| 2 | {User action} | {Feature/screen} | {Key message} |
| 3 | {User action} | {Feature/screen} | {Key message} |
| 4 | {User action} | {Feature/screen} | {Key message} |
| 5 | {User action} | {Feature/screen} | {Key message} |

### Demo Script

#### Opening (2 min)

{How do you set the scene? What context do you provide?}

#### Main Demo (10-15 min)

**Scene 1: {Title}**
- Action: {What you do}
- Say: "{What you say}"
- Show: {What appears on screen}

**Scene 2: {Title}**
- Action: {What you do}
- Say: "{What you say}"
- Show: {What appears on screen}

**Scene 3: {Title}**
- Action: {What you do}
- Say: "{What you say}"
- Show: {What appears on screen}

#### Closing (2 min)

{How do you wrap up? What call to action?}

### Objection Handling

| Objection | Response |
|-----------|----------|
| "{Likely question 1}" | {Your response} |
| "{Likely question 2}" | {Your response} |
| "{Likely question 3}" | {Your response} |

---

## 3. Technical Requirements

### Data

| Field | Value |
|-------|-------|
| **Source** | Existing Dataset | Generated | Sample Project |
| **Dataset** | {e.g., "Open Food Facts", "Generated products"} |
| **Index Name** | {e.g., "products", "recipes"} |
| **Record Count** | {e.g., "~500 products"} |
| **Generation Approach** | LLM | Script | N/A |

**Data fidelity requirements**:
- [ ] {Required field 1 - e.g., "Product images (working URLs)"}
- [ ] {Required field 2 - e.g., "Category hierarchy for facets"}
- [ ] {Required field 3 - e.g., "Price ranges for filtering"}

### Features

| Feature | Needed | Configuration |
|---------|--------|---------------|
| Agent Chat | Yes / No | Agent ID: {id} |
| Search UI | Yes / No | Index: {index} |
| A2A Multi-Agent | Yes / No | Agents: {list} |
| Analytics | Yes / No | Dashboard: {name} |
| Branding | Yes / No | Brand: {name} |
| Overlay Chat | Yes / No | Target site: {url} |
| Workflows | Yes / No | Recipes: {escalation, triage, etc.} |

### Branding

| Field | Value |
|-------|-------|
| **Brand Name** | {e.g., "Acme Corp"} |
| **Source URL** | {e.g., "https://acme.com"} |
| **Primary Colour** | {hex code} |
| **Logo** | {uploaded / URL / none} |
| **Theme File** | {e.g., "acmeTheme.ts"} |

### Environment

| Field | Value |
|-------|-------|
| **Elasticsearch** | Own Cluster | Shared Serverless |
| **Cloud ID** | {if applicable} |
| **Agent Builder** | Yes / No |
| **LLM Proxy** | Yes / No |
| **Deployment** | Local | Cloud Run | Other |

---

## 4. Implementation Tasks

### Beads Issues

<!-- Link beads issues here as they are created -->

| Issue | Type | Status | Blocks |
|-------|------|--------|--------|
| bd-{X}: Demo Epic | epic | {status} | - |
| bd-{X}: Data preparation | task | {status} | epic |
| bd-{X}: Basic setup | task | {status} | epic |
| bd-{X}: Branding | task | {status} | epic |
| bd-{X}: Demo guide | task | {status} | epic |
| bd-{X}: Dry run | task | {status} | epic |

### Task Breakdown

#### Phase 1: Data (Priority: High)

- [ ] Identify dataset or generation approach
- [ ] Prepare/generate data
- [ ] Index into Elasticsearch
- [ ] Verify search works

#### Phase 2: Configuration (Priority: High)

- [ ] Configure backend/.env
- [ ] Configure search settings
- [ ] Test basic functionality

#### Phase 2b: Agent Builder Setup (Priority: High, if agent chat is needed)

> **API-first**: Create agents and tools via the Kibana REST API — not the Kibana UI.
> See `hive-mind/patterns/agent-builder/AGENT_BUILDER_API_MANAGEMENT.md` for full reference.

- [ ] Create `index_search` tools for each data index the agent needs (`POST /api/agent/tools`)
- [ ] Design system prompt (persona, capabilities, tool usage instructions, output format, style)
- [ ] Create the agent (`POST /api/agent/agents`) with system prompt and tool IDs
- [ ] Test agent via API: send representative messages with `POST /api/agent/chat/test`
- [ ] Verify: profile awareness, personalisation, tool usage, response quality
- [ ] Set `AGENT_ID` in `backend/.env`
- [ ] Test via the app: `./dev test-agent` and verify chat works in the UI

#### Phase 3: Branding (Priority: Medium)

- [ ] Extract brand from website (or manual)
- [ ] Create theme file
- [ ] Apply to demo pages
- [ ] Verify look and feel

#### Phase 4a: Search Configuration (Priority: Medium)

- [ ] Hit `GET /api/search/fields` to discover available fields and `suggested_config`
- [ ] Populate `searchConfig.ts` with actual index fields (index name, search fields with boosts)
- [ ] Map display fields: title, description, image, price, badges — based on index mapping
- [ ] Configure facets from keyword fields (category, brand, status, etc.)
- [ ] Configure range filters from numeric fields (price, rating, date, etc.)
- [ ] Set sort options relevant to the domain
- [ ] Customize `demoPrompts.ts` with domain-specific suggested questions
- [ ] Set `NAV_PAGES` in `demoConfig.ts` to show only relevant pages

#### Phase 4b: Custom Pages (Priority: Medium)

- [ ] Identify 1-2 custom page concepts (from UX Design brainstorm)
- [ ] Create page component in `frontend/src/pages/`
- [ ] Compose from hooks: `useAgentChat`, `useSearchSimple`, `useA2AChat`, `ChatContainer` ref
- [ ] Add route in `App.tsx`
- [ ] Register in `NAV_PAGES` in `demoConfig.ts`
- [ ] Style with `var(--brand-*)` CSS variables and EUI components
- [ ] See `docs/CUSTOM_PAGE_PATTERNS.md` for patterns

**Visual quality (build these in, don't bolt them on later):**
- [ ] Add domain-relevant imagery: hero banners, photo strips, card thumbnails
- [ ] Design empty states with visuals and actionable prompts
- [ ] Brand the chat assistant: custom name, avatar, persona-aware greeting
- [ ] Verify fixed header offset — content not hidden behind the 56px header
- [ ] Test in dark mode — toggle theme, check for invisible text or hardcoded colours
- [ ] Visually verify via browser screenshot (see `CLAUDE.md` → Visual Verification)

#### Phase 4c: Workflows (Priority: Medium, if applicable)

> **API-first**: Create and test workflows via the REST API — not the Kibana UI.
> All workflow API calls require the extra header: `x-elastic-internal-origin: kibana`
> See `hive-mind/patterns/agent-builder/WORKFLOW_INTEGRATION.md` for full reference.

- [ ] Verify Workflows API is available: `GET /api/workflows/stats` (needs header above)
- [ ] Write workflow YAML definitions (step types: `elasticsearch.search`, `ai.agent`, `ai.prompt`, `if`, `foreach`, connectors)
- [ ] Create workflows via API: `POST /api/workflows` with `{ yaml: "..." }` body
- [ ] Test workflows via API: `POST /api/workflows/{id}/run` with `{ inputs: {...} }`
- [ ] Monitor execution: `GET /api/workflowExecutions/{execId}`
- [ ] (Optional) Expose workflows as agent tools: create tool with `type: "workflow"`, add to agent's tool_ids
- [ ] Wire escalation/action buttons into custom pages (see `docs/CUSTOM_PAGE_PATTERNS.md`)
- [ ] Add workflow demo track to `demoTracks.ts`

#### Phase 4d: Demo Guide & Narrative (Priority: Medium)

- [ ] Populate `frontend/src/config/demoTracks.ts` with demo tracks from UX Design phase
  - Each track: title, description, value proposition, 3-5 scenarios
  - Each scenario: steps, talking points, demo pills linking to custom pages
  - Narrative arc: problem → discovery → wow moment → resolution
- [ ] Set `DEMO_TITLE` and `DEMO_SUBTITLE` in `demoConfig.ts`
- [ ] Configure demo prompts in `demoPrompts.ts` that tell the story
- [ ] End-to-end walkthrough of the demo narrative following the guide page
- [ ] Full visual walkthrough: navigate every page, screenshot, verify dark mode

#### Phase 5: Testing (Priority: High)

- [ ] End-to-end test
- [ ] Edge case testing
- [ ] Dry run with audience
- [ ] Fix issues found

---

## 5. Progress Tracking

### Milestones

| Milestone | Target Date | Actual | Status |
|-----------|-------------|--------|--------|
| Data ready | {date} | | ⬜ |
| Basic demo working | {date} | | ⬜ |
| Branding applied | {date} | | ⬜ |
| Demo guide complete | {date} | | ⬜ |
| Dry run completed | {date} | | ⬜ |
| Demo delivered | {date} | | ⬜ |

### Minimum Viable Demo

**What must work for the first session**:
- [ ] {Essential 1}
- [ ] {Essential 2}
- [ ] {Essential 3}

### Next Steps

**After this session, the next priorities are**:
1. {Next priority 1}
2. {Next priority 2}
3. {Next priority 3}

### Session Log

| Date | What was done | What's next |
|------|---------------|-------------|
| {date} | {Summary of work} | {Next steps} |

---

## 6. Resources

### Documentation

- [Feature Catalog](../FEATURE_CATALOG.md)
- [Use Case Registry](../USE_CASE_REGISTRY.md)
- [Deployment Guide](../DEPLOYMENT.md)

### Patterns

- [Dataset Registry](../../hive-mind/patterns/data/DATASET_REGISTRY.md)
- [Scenario-Dataset Matrix](../../hive-mind/patterns/data/SCENARIO_DATASET_MATRIX.md)
- [Branding Extraction](../../hive-mind/patterns/branding/BRANDING_EXTRACTION_PATTERNS.md)

### Support

- Slack: #demo-starter
- Issues: `.beads/` or GitHub Issues

---

## Appendix: Sample Data

<!-- Include sample records if generated -->

```json
{
  "example": "Include 1-2 sample records here for reference"
}
```

---

*This plan was generated from the Demo Plan Template. Update it as you progress through the demo creation process.*
