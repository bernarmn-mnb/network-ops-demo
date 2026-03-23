# OpenSpec Integration: Library Model + Quality Specs

> **Branch**: `trial/openspec-integration`
> **Date**: 2026-03-20
> **Status**: Implementation complete — ready for real-world testing

---

## Problem Statement

Build agents default to minimal customization: swap the color scheme, change the index, leave template-default layouts. The coaching conversation produces rich UX vision, but by the time it reaches the build agent, it's compressed into technical checklists that can be satisfied with minimal effort. The experiential quality has no formal expression in the execution contract.

## Solution: Three Changes

### 1. Library Model (not fixed template)

The demo-starter is treated as a **component library with worked examples**, not a fixed template to tweak. The `/opsx:propose` command auto-inventories the library (reads `docs/COMPONENT_REGISTRY.md`, scans pages/hooks/routes) and produces a gap analysis in `design.md`:

| Category | Meaning |
|----------|---------|
| **Reuse** | Config-only changes (point to different index, set brand) |
| **Modify** | Extend existing components (add badge, change layout) |
| **Build New** | Pages, agents, routes that don't exist in the template |
| **Not Needed** | Template features to hide for this demo |

This makes effort distribution visible and prevents config-only work on complex demos.

### 2. Quality Specs (prevent shortcuts)

Seven spec templates in `openspec/templates/specs/`:

| Template | Purpose | Required? |
|----------|---------|-----------|
| `demo-experience` | Domain authenticity, production feel, no template artifacts | Always |
| `search-page` | Search config, facets, result display | If search needed |
| `custom-page` | Per custom page: layout, hooks, domain content | Per page |
| `agent-persona` | Chat identity, domain knowledge, conversation flow | Per agent |
| `branding` | Brand extraction, theme, cross-page consistency | If branding needed |
| `golden-paths` | UAT scenarios + demoTracks.ts generation source | Always |
| `data-architecture` | Multi-index, multi-agent, custom routes | If complex |

The critical `demo-experience` spec has requirements like "a stakeholder recognises the domain within 5 seconds" and "no template artifacts visible anywhere" — requirements that cannot be satisfied by just changing the index.

### 3. Two-Tier Verification

- **Build-time**: Browser checks per feature against capability spec scenarios
- **UAT pass** (`/opsx:verify`): Golden path end-to-end tests + design review → structured pass/fail report with screenshot evidence

## Three-Phase Session Flow

| Phase | What Happens | Key Artifact |
|-------|-------------|--------------|
| **Session 1: Planning** | Coaching → `/opsx:propose` → auto-inventory → gap analysis → specs → tasks → bridge to beads | OpenSpec change with all artifacts |
| **Session 2+: Build** | Agent reads specs (primary input) → implements against scenarios → generates demoTracks.ts from golden paths | Working demo |
| **UAT Pass** | `/opsx:verify` → golden path browser tests → design review → verify-report.md | Pass/fail report |

## Golden Path → Demo Guide Pipeline

Golden path specs have structured metadata that the build agent reads to generate `demoTracks.ts`:

| Spec Metadata | Maps To |
|---------------|---------|
| `**Track:**` title, description, valueProposition | `DemoTrack` properties |
| `**Navigation:**` path, label, icon | Demo pills (`{ label, path, icon }`) |
| `**Steps:**` | `steps[]` in each scenario |
| `**Talking points:**` | `talkingPoints[]` |
| `**Expected outcome:**` | UAT verification only (not in demo guide) |

## Beads Integration

Beads tasks are lightweight — they reference spec files instead of embedding checkboxes:

```
bd create "[Search Page] Configure facets" --acceptance "Satisfies scenarios in
  openspec/changes/{demo}/specs/search-page/spec.md
Also satisfies: openspec/changes/{demo}/specs/demo-experience/spec.md"
```

Bridge script: `./scripts/openspec-to-beads.sh <change-name> [--epic <id>] [--dry-run]`

## Files

### Spec Templates (7)
- `openspec/templates/specs/demo-experience/spec-template.md`
- `openspec/templates/specs/search-page/spec-template.md`
- `openspec/templates/specs/custom-page/spec-template.md`
- `openspec/templates/specs/agent-persona/spec-template.md`
- `openspec/templates/specs/branding/spec-template.md`
- `openspec/templates/specs/golden-paths/spec-template.md`
- `openspec/templates/specs/data-architecture/spec-template.md`

### Other New Files
- `openspec/templates/proposal-template.md` — replaces `docs/templates/DEMO_PLAN_TEMPLATE.md`
- `.cursor/commands/opsx-verify.md` — UAT slash command

### Modified Files
- `.cursor/commands/opsx-propose.md` — auto-inventory + gap analysis + spec generation
- `CLAUDE.md` — three-phase flow, library model, spec guidance
- `docs/prompts/WELCOME_PROMPT.md` — Plan Creation overlay uses OpenSpec
- `scripts/openspec-to-beads.sh` — generates spec-referencing beads tasks

### Preserved (not deleted)
- `docs/templates/BEADS_UI_TASKS.md` — fallback for quick OOTB builds
- `docs/templates/DEMO_PLAN_TEMPLATE.md` — reference; proposal template supersedes it
- `docs/COMPONENT_REGISTRY.md` — elevated in importance; auto-inventory reads it

## Next Steps

1. **Test with a real demo** — run `/opsx:propose` on an actual customer demo to validate the gap analysis and spec quality
2. **Compare iteration count** — measure build-phase iterations with OpenSpec vs without
3. **Evaluate the quality bar** — does the `demo-experience` spec actually prevent shortcuts?
4. **Consider data generation integration** — some specs reference data quality; should there be a spec template for data generation too?
