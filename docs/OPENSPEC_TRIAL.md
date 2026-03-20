# OpenSpec Trial: Findings & Evaluation

> **Branch**: `trial/openspec-integration`
> **Date**: 2026-03-20
> **Status**: Trial — ready for evaluation

---

## What Was Done

1. **Installed OpenSpec CLI** (`@fission-ai/openspec@1.2.0`) globally via npm
2. **Initialized for Cursor** — generated slash commands and skills in `.cursor/commands/` and `.cursor/skills/`
3. **Created sample specification** for the search page capability with all 4 artifacts:
   - `proposal.md` — motivation and scope
   - `design.md` — technical decisions and trade-offs
   - `specs/search-page/spec.md` — 8 formal requirements with 17 GIVEN/WHEN/THEN scenarios
   - `tasks.md` — 23 implementation tasks in 5 groups
4. **Built openspec-to-beads bridge** script (`scripts/openspec-to-beads.sh`) that converts OpenSpec tasks to beads issues
5. **Updated CLAUDE.md** with OpenSpec integration directives and role separation guidance
6. **Created `openspec/project.md`** with full project context for OpenSpec's AI instructions

## What OpenSpec Generated (Cursor-specific)

| Artifact | Location | Purpose |
|----------|----------|---------|
| `/opsx:propose` | `.cursor/commands/opsx-propose.md` | Slash command to create change proposals |
| `/opsx:apply` | `.cursor/commands/opsx-apply.md` | Slash command to implement from specs |
| `/opsx:archive` | `.cursor/commands/opsx-archive.md` | Slash command to archive completed changes |
| `/opsx:explore` | `.cursor/commands/opsx-explore.md` | Slash command for thinking/exploration mode |
| Skills (4) | `.cursor/skills/openspec-*/SKILL.md` | Agent skills for each workflow step |

**No conflicts with existing files**: OpenSpec preserved our `AGENTS.md`, didn't touch `.cursor/rules/`, and created new directories only.

## Sample Spec: What It Looks Like

The sample spec for the search page capability demonstrates the artifact structure:

### Requirements (from `specs/search-page/spec.md`)

| Requirement | Scenarios | What It Verifies |
|-------------|-----------|------------------|
| Search index configuration | 2 | Index matches env var, fields discovered via API |
| Search field mapping with boosts | 2 | Title-boost ranking, all fields populated |
| Result display mapping | 3 | Title/description visible, images/badges, no placeholders |
| Faceted filtering | 3 | Non-empty buckets, selection filters, AND combination |
| Range filters | 2 | Bounds match data, filter narrows results |
| Sort options | 2 | Multiple options available, sort changes order |
| Empty state handling | 2 | Visual empty state, clear-filters action |
| Dark mode compatibility | 1 | Theme toggle preserves readability |

**Total**: 8 requirements, 17 testable scenarios.

Compare this to the current beads template for search config:

```
- [ ] index set to actual index name
- [ ] fields.search populated with domain text fields
- [ ] display.title, display.description mapped
...
```

The beads checklist says **what to check**. The OpenSpec spec says **what the system should do and how to verify it**.

## Bridge Script: openspec-to-beads.sh

Dry-run output for the sample spec:

```
23 tasks would be created, grouped by:
- [Field Discovery] — 3 tasks
- [Search Config Population] — 6 tasks
- [Facets and Filters] — 4 tasks
- [Display and UX Verification] — 6 tasks
- [Edge Cases and Polish] — 4 tasks
```

Each task gets created as a beads issue with `--type task --priority 2`, optionally linked to an epic.

## Evaluation Criteria

### Does it address the build-phase failure mode?

| Problem | How OpenSpec Helps | Verdict |
|---------|-------------------|---------|
| Intent drift between sessions | Specs are persistent Markdown files in the repo | Yes |
| Agent reconstructs intent from fragments | Agent reads structured proposal + design + specs | Yes |
| Acceptance criteria are checklists, not specs | GIVEN/WHEN/THEN scenarios define behaviour | Yes |
| Design decisions evaporate | `design.md` captures why, not just what | Yes |
| No living documentation of capabilities | `openspec/specs/` updated on archive | Yes |

### Trade-offs

| Pro | Con |
|-----|-----|
| Structured specs eliminate guesswork | Adds another tool to the stack |
| `project.md` gives OpenSpec full project context | Needs to be kept in sync with CLAUDE.md |
| Slash commands integrate natively in Cursor | Overhead for simple OOTB builds |
| Living docs via archive | Archive step could be forgotten |
| Bridge script keeps beads as execution tracker | Two places to mark tasks done (tasks.md + beads) |

### Open Questions

1. **Granularity**: Should we create one OpenSpec change per demo (e.g., `build-kwikfit-demo`) or one per capability (e.g., `add-search-page`, `add-branding`, `add-agent`)? Per-capability is more reusable; per-demo is simpler.

2. **Template specs**: Should we ship pre-written spec templates in `openspec/specs/` (like we do with `BEADS_UI_TASKS.md`) that get copied and customised per demo? This would make the "propose" step faster.

3. **When to skip**: The CLAUDE.md guidance says OpenSpec is "optional" for quick builds and "required" for full custom. Is this the right threshold?

4. **Beads template migration**: Should `BEADS_UI_TASKS.md` be refactored into OpenSpec spec templates, or should both coexist?

## Next Steps (if trial proceeds)

1. **Test with a real demo build** — use OpenSpec for an actual customer demo (not just the sample spec) and compare iteration count vs. previous builds
2. **Create spec templates** — pre-written specs for common capabilities (search, branding, agent, custom page) in `openspec/specs/`
3. **Update WELCOME_PROMPT.md** — add the OpenSpec proposal step to the planning conversation flow
4. **Evaluate slash commands** — test `/opsx:propose` and `/opsx:apply` in Cursor to see if they work smoothly
5. **Consider `openspec validate`** — could catch incomplete specs before the apply phase

## Files Changed

```
New files:
  openspec/project.md                                    — Project context for OpenSpec
  openspec/changes/sample-search-page-spec/proposal.md   — Sample proposal
  openspec/changes/sample-search-page-spec/design.md     — Sample design
  openspec/changes/sample-search-page-spec/specs/search-page/spec.md — Sample spec
  openspec/changes/sample-search-page-spec/tasks.md      — Sample tasks
  openspec/changes/sample-search-page-spec/.openspec.yaml — Change metadata
  scripts/openspec-to-beads.sh                           — Bridge script

Generated by `openspec init --tools cursor`:
  .cursor/commands/opsx-propose.md
  .cursor/commands/opsx-apply.md
  .cursor/commands/opsx-archive.md
  .cursor/commands/opsx-explore.md
  .cursor/skills/openspec-propose/SKILL.md
  .cursor/skills/openspec-apply-change/SKILL.md
  .cursor/skills/openspec-archive-change/SKILL.md
  .cursor/skills/openspec-explore/SKILL.md

Modified:
  CLAUDE.md — Added OpenSpec section and updated Session Architecture
```
