# EE Support Knowledge Copilot - Demo Plan

## 1) Interview Output Contract

- Audience: mixed business and technical stakeholders.
- Delivery: local live demo.
- Timeline: customized build (2-4 hours).
- UX archetype: assistant-led support console with evidence-backed search context.

### Top 3 wow moments

1. A plain-language support question returns an actionable answer with specific maintenance context.
2. A result can be sent to the copilot in one click, and the assistant explains next steps in executive-friendly language.
3. Stakeholders can move from symptom search to a credible resolution path in under a minute.

### Main demo path(s)

1. Open the support console and run a realistic fault/support query.
2. Review ranked results with severity and equipment context.
3. Select a result and trigger "Send to Copilot".
4. Show a concise recommended resolution and business impact framing.

Expected outcome: the audience sees Elastic-based search + AI guidance as a fast path from uncertainty to action.

### Capability map and proof points

- Search + facets
  - Outcome: quickly narrow relevant incidents/procedures.
  - Proof: facet filters and ranked results with useful metadata.
- AI assistant with streaming response
  - Outcome: easier decision-making for non-specialists.
  - Proof: clear step-by-step guidance grounded in selected context.
- Config-driven demo narrative
  - Outcome: repeatable, presenter-friendly flow.
  - Proof: guide track and prompt pills align with the main path.

### Minimum bar if time runs short

- Search returns relevant support records.
- Copilot can explain a selected fault clearly.
- Demo page is visually polished and stable in light/dark mode.

### Out of scope / non-goals

- Multi-agent orchestration.
- New workflow authoring.
- New backend APIs or schema migrations.

## 2) Traceability Table

| Audience Need | Demo Moment | Evidence |
|---|---|---|
| Faster incident understanding | Query + filtered result set | Search results and facets in console |
| Trustworthy AI guidance | Send selected record to copilot | Copilot response referencing record context |
| Executive clarity | One-minute narrative path | Guide track + business-oriented talking points |

## 3) Execution Tasks

- Tune `searchConfig.ts` for maintenance/support fields and filters.
- Build `SupportKnowledgeConsolePage.tsx` with split search/chat layout.
- Register route and navigation for the new page.
- Customize assistant persona, demo prompts, and demo guide track.
- Run verification and visual QA gates.

## 4) Stability and Release Gate (to complete after build)

- [ ] `npx tsc --noEmit` passes.
- [ ] `./dev verify-template` passes.
- [ ] Main demo path executed end-to-end.
- [ ] Light/dark mode visual checks completed.
- [ ] Screenshot evidence captured for wow moments.

## 5) Value Verification (to complete after build)

- [ ] Wow moment 1 delivered.
- [ ] Wow moment 2 delivered.
- [ ] Wow moment 3 delivered.
- [ ] Ready to present tomorrow: yes/no with rationale.
