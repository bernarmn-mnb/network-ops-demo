# Decathlon Build Test: Evaluation

## What Was Built

| Component | Status | Notes |
|-----------|--------|-------|
| Product data (484 products, 5 sports) | Working | Deterministic generator, correct brand-sport mapping |
| Decathlon brand theme | Working | Blue #0082C3, logo, light/dark modes |
| searchConfig.ts | Working | Sport-specific facets (skill_level, terrain, waterproof_rating), EUR pricing |
| ActivityExplorerPage | Working | Hero banner, sport cards with imagery, gear tiers, brand badges |
| Backend /api/activities | Working | Live product counts from ES aggregations |
| Sports Advisor agent | Created | Agent exists in Agent Builder with system prompt |
| demoTracks.ts | Written | 2 tracks from golden path specs with structured metadata |
| demoConfig.ts | Configured | NAV_LAYOUT with Explore, Search, Chat, Guide visible |
| demoPrompts.ts | Configured | 4 Decathlon-specific prompts |

## Visual Verification Results

| Page | Decathlon Branded | Domain Content | Template Artifacts |
|------|------------------|----------------|-------------------|
| Activity Explorer | Yes (blue header, logo) | Sport cards with imagery, product counts, house brand badges | None visible |
| Search (results) | Yes | Evadict TR2 Trail Running Shoe, EUR pricing, sport-specific facets | None visible |
| Chat | Partial (header branded) | Generic greeting "I'm Assistant" | Persona name not customized in UI |
| Demo Guide | Not tested | demoTracks written but page not verified | Unknown |

## Evaluation Against Success Criteria

### 1. Activity Explorer has sport-specific content, not a generic card grid
**PASS** — The page shows 5 sport cards with sport photography, live product counts from ES aggregations (120 trail running, 117 hiking, etc.), house brand badges (Evadict, Kiprun for trail running), and sport-specific taglines. Clicking a sport shows gear organized by Essential/Recommended/Optional tiers. This is distinctly Decathlon, not a generic card grid.

### 2. Search results show sport-specific attributes
**PASS** — Results show house brand badge (Evadict), product name with sport context, technical descriptions (Gore-Tex membrane, breathable mesh), EUR pricing, and sport photography. Facets include Skill Level, Terrain, Waterproof Rating — sport-specific, not generic.

### 3. Sports Advisor builds gear kits with budget tracking
**PARTIAL** — Agent created with system prompt covering kit-building logic, budget tracking, and house brand knowledge. However, the chat UI shows "I'm Assistant" instead of "Sports Advisor" because the ChatPage component's greeting/name/avatar aren't configurable from a config file.

### 4. Demo guide has meaningful talking points
**PASS (code)** — demoTracks.ts was generated from golden path specs with sport-specific talking points ("cross-category search", "house brand positioning through search"). Not visually verified.

### 5. Stakeholder would recognize this as Decathlon within 5 seconds
**PASS (mostly)** — Decathlon logo in header, blue branding (#0082C3), sport-specific product data with house brands, activity-based navigation. The chat page persona gap would be noticed.

## Issues Found

### Issue 1: Chat persona not surfaced in UI (P1)
The ChatPage component shows a generic greeting ("I'm Assistant") even though the Agent Builder agent has a custom system prompt. The component doesn't read the agent's name/greeting from config or from the Agent Builder API.

**Impact**: Breaks the golden path — "the Sports Advisor has a custom greeting" fails.
**Root cause**: ChatPage hardcodes the greeting text. There's no config file for chat persona (name, avatar, greeting).
**Template improvement**: Add a `chatConfig.ts` or extend `demoConfig.ts` with agent persona fields (agentName, agentAvatar, agentGreeting) that ChatPage reads.

### Issue 2: Demo pill labels could be more specific (P2)
The search demo pills show full query text as labels ("trail running shoes beginner"). Would be better with short labels + tooltips.

**Template improvement**: The demoPills format supports a `label` field but SearchPageSimple may not use it distinctly from the query text. Verify and fix.

### Issue 3: No Unsplash product-specific images (P2)
Product images use generic sport photography (same Unsplash photo for all trail running products). Real result cards need product-specific images.

**Template improvement**: Data generation guidance should recommend using category-specific Unsplash queries (e.g., "trail+running+shoes", "hiking+boots") rather than one photo per sport.

## What OpenSpec Contributed

### What worked well
1. **Gap analysis prevented config-only approach** — design.md showing 60% Build New made it clear the Activity Explorer needed building from scratch
2. **Sport-specific facets came from the spec** — search-page spec required skill_level, terrain_type, waterproof_rating facets specifically, not generic price/brand
3. **House brand knowledge in data** — data-architecture spec mandated correct brand-sport mapping (Evadict=trail, Quechua=hiking)
4. **Golden paths produced usable demoTracks** — the structured metadata format (Navigation/Steps/TalkingPoints) mapped directly to DemoTrack types
5. **demo-experience spec caught gaps** — "no template artifacts" requirement surfaced the chat persona issue

### What the spec missed
1. **ChatPage persona configuration** — the spec said "custom greeting and avatar" but didn't identify that the template has no config hook for this. The spec should reference the specific component and what changes it needs.
2. **Data generation approach** — the spec assumed LLM-powered generation but didn't have a fallback for expired API keys. Deterministic generation worked fine but wasn't specified.
3. **Image variety** — spec said "product images" but didn't specify that images should vary per product/category, not just per sport.

## Template Improvements to Extract

1. **Add `chatConfig.ts`** — configurable agent name, avatar URL, greeting message, and suggestion chips. ChatPage reads from this config.
2. **Improve data generation spec template** — add guidance for deterministic fallback and per-category image variety.
3. **Add chat persona section to demo-experience spec template** — requirement that chat shows custom agent name and greeting.
4. **Bridge script improvement** — inline spec references in tasks `(spec: specs/X/spec.md)` should be parsed as an alternative routing method.
