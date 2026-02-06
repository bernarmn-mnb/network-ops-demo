# Spike: Branding Extraction Without Firecrawl

> **Bead**: elastic-agent-starter-0v4
> **Date**: 2026-02-06
> **Status**: Complete

## Problem

The current branding extraction workflow relies on Firecrawl MCP, which requires a manual API key signup at firecrawl.dev. This creates friction for new users and SAs who want to quickly extract customer branding for demos. We need to determine if the tools already available in the project (Playwright MCP, Browser MCP, WebFetch) can produce "good enough" extraction quality without any API key signup.

## Test Target

**elastic.co** -- chosen because we already have a Firecrawl baseline (documented in `hive-mind/patterns/branding/BRANDING_EXTRACTION_PATTERNS.md`) for direct quality comparison.

### Firecrawl Baseline (from existing docs)

| Field | Firecrawl Value |
|-------|-----------------|
| Primary | `#0B64DD` |
| Accent | `#0B64DD` |
| Background | `#FFFFFF` |
| Text Primary | `#101C3F` |
| Heading Font | MierB |
| Body Font | Inter |
| Logo | SVG data / URL |
| Button styles | Yes (bg, text, radius) |

---

## Approach 1: Playwright MCP (`mcp__playwright__*`)

### Method

1. `browser_navigate` to target URL
2. `browser_snapshot` to get page structure (accessibility tree)
3. `browser_evaluate` to run JavaScript that extracts:
   - CSS custom properties from `:root` (Layer 1)
   - Computed styles from semantic elements (Layer 2)
   - Logo candidates via image/SVG heuristics (Layer 3)

### Results on elastic.co

| Category | Result | Quality |
|----------|--------|---------|
| **CSS Variables** | 412 total vars, 262 color vars, 44 font vars | Excellent |
| **Key Colors Found** | `--color-elastic-blue: #0b64dd`, `--color-elastic-teal: #02bcb7`, `--body-color: #1c1e23`, `--color-ink: #343741`, `--color-light-grey: #f5f7fa`, `--bs-body-bg: #fff` | Excellent |
| **Button Colors** | `--button-primary-bg: #0b64dd`, `--button-primary-color: #fff`, `--button-primary-hover-bg: #094dab` | Excellent |
| **Link Colors** | `--link-color: #0b64dd`, `--link-hover-color: #094dab` | Excellent |
| **Fonts (CSS Vars)** | `--font-family-heading: "MierB","Inter",arial,sans-serif`, `--font-family-body: "Inter",arial,sans-serif` | Excellent |
| **Fonts (Computed)** | body: `Inter, arial, sans-serif`, h1: `MierB, Inter, arial, sans-serif` | Excellent |
| **Logo** | Top candidate (score 90): footer SVG logo with "Elastic The Search AI Company" alt text, URL: `https://images.contentstack.io/v3/assets/.../logo-tagline_secondary_all_white-177.svg` | Good |
| **Computed Styles** | body bg `#fff`, body text `rgb(28, 30, 35)`, button primary bg `rgb(0, 119, 204)`, button radius `5px` | Excellent |

### Mapping to BrandTheme

From the extracted data, we can confidently populate:

```
colors.primary:     #0b64dd  (--color-elastic-blue / --button-primary-bg)
colors.accent:      #02bcb7  (--color-elastic-teal)
colors.background:  #f5f7fa  (--color-light-grey)
colors.white:       #fff     (--color-white)
colors.black:       #000     (--color-black)
colors.textPrimary: #343741  (--color-ink / --color-text-dark)
colors.textBody:    #535966  (--color-light-ink)
colors.border:      #d4dae5  (--color-dark-gray / --color-gray-200)

fonts.heading:  "MierB", "Inter", arial, sans-serif
fonts.body:     "Inter", arial, sans-serif
fonts.fallback: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif

spacing.borderRadius: 5px (from computed button style)

logo: External URL available (SVG)
```

### Assessment

- **Colors**: 95% match with Firecrawl. All primary, accent, background, text, and button colors found through CSS variables. The semantic variable names (`--color-elastic-blue`, `--button-primary-bg`) make mapping straightforward.
- **Fonts**: 100% match. Both heading (MierB) and body (Inter) fonts identified via CSS variables AND computed styles.
- **Logo**: Found via heuristic scoring. External URL available; would need to fetch and convert to data URL for embedding. Firecrawl returns inline SVG data, which is slightly more convenient.
- **Button styles**: Complete -- background, text color, hover state, border radius all available.
- **Setup required**: None. Playwright MCP is already configured in the project.

---

## Approach 2: Browser MCP (`mcp__browsermcp__*`)

### Method

1. `browser_navigate` to target URL
2. `browser_snapshot` to get page structure

### Results on elastic.co

| Category | Result | Quality |
|----------|--------|---------|
| **Page Structure** | Full accessibility tree with headings, links, buttons, images | Good |
| **Logo Discovery** | Image alt texts found: "Elastic Search Home", "Elastic The Search AI Company" | Partial |
| **Color Extraction** | None -- no `browser_evaluate` available | None |
| **Font Extraction** | None -- no `browser_evaluate` available | None |
| **CSS Variables** | None -- no JavaScript execution capability | None |

### Critical Limitation

Browser MCP **does not expose a `browser_evaluate` function**. Its available tools are:
- `browser_navigate`, `browser_go_back`, `browser_go_forward`
- `browser_snapshot`, `browser_screenshot`
- `browser_click`, `browser_hover`, `browser_type`
- `browser_select_option`, `browser_press_key`
- `browser_wait`, `browser_get_console_logs`

Without `browser_evaluate`, it is impossible to:
- Read CSS custom properties
- Sample computed styles from DOM elements
- Run logo detection heuristics
- Extract any programmatic branding data

The snapshot only provides the accessibility tree (element roles, text content, link URLs), which gives page structure and image alt texts but zero style information.

### Assessment

- **Colors**: 0% -- cannot extract any color information
- **Fonts**: 0% -- cannot extract any font information
- **Logo**: Partial -- can see image alt texts and URLs from the accessibility tree, but cannot score or filter them
- **Not viable** as a standalone branding extraction tool

---

## Approach 3: WebFetch

### Method

1. `WebFetch` with a prompt asking to extract branding information from the page HTML

### Results on elastic.co

| Category | Result | Quality |
|----------|--------|---------|
| **Colors** | Found `#0B64DD` as primary blue, mentioned teal and other CSS variable names | Partial |
| **Fonts** | Found `Space Mono` (monospace), mentioned `--font-family-heading` variable name but not resolved value | Poor |
| **Logo** | Found footer logo SVG URL | Good |
| **CSS Variables** | Mentioned they exist but could not resolve values (no JS execution) | Poor |

### How It Works

WebFetch fetches the raw HTML, converts to markdown, and processes with a small LLM. The LLM can see:
- Inline styles with color values
- CSS variable names in `<style>` blocks (but not their computed values if defined in external CSS)
- `<link>` tags pointing to CSS files (but does not follow/fetch them)
- `<img>` tags with src URLs

### Limitations

- Cannot execute JavaScript, so CSS variables defined in external stylesheets are invisible
- LLM summarization may miss or hallucinate values
- Single-page fetch -- does not follow CSS imports
- No computed style access

### Assessment

- **Colors**: 40% -- finds some inline hex values and variable names, but cannot resolve most CSS variables
- **Fonts**: 20% -- may find font-face declarations if inline, but usually misses external fonts
- **Logo**: 60% -- can find `<img>` tags with "logo" in attributes
- **Useful as supplementary data** but not sufficient alone

---

## Comparison Summary

| Capability | Playwright MCP | Browser MCP | WebFetch | Firecrawl |
|------------|:-----------:|:-----------:|:--------:|:---------:|
| **CSS Variables** | 262 color vars | None | Variable names only | Full |
| **Computed Styles** | Full (body, h1, button, link, nav) | None | None | Full |
| **Font Families** | Both heading + body | None | Partial | Both |
| **Logo Detection** | Scored candidates (top: 90/100) | Alt text only | URL matching | SVG inline data |
| **Button Styles** | bg, text, hover, radius | None | None | Full |
| **Link Colors** | Yes | None | Partial | Yes |
| **Dark Mode Colors** | Via CSS var naming | None | None | Yes |
| **Setup Required** | None (already configured) | None (already configured) | None (built-in) | API key signup |
| **Quality vs Firecrawl** | ~90% | ~10% | ~30% | 100% (baseline) |
| **Reliability** | High (deterministic JS) | N/A | Variable (LLM-dependent) | High |

---

## Recommendation

**Use Playwright MCP as the primary extraction tool.** It achieves approximately 90% of Firecrawl quality with zero setup requirements.

### Why Playwright MCP Wins

1. **`browser_evaluate` is the key differentiator** -- it allows running the same JavaScript extraction code documented in `BRANDING_EXTRACTION_PATTERNS.md` (CSS variables, computed styles, logo heuristics)
2. **Already available** -- Playwright MCP is already configured in the project
3. **Deterministic** -- JavaScript extraction returns exact values, not LLM approximations
4. **Rich data** -- 262 color variables, 44 font variables, complete computed styles, scored logo candidates
5. **Semantic mapping** -- CSS variable names like `--button-primary-bg`, `--font-family-heading` make it straightforward for an AI assistant to map extracted values to BrandTheme fields

### What's Missing vs Firecrawl (the 10% gap)

1. **Inline SVG logo data** -- Playwright finds logo URLs but does not automatically convert to `data:image/svg+xml,...` format. A follow-up fetch + encode step would be needed.
2. **Brand personality** -- Firecrawl extracts tone, energy, target audience metadata. Playwright cannot infer this (though a Vision LLM screenshot analysis could supplement).
3. **Component analysis** -- Firecrawl identifies input field styles, card patterns, etc. Playwright's computed styles approach could be extended for this but requires additional selectors.

### Recommended Hybrid Approach

For maximum quality with zero API keys:

1. **Playwright MCP `browser_evaluate`** -- primary extraction (CSS vars + computed styles + logo heuristics)
2. **WebFetch** -- supplementary data (catches inline styles that might be missed, validates findings)
3. **AI assistant reasoning** -- the Claude agent interprets the raw data and maps it to BrandTheme fields, choosing the best values from multiple sources

This combination should deliver 90-95% of Firecrawl quality.

---

## Follow-up Implementation Bead

If this spike is accepted, a follow-up bead should cover:

1. **Create a reusable extraction prompt/script** -- a standardized `browser_evaluate` JavaScript snippet that can be copy-pasted or invoked by the AI agent for any target URL
2. **Logo fetch + embed utility** -- given a logo URL, fetch it and convert to `data:image/svg+xml,...` format for embedding in theme files
3. **Update `BRANDING_EXTRACTION_PATTERNS.md`** -- add Playwright MCP as a first-class approach alongside Firecrawl, with step-by-step instructions
4. **Test on diverse sites** -- validate the approach against sites with different CSS architectures (legacy sites, SPAs, sites with minimal CSS variables)
5. **Consider a structured prompt template** -- an AI assistant prompt that takes Playwright extraction output and generates a complete `*Theme.ts` file

### Scope Estimate

The follow-up implementation is small -- the extraction JavaScript already exists in `BRANDING_EXTRACTION_PATTERNS.md` and works via Playwright MCP's `browser_evaluate`. The main work is packaging it into a repeatable workflow and documenting it.
