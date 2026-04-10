# Page Recipes

> Standard layout patterns for demo pages. Use these as starting points to get
> production-quality visual output on the first build pass.
>
> **AI agents**: Pick the recipe closest to your page type, copy the structure,
> then customise with domain content. Do not build pages from scratch without
> consulting these recipes first.

---

## Recipe 1: Landing / Welcome Page

A full marketing-style landing with hero, stats, feature cards, and CTA.

### When to Use

- Homepage or welcome page for a demo
- Any page that needs to make a strong first impression
- Pages that introduce the demo capabilities before the user digs in

### Layout

```
┌─────────────────────────────────────────┐
│ HeroSection (full-width, 300px)         │
│   Title + Subtitle + CTA Button         │
├─────────────────────────────────────────┤
│ Stats Ribbon (3-4 EuiStat in a row)     │
├─────────────────────────────────────────┤
│ FeatureGrid (3-col cards with images)   │
│ ┌─────────┐ ┌─────────┐ ┌─────────┐    │
│ │ Feature │ │ Feature │ │ Feature │    │
│ │  Card   │ │  Card   │ │  Card   │    │
│ └─────────┘ └─────────┘ └─────────┘    │
├─────────────────────────────────────────┤
│ Featured Content Rail (from search API) │
│ ┌──┐ ┌──┐ ┌──┐ ┌──┐                    │
│ └──┘ └──┘ └──┘ └──┘                    │
├─────────────────────────────────────────┤
│ Assistant CTA (EuiCallOut or Card)      │
│ "Ask our AI assistant about..."         │
└─────────────────────────────────────────┘
```

### Key Components

```typescript
import { HeroSection } from '../components/common/HeroSection'
import { FeatureGrid } from '../components/common/FeatureGrid'
import { BrandedEmptyState } from '../components/common/BrandedEmptyState'
import { unsplash, STOCK_IMAGES } from '../utils/images'
import {
  EuiFlexGroup, EuiFlexItem, EuiStat, EuiPanel,
  EuiSpacer, EuiCard, EuiButton,
} from '@elastic/eui'
```

### Spacing

- Hero: `minHeight={300}` (default)
- Stats ribbon: `padding: 24px`, `gap: 24px` between stats
- Feature grid: `gutterSize="l"` (16px), cards `minWidth: 280px`
- Between sections: `<EuiSpacer size="xl" />` (32px)
- Page side padding: `padding: 0 24px`
- Max content width: `maxWidth: 1200px`, `margin: 0 auto`

### Image Strategy

- Hero: Full-width Unsplash image with brand overlay, or brand gradient fallback
- Feature cards: Each card has a thumbnail image from Unsplash (400x300)
- Stats ribbon: No images needed — numeric data is the visual element
- Featured rail: Thumbnails from search result `image_url` field or Unsplash

### Stats Ribbon Pattern

```tsx
<EuiPanel paddingSize="l" style={{ background: 'var(--euiColorLightestShade)' }}>
  <EuiFlexGroup justifyContent="spaceAround" responsive>
    <EuiFlexItem grow={false}>
      <EuiStat title="10,000+" description="Articles indexed" titleSize="l" />
    </EuiFlexItem>
    <EuiFlexItem grow={false}>
      <EuiStat title="6" description="Languages" titleSize="l" />
    </EuiFlexItem>
    <EuiFlexItem grow={false}>
      <EuiStat title="< 200ms" description="Query latency" titleSize="l" />
    </EuiFlexItem>
  </EuiFlexGroup>
</EuiPanel>
```

### Featured Content Rail Pattern

```tsx
<EuiFlexGroup gutterSize="l" wrap>
  {featuredItems.map(item => (
    <EuiFlexItem key={item.id} style={{ minWidth: 250, maxWidth: 300 }}>
      <EuiCard
        title={item.title}
        description={item.summary}
        image={item.image_url || unsplash(STOCK_IMAGES.tech[0].id, 400, 200)}
        onClick={() => navigate(`/search?q=${item.title}`)}
      />
    </EuiFlexItem>
  ))}
</EuiFlexGroup>
```

---

## Recipe 2: Search + Analysis Page

The workhorse search page with sidebar facets, rich result cards, and mode toggles.

### When to Use

- Primary search experience
- Any page where users query and browse results
- Pages with faceted filtering

### Layout

```
┌─────────────────────────────────────────┐
│ Compact HeroSection (80px)              │
│   Page Title + Search Bar               │
├──────────┬──────────────────────────────┤
│          │                              │
│ Sidebar  │  Results Area                │
│ Facets   │  ┌────────────────────────┐  │
│ (280px)  │  │ Mode Toggle + Sort     │  │
│          │  ├────────────────────────┤  │
│ ☐ Value  │  │ ResultCard + image     │  │
│ ☐ Value  │  │ ResultCard + badges    │  │
│ ☐ Value  │  │ ResultCard + metadata  │  │
│          │  ├────────────────────────┤  │
│          │  │ Pagination             │  │
│          │  └────────────────────────┘  │
└──────────┴──────────────────────────────┘
```

### Key Components

```typescript
import { HeroSection } from '../components/common/HeroSection'
import { BrandedEmptyState } from '../components/common/BrandedEmptyState'
import { DemoPromptPills } from '../components/demo/DemoPromptPills'
import { SearchResultCard } from '../components/search/SearchResultCard'
import { useSearchSimple } from '../hooks/useSearchSimple'
```

### Result Card Minimum Visual Elements

Each result card must have at least TWO of:

1. **Thumbnail image** — from data `image_url` or Unsplash fallback
2. **Colored badges** — status, category, sentiment (use `EuiBadge` with brand colors)
3. **Metadata line** — date, source, author in subdued text
4. **Rating or score** — stars, numeric score, or relevance indicator
5. **Status indicator** — `EuiHealth` dot with color

### Empty State

```tsx
<BrandedEmptyState
  iconType="search"
  title="No results found"
  body="Try broadening your search or clearing some filters."
  actions={<EuiButton onClick={clearFilters}>Clear all filters</EuiButton>}
/>
```

### Demo Pills Pattern

Place demo pills below the search bar for guided discovery:

```tsx
<DemoPromptPills
  pills={searchConfig.demoPills?.[currentMode] ?? []}
  onSelect={(query) => { setQuery(query); search() }}
/>
```

---

## Recipe 3: Chat + Context Page

Split-screen with AI chat on one side and supporting content on the other.

### When to Use

- Agent-powered chat with supporting context (search results, documents, profiles)
- Pages where the AI assistant needs visible reference material
- Multi-panel experiences with internal scrolling

### Layout

```
┌─────────────────────────────────────────┐
│ AppHeader (56px fixed)                  │
├─────────────────┬───────────────────────┤
│                 │                       │
│  Chat Panel     │  Content Panel        │
│  (flex: 5)      │  (flex: 4)            │
│                 │  ┌─────────────────┐  │
│  Persona name   │  │ Tab: Context    │  │
│  Greeting msg   │  │ Tab: Results    │  │
│  ...messages    │  │ Tab: Details    │  │
│                 │  │                 │  │
│  ┌───────────┐  │  │ (scrollable)    │  │
│  │ Input     │  │  └─────────────────┘  │
│  └───────────┘  │                       │
└─────────────────┴───────────────────────┘
```

### Key Components

```typescript
import { SplitChatContentLayout } from '../components/common/SplitChatContentLayout'
import { ChatContainer } from '../components/chat/ChatContainer'
import { TabBar } from '../components/common/TabBar'
import { useAgentChat } from '../hooks/useAgentChat'
```

### Chat Persona Requirements

The chat side must always have:
- Custom agent name (not "Assistant")
- Custom avatar image (not default sparkles icon)
- Personalised greeting referencing the demo domain
- Suggestion chips or demo prompt pills for guided interaction

### Content Panel Requirements

The right panel should provide useful context, not be empty:
- At least 2 tabs with meaningful content
- Tab icons and optional badge counts
- Scrollable content area with proper padding (16px)

---

## Recipe 4: Dashboard / Overview Page

Data-driven overview with stats, charts, and categorised sections.

### When to Use

- Summary/overview pages that aggregate data
- Pages that show the "big picture" before diving into details
- Domain dashboards (analytics, monitoring, inventory)

### Layout

```
┌─────────────────────────────────────────┐
│ HeroSection (compact, 120px)            │
│   Dashboard Title + Date Range          │
├─────────────────────────────────────────┤
│ Stats Row (4 EuiStat cards)             │
│ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐    │
│ └──────┘ └──────┘ └──────┘ └──────┘    │
├──────────────────┬──────────────────────┤
│                  │                      │
│ Primary Panel    │ Secondary Panel      │
│ (chart/list)     │ (recent activity)    │
│                  │                      │
├──────────────────┴──────────────────────┤
│ Category Grid (FeatureGrid)             │
│ ┌─────────┐ ┌─────────┐ ┌─────────┐    │
│ │ Category│ │ Category│ │ Category│    │
│ └─────────┘ └─────────┘ └─────────┘    │
└─────────────────────────────────────────┘
```

### Key Components

```typescript
import { HeroSection } from '../components/common/HeroSection'
import { FeatureGrid } from '../components/common/FeatureGrid'
import {
  EuiFlexGroup, EuiFlexItem, EuiStat, EuiPanel, EuiSpacer,
} from '@elastic/eui'
```

### Stats Pattern

Use `EuiStat` inside `EuiPanel` for each metric. Give panels subtle background:

```tsx
<EuiPanel paddingSize="l" hasBorder>
  <EuiStat
    title={aggregations?.total ?? '—'}
    description="Total records"
    titleColor="primary"
    titleSize="l"
  />
</EuiPanel>
```

### Two-Column Section Pattern

```tsx
<EuiFlexGroup gutterSize="l">
  <EuiFlexItem grow={3}>
    <EuiPanel paddingSize="l" hasBorder>
      <EuiTitle size="s"><h3>Primary View</h3></EuiTitle>
      <EuiSpacer size="m" />
      {/* Chart, list, or main content */}
    </EuiPanel>
  </EuiFlexItem>
  <EuiFlexItem grow={2}>
    <EuiPanel paddingSize="l" hasBorder>
      <EuiTitle size="s"><h3>Activity Feed</h3></EuiTitle>
      <EuiSpacer size="m" />
      {/* Recent items, notifications */}
    </EuiPanel>
  </EuiFlexItem>
</EuiFlexGroup>
```

---

## Build Sequence for Any Recipe

Regardless of which recipe you follow, build pages in this order:

1. **Visual scaffold first**: Create the page with `HeroSection`, section containers, and placeholder images. Verify it looks like a real page in the browser before writing logic.
2. **Wire data second**: Connect hooks (`useSearchSimple`, `useAgentChat`, etc.) and populate sections with real data.
3. **Polish third**: Refine spacing, add empty states, test dark mode, verify responsive layout.
4. **Demo tracks last**: Only write `demoTracks.ts` entries after the page is visually complete and functional.

This sequence prevents the most common failure: building functional but visually barren pages that need multiple polish iterations.

---

## Visual Checklist (apply to every page)

- [ ] Has a hero or prominent page header (not just a bare `<h1>`)
- [ ] At least 3 visual elements (images, icons, colored badges, stat cards)
- [ ] Uses brand CSS variables for themed surfaces (not hardcoded colors)
- [ ] Empty states use `BrandedEmptyState` with icon and actionable text
- [ ] Dark mode tested — no broken backgrounds, invisible text, or hardcoded colors
- [ ] Content respects max-width (1200px) with side margins
- [ ] Consistent section spacing (`<EuiSpacer size="xl" />` between major sections)
- [ ] Images use `loading="lazy"` and have error fallbacks
- [ ] No bare "No data" text anywhere
- [ ] Chat agent has custom name, avatar, and greeting (if chat is present)
