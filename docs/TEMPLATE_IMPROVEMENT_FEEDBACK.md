# Demo Template Improvement Feedback

## Context

This document captures practical improvements to make future demo builds easier, faster, and higher quality when executed by AI coding agents and human SAs.

Primary goals:

- Reduce manual multi-file wiring during initial setup.
- Shorten time-to-first-wow-moment.
- Increase consistency of story quality and visual polish.
- Minimize regressions through stronger automation.

## Current Friction Points Observed

1. New demos still require repeated edits across route, nav, config, prompts, and tracks.
2. Field mapping from a live index to `searchConfig.ts` is partly manual and error-prone.
3. Story scaffolding (persona, prompts, guide track) starts from generic defaults.
4. Visual QA is mandatory but mostly manual.
5. Registry/docs maintenance can lag behind implementation (for example, new pages not reflected in registry).

## Recommendations (Prioritized)

### P1 - High Impact, Low/Medium Effort

1. **Blueprint starter packs**
   - Ship 3-5 domain blueprints (industrial support, retail advisor, policy navigator, etc.).
   - Each blueprint includes:
     - `searchConfig` baseline
     - persona defaults
     - prompt pills
     - demo track skeleton
     - one custom page scaffold
   - Benefit: reduces cold-start design and implementation time.

2. **Single command scaffold generator**
   - Add a command:
     - `./dev scaffold-demo --blueprint industrial-support --name ee`
   - Auto-generates:
     - page file
     - route registration
     - nav entry
     - demo metadata
     - prompt and track templates
   - Benefit: removes repetitive wiring and prevents missed files.

3. **Auto-generate search config from live mappings**
   - Add:
     - `./dev generate-search-config --from-live-index`
   - Source data from `GET /api/search/fields` and produce:
     - field boosts
     - display mappings
     - facets and range filters
     - initial sort options
   - Benefit: faster correctness for new datasets.

4. **Story contract bootstrapping**
   - Add:
     - `./dev init-demo-plan`
   - Generates `DEMO_PLAN.md` from an interview-style prompt:
     - audience
     - wow moments
     - main path
     - minimum bar
     - out-of-scope
   - Benefit: better story quality before code starts.

### P2 - Medium Impact, Medium Effort

5. **Unified page registry as source of truth**
   - Maintain one structured registry (JSON/TS) and generate:
     - nav config entries
     - route declarations (or route validation stubs)
     - component registry checks
   - Benefit: fewer config drifts and easier page lifecycle management.

6. **Built-in visual QA command**
   - Add:
     - `./dev verify-ui --routes /support-console,/guide,/chat`
   - Automate:
     - screenshots (light/dark)
     - header overlap checks
     - contrast and empty-state checks
     - console error capture
   - Benefit: consistent release quality gates.

7. **Persona presets by audience type**
   - Add presets:
     - `exec`, `mixed`, `technical`
   - Automatically tune:
     - greeting style
     - prompt wording
     - response verbosity expectations
   - Benefit: better audience fit with less manual tuning.

### P3 - Strategic Improvements

8. **Workflow action stubs on result cards**
   - Template-level optional pattern for:
     - "Escalate"
     - "Run diagnostic workflow"
     - "Create summary report"
   - Benefit: turns insight demos into action demos with minimal extra code.

9. **Golden path test harness for custom pages**
   - Standardized smoke test helper for:
     - search returns results
     - CTA triggers chat context handoff
     - tab/interaction sanity
     - no console errors
   - Benefit: reduces regressions as demos evolve quickly.

## Proposed Implementation Roadmap

### Phase 1 (Fast Wins, 1-2 weeks)

- Blueprint starter packs (initial 3).
- Scaffold command MVP.
- Search config generation MVP.

### Phase 2 (Quality Automation, 1-2 weeks)

- Visual QA command with screenshot outputs.
- Persona preset integration.
- Strengthen registry checks for new page detection.

### Phase 3 (Scale and Reuse, 2+ weeks)

- Unified registry generation workflow.
- Workflow action stub library.
- Golden path test harness for custom pages.

## Success Metrics

- Time to first custom page demo-ready:
  - Target: reduce by 30-50%.
- Manual file-touch count per new demo:
  - Target: reduce by 40%+.
- First-pass verification success rate:
  - Target: increase to 90%+ for `tsc`, template verify, and basic visual QA.
- Story completeness at implementation start:
  - Target: all demos begin with a populated `DEMO_PLAN.md` contract.

## Suggested Beads Breakdown

1. Create blueprint starter packs.
2. Implement `./dev scaffold-demo`.
3. Implement `./dev generate-search-config`.
4. Add `./dev init-demo-plan`.
5. Add `./dev verify-ui`.
6. Add persona preset system.
7. Build unified page registry improvements.

## Review Notes

- Document owner: demo template maintainers.
- Reviewers: SA/demo builders, frontend maintainer, backend maintainer, AI workflow maintainer.
- Decision needed:
  - Prioritize Phase 1 items for next sprint.
