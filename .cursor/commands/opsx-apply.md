---
name: /opsx-apply
id: opsx-apply
category: Workflow
description: Implement tasks from an OpenSpec change (Experimental)
---

Implement tasks from an OpenSpec change.

**Input**: Optionally specify a change name (e.g., `/opsx:apply add-auth`). If omitted, check if it can be inferred from conversation context. If vague or ambiguous you MUST prompt for available changes.

**Steps**

1. **Select the change**

   If a name is provided, use it. Otherwise:
   - Infer from conversation context if the user mentioned a change
   - Auto-select if only one active change exists
   - If ambiguous, run `openspec list --json` to get available changes and use the **AskUserQuestion tool** to let the user select

   Always announce: "Using change: <name>" and how to override (e.g., `/opsx:apply <other>`).

2. **Check status to understand the schema**
   ```bash
   openspec status --change "<name>" --json
   ```
   Parse the JSON to understand:
   - `schemaName`: The workflow being used (e.g., "spec-driven")
   - Which artifact contains the tasks (typically "tasks" for spec-driven, check status for others)

3. **Get apply instructions**

   ```bash
   openspec instructions apply --change "<name>" --json
   ```

   This returns:
   - Context file paths (varies by schema)
   - Progress (total, complete, remaining)
   - Task list with status
   - Dynamic instruction based on current state

   **Handle states:**
   - If `state: "blocked"` (missing artifacts): show message, suggest using `/opsx:continue`
   - If `state: "all_done"`: congratulate, suggest archive
   - Otherwise: proceed to implementation

4. **Read context files**

   Read the files listed in `contextFiles` from the apply instructions output.
   The files depend on the schema being used:
   - **spec-driven**: proposal, specs, design, tasks
   - Other schemas: follow the contextFiles from CLI output

5. **Show current progress**

   Display:
   - Schema being used
   - Progress: "N/M tasks complete"
   - Remaining tasks overview
   - Dynamic instruction from CLI

6. **Implement tasks (loop until done or blocked)**

   For each pending task:
   - Show which task is being worked on
   - Make the code changes required
   - Keep changes minimal and focused
   - Mark task complete in the tasks file: `- [ ]` → `- [x]`
   - Continue to next task

   **Pause if:**
   - Task is unclear → ask for clarification
   - Implementation reveals a design issue → suggest updating artifacts
   - Error or blocker encountered → report and wait for guidance
   - User interrupts

7. **On completion or pause, show status**

   Display:
   - Tasks completed this session
   - Overall progress: "N/M tasks complete"
   - If all done: suggest archive
   - If paused: explain why and wait for guidance

**Output During Implementation**

```
## Implementing: <change-name> (schema: <schema-name>)

Working on task 3/7: <task description>
[...implementation happening...]
✓ Task complete

Working on task 4/7: <task description>
[...implementation happening...]
✓ Task complete
```

**Output On Completion**

```
## Implementation Complete

**Change:** <change-name>
**Schema:** <schema-name>
**Progress:** 7/7 tasks complete ✓

### Completed This Session
- [x] Task 1
- [x] Task 2
...

All tasks complete! You can archive this change with `/opsx:archive`.
```

**Output On Pause (Issue Encountered)**

```
## Implementation Paused

**Change:** <change-name>
**Schema:** <schema-name>
**Progress:** 4/7 tasks complete

### Issue Encountered
<description of the issue>

**Options:**
1. <option 1>
2. <option 2>
3. Other approach

What would you like to do?
```

**Guardrails**
- Keep going through tasks until done or blocked
- Always read context files before starting (from the apply instructions output)
- If task is ambiguous, pause and ask before implementing
- If implementation reveals issues, pause and suggest artifact updates
- Keep code changes minimal and scoped to each task
- Update task checkbox immediately after completing each task
- Pause on errors, blockers, or unclear requirements - don't guess
- Use contextFiles from CLI output, don't assume specific file names

**Demo-Starter Specific: Spec-Driven Build**

When implementing tasks for a demo build (proposal has "demo" in capabilities):

- **Read the gap analysis in design.md first** — it tells you what to Reuse (config-only), Modify (extend), Build New (create from scratch), and what to hide. Do not default to config-only effort on Modify or Build New items.
- **Each task references a spec file** — read the spec before implementing. The spec's GIVEN/WHEN/THEN scenarios define "done", not just the task title.
- **Browser verify after each feature** — open the page, check it against the spec scenarios, take a screenshot. This is build-time Tier 1 verification.
- **The demo-experience spec is a cross-cutting quality gate** — after every page change, check: no template artifacts visible, domain-specific content present, imagery loaded, dark mode works.

**Demo-Starter Specific: Generating demoTracks.ts from Golden Path Specs**

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

**Fluid Workflow Integration**

This skill supports the "actions on a change" model:

- **Can be invoked anytime**: Before all artifacts are done (if tasks exist), after partial implementation, interleaved with other actions
- **Allows artifact updates**: If implementation reveals design issues, suggest updating artifacts - not phase-locked, work fluidly
