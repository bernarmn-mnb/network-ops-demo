## ADDED Requirements

### Requirement: Domain-authentic first impression
The demo SHALL present a {domain}-specific experience that a {role} stakeholder would recognise as a realistic representation of a {domain} application within 5 seconds of seeing any page.

#### Scenario: Visual domain identification
- **WHEN** a stakeholder sees any page for the first time
- **THEN** they can identify: the customer ({customer_name} branding), the domain ({domain}), and the primary action the page enables

#### Scenario: No template artifacts
- **WHEN** viewing any text, image, category, filter label, or interaction across the entire demo
- **THEN** no template placeholder text, generic demo-starter defaults, stock "Demo" titles, or default EUI boilerplate is visible

### Requirement: Domain-specific content and terminology
ALL visible text, categories, filter labels, result descriptions, chat messages, and navigation items MUST use {domain}-specific terminology that a {domain} professional would recognise.

#### Scenario: Expert recognition
- **WHEN** a {domain} professional reviews the page content
- **THEN** they recognise industry-standard terms, realistic categories, appropriate data structures, and domain-relevant workflows

#### Scenario: Data authenticity
- **WHEN** viewing search results, chat responses, or any data-driven content
- **THEN** the data reflects realistic {domain} entities with plausible values, not generic "Product 1" or "Item A" placeholders

### Requirement: Production-quality content density [MANDATORY — do not omit or weaken]
Pages SHALL have comparable information density to production {domain} applications — real categories, realistic data volumes, appropriate imagery, and domain-specific workflows. Sparse template-default layouts with excessive whitespace are not acceptable.

#### Scenario: Information density comparison
- **WHEN** comparing the demo to a production {domain} application
- **THEN** the demo pages contain comparable density of: navigation options, data fields per result, filter categories, and visual elements

#### Scenario: Imagery and visual richness [MANDATORY — do not omit or weaken]
- **WHEN** viewing any page in the demo
- **THEN** every page has at least 3 domain-relevant visual elements from: hero banners, card thumbnails, profile images, photo strips, illustrated icons, or data visualizations — pages are never text-only wireframes
- **AND** at least one page uses a full-width hero image (via `HeroSection` component or equivalent)
- **AND** images use Unsplash with `?w=&h=&fit=crop` parameters or local assets in `public/images/` — no broken image URLs

#### Scenario: Visual hierarchy and spacing
- **WHEN** viewing any page in the demo
- **THEN** a clear visual hierarchy is present: page hero or header (largest), section headings (medium), body content (standard)
- **AND** sections have consistent vertical padding (minimum 24px between major sections)
- **AND** content respects a max-width container (1200px) with appropriate side margins on wide screens
- **AND** card grids use consistent gap spacing (16-24px)

### Requirement: Chat agent persona visible in UI
If the demo includes an AI chat agent, the agent's persona (name, avatar, greeting) MUST be visible in the chat interface — not the template default.

#### Scenario: Branded chat identity
- **WHEN** the chat interface loads
- **THEN** the agent is identified by its persona name (not "Assistant"), has a custom avatar (not the default sparkles icon), and delivers a personalised greeting referencing {domain}

#### Scenario: Chat persona configuration
- **WHEN** configuring the chat agent
- **THEN** the agent's display name, avatar URL, and greeting text are set via `demoConfig.ts` or a dedicated `chatConfig.ts` — not hardcoded in the ChatPage component

### Requirement: Dark mode and theme consistency [MANDATORY — do not omit or weaken]
The demo SHALL render correctly in both light and dark EUI themes with consistent branding across all pages.

#### Scenario: Theme toggle preserves quality
- **WHEN** toggling between light and dark mode on every page
- **THEN** all text remains readable, borders are visible, branding colours adapt appropriately, and no hardcoded hex values cause contrast issues
- **AND** all backgrounds use CSS variables (`var(--euiColorEmptyShade)`, `var(--brand-background)`, etc.) — no hardcoded `#ffffff` or `#000000`

#### Scenario: Cross-page branding consistency
- **WHEN** navigating between any two pages in the demo
- **THEN** branding (colours, logo, fonts) is consistent and no page reverts to template defaults
