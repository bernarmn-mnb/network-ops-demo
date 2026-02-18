# Beads UI Task Templates

> Pre-written task templates for the build agent to copy when creating UI work items.
> Each template includes acceptance criteria so the agent knows what "done" looks like.
>
> **Usage**: When creating beads issues during Plan Creation, copy the relevant template
> below and fill in the `{placeholders}` with domain-specific values.

---

## Configure searchConfig.ts

```
bd create "Configure searchConfig.ts for {domain}" \
  --type task \
  --priority 1 \
  --acceptance "- [ ] index set to actual index name (not template default)
- [ ] fields.search populated with domain text fields and appropriate boosts
- [ ] display.title, display.description mapped to real fields
- [ ] display.image mapped (if image URLs exist in data)
- [ ] display.badges mapped to keyword fields that add context
- [ ] facets render in sidebar and produce non-empty buckets
- [ ] range filters work with correct min/max/step for the data
- [ ] sort options include domain-relevant fields
- [ ] results display correctly with actual data (no missing fields)"
```

---

## Build custom page: {PageName}

```
bd create "Build custom page: {PageName}" \
  --type feature \
  --priority 2 \
  --acceptance "- [ ] Page component created in frontend/src/pages/{PageName}Page.tsx
- [ ] Route added in App.tsx at /{page-path}
- [ ] Page path added to NAV_PAGES in demoConfig.ts
- [ ] Hooks connected: {list hooks — useAgentChat, useSearchSimple, useA2AChat}
- [ ] Data flows end-to-end (search returns results, chat responds, etc.)
- [ ] Styled with var(--brand-*) CSS variables (no hardcoded colours)
- [ ] Uses EUI components for layout
- [ ] Responsive at mobile and desktop widths
- [ ] Works with actual indexed data (not mock data)
- [ ] Any new EUI icons verified against icon cache before use
VISUAL QUALITY (see CLAUDE.md Visual Quality Standards):
- [ ] Page includes domain-relevant imagery (hero banners, photos, thumbnails — not text-only)
- [ ] Empty states have visual elements and actionable prompts
- [ ] Chat assistant has a custom name, avatar, and personalised greeting (if page has chat)
- [ ] Content not hidden behind fixed header (visually verified in browser)
- [ ] Dark mode tested — toggle theme and confirm no invisible text or broken colours
- [ ] Visually verified via browser screenshot before marking complete"
```

---

## Customize demoPrompts.ts

```
bd create "Customize demoPrompts for {domain}" \
  --type task \
  --priority 2 \
  --acceptance "- [ ] All prompts are domain-specific (not generic template text)
- [ ] Prompts tell a story: problem discovery → search → chat → resolution
- [ ] At least 3-4 suggested prompts that showcase different capabilities
- [ ] Prompts trigger expected agent behaviours (tool calls, search, recommendations)
- [ ] Prompts work with the actual indexed data and configured agent"
```

---

## Populate DemoGuidePage

> **Key file**: `frontend/src/config/demoTracks.ts` — this is where demo tracks live (not in the page component).
> The UX Design conversation already produced the narrative — this task structures it into `DemoTrack[]` format.

```
bd create "Populate DemoGuidePage for {domain}" \
  --type task \
  --priority 2 \
  --acceptance "- [ ] demoTracks.ts has 1-3 domain-specific tracks (not template defaults)
- [ ] Each track has title, description, valueProposition, and 3-5 scenarios
- [ ] Each scenario has steps (what to do), talkingPoints (what to say), and demoPills (where to navigate)
- [ ] Track narrative follows: problem → search/chat → wow moment → resolution
- [ ] Talking points reference actual features and custom pages built in this demo
- [ ] Demo pills link to correct routes (custom pages, search, chat)
- [ ] DEMO_TITLE and DEMO_SUBTITLE set in demoConfig.ts
- [ ] Guide page renders correctly with branding applied
- [ ] Visually verified via browser screenshot"
```

---

## Set demoConfig.ts

```
bd create "Configure demoConfig.ts for {domain}" \
  --type task \
  --priority 1 \
  --acceptance "- [ ] NAV_PAGES filtered to show only pages relevant to this demo
- [ ] DEMO_TITLE set to domain-specific title
- [ ] DEMO_SUBTITLE set to a one-liner explaining the demo's value
- [ ] Navigation shows correct pages in the header
- [ ] Hidden pages are not accessible via direct URL (or acceptable if they are)"
```

---

## End-to-end demo walkthrough

```
bd create "End-to-end demo walkthrough" \
  --type task \
  --priority 1 \
  --acceptance "- [ ] All pages load without console errors
- [ ] Search returns results with correct display fields
- [ ] Facets filter correctly and update result counts
- [ ] Chat responds with domain-relevant answers
- [ ] Custom page(s) function as designed
- [ ] Branding is applied consistently across all visible pages
- [ ] Demo prompts trigger the expected demo narrative
- [ ] No broken images, missing data, or placeholder text visible
- [ ] Dark mode: toggle theme on every page — no invisible text, broken borders, or hardcoded colours
- [ ] Each page visually verified via browser screenshot (not just TypeScript compilation)
- [ ] Chat assistant has branded name, avatar, and persona-aware greeting
- [ ] Empty states on all pages have visual weight (not bare text)"
```

---

## Notes for Build Agents

- Create these tasks during the **Plan Creation** beat of the consultation
- Link all tasks to the demo epic with `bd dep add`
- Tasks should be created in dependency order: searchConfig before custom pages, demoConfig before walkthrough
- Always run `bd ready` after creating tasks to verify the dependency graph
- Reference `docs/CUSTOM_PAGE_PATTERNS.md` when working on custom page tasks
