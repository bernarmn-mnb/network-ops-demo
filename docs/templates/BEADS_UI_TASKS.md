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
- [ ] Any new EUI icons registered in icon cache"
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

## Update DemoGuidePage

```
bd create "Update DemoGuidePage for {domain}" \
  --type task \
  --priority 2 \
  --acceptance "- [ ] Demo tracks are domain-specific (not template defaults)
- [ ] Each track has a clear narrative arc (problem → solution → wow moment)
- [ ] Talking points reference actual features built in this demo
- [ ] Tracks cover all custom pages and key capabilities
- [ ] Guide page renders correctly with branding applied"
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
- [ ] No broken images, missing data, or placeholder text visible"
```

---

## Notes for Build Agents

- Create these tasks during the **Plan Creation** beat of the consultation
- Link all tasks to the demo epic with `bd dep add`
- Tasks should be created in dependency order: searchConfig before custom pages, demoConfig before walkthrough
- Always run `bd ready` after creating tasks to verify the dependency graph
- Reference `hive-mind/patterns/elastic/CUSTOM_PAGE_PATTERNS.md` when working on custom page tasks
