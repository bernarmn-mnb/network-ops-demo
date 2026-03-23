---
name: /opsx-apply
id: opsx-apply
category: Workflow
description: Implement tasks from an OpenSpec change (Experimental)
---

Implement tasks from an OpenSpec change.

**Read and follow `.cursor/skills/openspec-apply-change/SKILL.md`** for the core workflow (change selection, status check, apply instructions, context loading, task loop).

Then apply these **demo-starter-specific rules** in addition:

---

**Spec-Driven Build**

When implementing tasks for a demo build (proposal has "demo" in capabilities):

- **Read the gap analysis in design.md first** — it tells you what to Reuse (config-only), Modify (extend), Build New (create from scratch), and what to hide. Do not default to config-only effort on Modify or Build New items.
- **Each task references a spec file** — read the spec before implementing. The spec's GIVEN/WHEN/THEN scenarios define "done", not just the task title.
- **Browser verify after each feature** — open the page, check it against the spec scenarios, take a screenshot. This is build-time Tier 1 verification.
- **The demo-experience spec is a cross-cutting quality gate** — after every page change, check: no template artifacts visible, domain-specific content present, imagery loaded, dark mode works.

**Generating demoTracks.ts from Golden Path Specs**

When you encounter a task like "Generate demoTracks.ts from golden path specs":

1. Read `specs/golden-paths/spec.md`
2. For each `### Requirement: Golden Path N` — this becomes one `DemoTrack` entry:
   - The `**Track:**` metadata block maps to: `title`, `description`, `valueProposition`
3. For each `#### Scenario:` within a golden path — this becomes one `DemoScenario`:
   - `**Navigation:** path=X, label="Y", icon=Z` → `demoPills: [{ label: "Y", path: "X", icon: "Z" }]`
   - `**Steps:**` numbered list → `steps: ["step 1", "step 2", ...]`
   - `**Talking points:**` bullet list → `talkingPoints: ["point 1", "point 2", ...]`
   - `**Expected outcome:**` lines are for UAT only — do NOT include them in demoTracks.ts
4. Skip `#### Scenario: Fail conditions absent` — this is UAT-only, not a demo track scenario
5. Write the result to `frontend/src/config/demoTracks.ts` using the existing `DemoTrack` / `DemoScenario` types
