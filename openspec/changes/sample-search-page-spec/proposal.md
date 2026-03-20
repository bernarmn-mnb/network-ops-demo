## Why

When building a new demo, the search page is the primary discovery surface — it's where the SA demonstrates AI-powered search, faceted filtering, and result quality. Currently, the build agent configures the search page by interpreting scattered requirements from `DEMO_PLAN.md`, beads acceptance criteria, and chat history. This leads to frequent iteration: wrong fields mapped, missing facets, incorrect boosts, placeholder text surviving to the final demo.

A formal spec for the search page capability locks down exactly what the search experience should deliver for a given domain, so the build agent can implement it in one pass.

## What Changes

- Define the search page capability as a formal spec with requirements and scenarios
- Establish what "correctly configured search" means for any domain
- Provide GIVEN/WHEN/THEN scenarios the build agent can implement against
- Cover: field mapping, facets, range filters, sort options, result display, empty states

## Capabilities

### New Capabilities
- `search-page`: Search page configuration, result display, faceted filtering, and sort behaviour for domain-specific data

### Modified Capabilities

## Impact

- `frontend/src/config/searchConfig.ts` — primary configuration file
- `frontend/src/pages/SearchPageSimple.tsx` — display component
- `backend/app/routes/search.py` — API endpoint returning results
- `backend/app/elasticsearch/templates/queries/` — query templates
- Build agent workflow: agent reads this spec instead of reconstructing intent from beads + DEMO_PLAN
