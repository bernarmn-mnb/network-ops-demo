## Context

The demo-starter template ships a search page (`SearchPageSimple.tsx`) configured via `searchConfig.ts`. When a new demo is built, the build agent must populate this config with domain-specific field mappings, facets, range filters, and display rules. Currently the agent reconstructs these requirements from beads acceptance criteria and DEMO_PLAN.md — a lossy process that causes field mapping errors and multiple iteration cycles.

The backend exposes `GET /api/search/fields` which returns field names, types, and a `suggested_config` object. This is the primary discovery mechanism for populating the config.

## Goals / Non-Goals

**Goals:**
- Define a repeatable specification for what "correctly configured search" means
- Provide scenarios that map directly to verification steps the build agent can execute
- Cover the full surface: field mapping, facets, range filters, sort, display, empty states
- Make the spec domain-agnostic (works for any vertical by filling in placeholders)

**Non-Goals:**
- Advanced relevancy tuning (LTR, personalization, custom scoring) — separate capability
- Visual search or geo search — those are separate page types
- Backend query template authoring — covered by search-retrievers patterns in hive-mind

## Decisions

### 1. Field discovery via API, not manual inspection
The build agent SHALL use `GET /api/search/fields` to discover available fields before writing config. This avoids guessing field names from DEMO_PLAN descriptions.

**Alternative considered**: Reading index mappings directly from Elasticsearch. Rejected because the fields endpoint already curates the data and provides suggested_config.

### 2. Spec uses domain placeholders (`{domain_field}`)
Requirements reference `{title_field}`, `{description_field}`, etc. rather than concrete field names. The build agent fills these from the fields API response for the specific demo domain.

**Alternative considered**: Writing one spec per domain. Rejected because it duplicates structure — the spec pattern is identical across verticals; only field names change.

### 3. Scenarios are verifiable via API + browser
Each scenario includes a verification method — either an API call (`GET /api/search?q=...`) or a browser check. This makes the spec directly testable rather than aspirational.

## Risks / Trade-offs

- **[Over-specification]** → Risk that specs become too rigid for creative demos. Mitigation: specs define minimum requirements, not maximum constraints. The agent can exceed them.
- **[Placeholder confusion]** → `{domain_field}` placeholders could be left unfilled. Mitigation: `openspec validate` can catch unfilled placeholders before apply phase.
- **[Fields API dependency]** → If the backend isn't running, field discovery fails. Mitigation: spec allows manual field mapping as fallback, with a note that API discovery is preferred.
