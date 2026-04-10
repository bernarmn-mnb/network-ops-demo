# Demo Page Visual Design Guide

> The single reference for CSS variables, typography, spacing, and dark mode patterns.
> AI agents: read this before building or modifying any page.

---

## CSS Variable Reference

### EUI Theme Variables (always available)

Use these for all theme-dependent surfaces. Never hardcode hex values for backgrounds, borders, or text.

| Purpose | Variable | Example Value (Light) |
|---------|----------|----------------------|
| Page background | `var(--euiColorEmptyShade)` | `#FFFFFF` |
| Subtle background | `var(--euiColorLightestShade)` | `#F5F7FA` |
| Border / divider | `var(--euiColorLightShade)` | `#D3DAE6` |
| Primary text | `var(--euiTextColor)` | `#343741` |
| Subdued text | `var(--euiTextSubduedColor)` | `#69707D` |
| Primary action | `var(--euiColorPrimary)` | `#0077CC` |
| Success | `var(--euiColorSuccess)` | `#00BFB3` |
| Warning | `var(--euiColorWarning)` | `#FEC514` |
| Danger | `var(--euiColorDanger)` | `#BD271E` |
| Accent | `var(--euiColorAccent)` | `#F04E98` |
| Panel background | `var(--euiPageBackgroundColor)` | `#FAFBFD` |
| Title color | `var(--euiTitleColor)` | `#1A1C21` |

### Brand Variables (set by BrandContext when a brand is active)

These override EUI defaults. Always chain a fallback: `var(--brand-primary, var(--euiColorPrimary))`.

| Purpose | Variable | Fallback |
|---------|----------|----------|
| Primary brand color | `--brand-primary` | `--euiColorPrimary` |
| Secondary/accent | `--brand-accent` | `--euiColorAccent` |
| Dark variant | `--brand-dark` | `--euiColorDarkShade` |
| Page background | `--brand-background` | `--euiColorEmptyShade` |
| Surface background | `--brand-surface` | `--euiPageBackgroundColor` |
| Primary text | `--brand-text-primary` | `--euiTitleColor` |
| Body text | `--brand-text-body` | `--euiTextColor` |
| Subdued text | `--brand-text-subdued` | `--euiTextSubduedColor` |
| Border color | `--brand-border` | `--euiColorLightShade` |
| On-primary (text on primary bg) | `--brand-on-primary` | `#FFFFFF` |
| Border radius | `--brand-border-radius` | `6px` |
| Heading font | `--brand-font-heading` | `inherit` |
| Body font | `--brand-font-body` | `inherit` |
| Gradient primary | `--brand-gradient-primary` | (linear-gradient fallback) |

### Known Exceptions

- **`EuiAvatar`**: Requires hex color values, not CSS variables. Use `brand.colors.primary` directly.
- **`EuiHealth`**: Color prop accepts EUI named colors (`success`, `danger`) — don't pass CSS vars.
- **Inline chart colors**: Use brand color objects from the theme file, not CSS variables.

---

## Typography Scale

Use EUI title components for headings. For custom text, follow this scale:

| Element | Size | Weight | Component / Style |
|---------|------|--------|-------------------|
| Page hero title | `clamp(2rem, 5vw, 3rem)` | 700 | `HeroSection` handles this automatically |
| Page title (h1) | `1.75rem` (28px) | 700 | `<EuiTitle size="l"><h1>` |
| Section heading (h2) | `1.375rem` (22px) | 600 | `<EuiTitle size="m"><h2>` |
| Subsection heading (h3) | `1.125rem` (18px) | 600 | `<EuiTitle size="s"><h3>` |
| Body text | `1rem` (16px) | 400 | `<EuiText>` |
| Small text / captions | `0.875rem` (14px) | 400 | `<EuiText size="s">` |
| Metadata / labels | `0.75rem` (12px) | 500 | `<EuiText size="xs">` |

### Font Hierarchy

- **Headings**: `var(--brand-font-heading, inherit)` — the brand can override this
- **Body**: `var(--brand-font-body, inherit)` — falls back to EUI default (Inter)
- Always set `font-family` via CSS variables, never hardcode font names

---

## Spacing System

Consistent spacing prevents "wireframe feel." Use these values:

### Vertical Rhythm

| Context | Spacing | Value |
|---------|---------|-------|
| Between major page sections | `<EuiSpacer size="xl" />` | 32px |
| Between subsections | `<EuiSpacer size="l" />` | 24px |
| Between related elements | `<EuiSpacer size="m" />` | 16px |
| Between tight elements | `<EuiSpacer size="s" />` | 8px |
| Hero to first section | 32-40px | Padding on first section below hero |

### Horizontal Spacing

| Context | Value |
|---------|-------|
| Page side padding | `24px` (matches EUI page template) |
| Card grid gap | `16px` (EuiFlexGroup `gutterSize="l"`) |
| Panel internal padding | `16-24px` |
| Inline element gap | `8-12px` |

### Max Widths

| Context | Value |
|---------|-------|
| Page content | `1200px` with `margin: 0 auto` |
| Hero content text | `640px` (centered, for readability) |
| Full-width layouts | `1400px` (SplitChatContentLayout) |
| Card in grid | Flex-grow, min `280px`, max `400px` |

---

## Page Layout Patterns

### Standard Page (EuiPageTemplate)

```
┌─────────────────────────────────────────┐
│ AppHeader (56px fixed)                  │
├─────────────────────────────────────────┤
│ HeroSection (300px min)                 │
│   Title + Subtitle + CTA               │
├─────────────────────────────────────────┤
│ Content (max-width: 1200px, centered)   │
│                                         │
│ ┌───────┐ ┌───────┐ ┌───────┐          │
│ │ Card  │ │ Card  │ │ Card  │  gap:16px│
│ └───────┘ └───────┘ └───────┘          │
│                                         │
│ Section Heading                         │
│ ┌─────────────────────────────┐         │
│ │ Featured content rail       │         │
│ └─────────────────────────────┘         │
└─────────────────────────────────────────┘
```

### Fixed Viewport (Chat + Content)

```
┌─────────────────────────────────────────┐
│ AppHeader (56px fixed)                  │
├───────────────────┬─────────────────────┤
│                   │                     │
│ Chat Panel        │ Content Panel       │
│ (flex: 5)         │ (flex: 4)           │
│ Internal scroll   │ Tabbed + scroll     │
│                   │                     │
└───────────────────┴─────────────────────┘
```

Use `SplitChatContentLayout` for this pattern. It handles fixed positioning and internal scrolling.

---

## Color Usage Rules

| Scenario | What to Use |
|----------|-------------|
| Page background | `var(--euiColorEmptyShade)` or `var(--brand-background)` |
| Card / panel surface | `var(--euiPageBackgroundColor)` or `var(--brand-surface)` |
| Primary CTA buttons | `var(--brand-primary)` with `var(--brand-on-primary)` text |
| Accent highlights | `var(--brand-accent)` — use sparingly for badges, indicators |
| Status indicators | EUI named colors: `success`, `warning`, `danger` |
| Subdued / muted areas | `var(--euiColorLightestShade)` — subtle background sections |
| Borders and dividers | `var(--euiColorLightShade)` or `var(--brand-border)` |
| Text on dark backgrounds | `#FFFFFF` with `text-shadow: 0 1px 4px rgba(0,0,0,0.3)` |

### Dark Mode Rules

1. **Never hardcode light-mode colors**: `#FFFFFF`, `#F5F5F5`, `#000000` break in the other mode
2. **Always test both modes**: Toggle theme and check every page
3. **Overlays on images**: Use `rgba()` not `hex` — e.g., `rgba(0, 0, 0, 0.55)` for hero overlays
4. **Brand-colored surfaces**: Chain fallbacks: `var(--brand-surface, var(--euiPageBackgroundColor))`
5. **Box shadows**: Use `rgba(0, 0, 0, 0.08)` light, `rgba(0, 0, 0, 0.3)` dark — or use EUI panels which handle this

---

## Image Strategy

### When to Use What

| Image Type | When | How |
|------------|------|-----|
| **Unsplash** | Generic domain imagery (heroes, cards) | `unsplash(photoId, width, height)` from `utils/images.ts` |
| **STOCK_IMAGES** | Quick visual richness, curated quality | `STOCK_IMAGES.tech[0].id` → pass to `unsplash()` |
| **Customer assets** | Customer-specific branding | Download to `public/brands/{brand}/images/`, reference via `/brands/...` |
| **Data-driven** | Product images, article thumbnails | Use `image_url` field from Elasticsearch index |
| **EUI icons** | Small indicators, buttons | Must be registered in `iconCache.ts` |

### Image Sizing Guidelines

| Context | Width | Height | Fit |
|---------|-------|--------|-----|
| Hero banner | 1400 | 400 | `crop` |
| Card thumbnail | 400 | 300 | `crop` |
| Photo strip item | 120 | 120 | `crop` |
| Avatar / profile | 80 | 80 | `crop` |
| Full-width section | 1200 | 300 | `crop` |

### Fallback Chain

When images may not be available:

1. **Data `image_url` field** — use if present
2. **Brand hero image** — `brand.heroImage?.url`
3. **STOCK_IMAGES category** — match to closest domain
4. **Brand gradient** — `brand.gradients?.primary`
5. **EUI colored background** — last resort, still looks intentional

Always handle broken images: `onError` → hide or show fallback. Never show broken image icons.

---

## Component Usage Quick Reference

| Need | Component | Import |
|------|-----------|--------|
| Hero banner with image | `HeroSection` | `components/common/HeroSection` |
| Row of curated photos | `PhotoStrip` | `components/common/PhotoStrip` |
| Empty state with visual | `BrandedEmptyState` | `components/common/BrandedEmptyState` |
| Feature/category cards | `FeatureGrid` | `components/common/FeatureGrid` |
| Chat + content split | `SplitChatContentLayout` | `components/common/SplitChatContentLayout` |
| Tab navigation | `TabBar` | `components/common/TabBar` |
| Mode switching | `TaskSwitcher` | `components/common/TaskSwitcher` |

---

## Anti-Patterns (What NOT to Do)

| Bad Practice | Why | Do This Instead |
|-------------|-----|-----------------|
| Text-only page with no images | Looks like a wireframe | Add HeroSection + at least 3 visual elements |
| Hardcoded `background: #fff` | Breaks dark mode | `background: var(--euiColorEmptyShade)` |
| `color: black` | Invisible in dark mode | `color: var(--euiTextColor)` |
| `EuiAvatar color="var(--brand)"` | EuiAvatar needs hex | `EuiAvatar color={brand.colors.primary}` |
| Bare "No data" text | Feels broken | `BrandedEmptyState` with icon and action |
| Same Unsplash image everywhere | Looks lazy | Use different `STOCK_IMAGES` entries per section |
| Missing `loading="lazy"` | Slow initial load | Always add to decorative images |
| Giant hero with no content below | Looks unfinished | Hero should be 25-35% of viewport, not 100% |
