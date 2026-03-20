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

### Requirement: Production-quality content density
Pages SHALL have comparable information density to production {domain} applications — real categories, realistic data volumes, appropriate imagery, and domain-specific workflows. Sparse template-default layouts with excessive whitespace are not acceptable.

#### Scenario: Information density comparison
- **WHEN** comparing the demo to a production {domain} application
- **THEN** the demo pages contain comparable density of: navigation options, data fields per result, filter categories, and visual elements

#### Scenario: Imagery and visual richness
- **WHEN** viewing any page in the demo
- **THEN** domain-relevant imagery is present (hero banners, card thumbnails, profile images, or illustrations) — pages are not text-only wireframes

### Requirement: Dark mode and theme consistency
The demo SHALL render correctly in both light and dark EUI themes with consistent branding across all pages.

#### Scenario: Theme toggle preserves quality
- **WHEN** toggling between light and dark mode on every page
- **THEN** all text remains readable, borders are visible, branding colours adapt appropriately, and no hardcoded hex values cause contrast issues

#### Scenario: Cross-page branding consistency
- **WHEN** navigating between any two pages in the demo
- **THEN** branding (colours, logo, fonts) is consistent and no page reverts to template defaults
