## ADDED Requirements

### Requirement: Page layout and interaction model
The {page_name} page SHALL use a {layout_description} layout that enables {primary_interaction}.

<!--
  VISUAL DESIGN DECISIONS — fill in each field during coaching.
  These drive the build agent's implementation. Do not leave them as placeholders.
-->

**Visual design:**
- Hero: {hero_type — one of: full-width image hero, compact section header, gradient banner, none}
- Hero image: {hero_image_source — e.g. "Unsplash: modern newsroom", "customer logo on brand gradient", "none"}
- Image strategy: {image_approach — one of: Unsplash with domain category, customer-provided assets, data-driven image_url field, icon-based}
- Grid pattern: {grid_pattern — one of: 3-column card grid, 2-column split (content + chat), list view, dashboard panels, tabbed sections}
- Imagery count: {min_images — minimum number of visual elements on the page, recommend 3+}
- Empty state: {empty_state_design — describe what appears when no data: image/icon, message, suggested action}

#### Scenario: Layout renders as designed
- **WHEN** the {page_name} page loads
- **THEN** the page displays: {hero_type} at the top, followed by {grid_pattern} containing domain content
- **AND** the visual design decisions above are reflected in the implementation

#### Scenario: Visual hierarchy is clear
- **WHEN** viewing the {page_name} page
- **THEN** the visual weight follows: hero/page header (largest) > section headings > card content > metadata
- **AND** at least {min_images} domain-relevant visual elements are present

#### Scenario: Primary interaction works
- **WHEN** a user performs the primary action ({primary_action})
- **THEN** {expected_response}

### Requirement: Hook composition and data flow
The page SHALL compose {hooks_list} to provide {capabilities_description}.

#### Scenario: Search-to-chat handoff
- **WHEN** a user {trigger_action} on a search result
- **THEN** the action triggers the chat/agent with the relevant context from the result

#### Scenario: Data flows end-to-end
- **WHEN** the page loads with the backend running
- **THEN** {data_source} returns results and all display elements are populated with real data

### Requirement: Domain-specific content
All visible text, categories, actions, and imagery on the {page_name} page MUST reflect {domain} terminology and conventions.

#### Scenario: Domain terminology throughout
- **WHEN** viewing any text element on the page (headings, labels, buttons, descriptions)
- **THEN** {domain}-specific terms are used, not generic labels like "Item", "Category", or "Submit"

#### Scenario: Domain-relevant imagery
- **WHEN** viewing the page
- **THEN** at least {min_images} domain-relevant images are present, using the {image_approach} strategy defined in the visual design section
- **AND** images have appropriate sizing (heroes: full-width, cards: consistent aspect ratio, thumbnails: 80-120px)
- **AND** all images include `loading="lazy"` for performance

### Requirement: Empty states and loading
Empty and loading states SHALL have visual weight and domain-appropriate messaging.

#### Scenario: No data state
- **WHEN** the page loads but no data matches the current view
- **THEN** a visual empty state appears with {domain}-specific text explaining what the user can do

#### Scenario: Loading state
- **WHEN** data is being fetched
- **THEN** a loading indicator is visible (EUI loading spinner or skeleton) — no blank screen

### Requirement: Responsive layout
The page SHALL be usable at both desktop (1200px+) and tablet (768px) widths.

#### Scenario: Desktop layout
- **WHEN** viewed at 1200px+ width
- **THEN** the full layout is visible with all panels/sections properly sized

#### Scenario: Tablet layout
- **WHEN** viewed at 768px width
- **THEN** the layout adapts gracefully (panels stack or collapse) and no content is cut off

### Requirement: Fixed header awareness
Page content SHALL not be hidden behind the 56px fixed app header.

#### Scenario: Content visible below header
- **WHEN** the page loads
- **THEN** no content is obscured by the fixed header — all elements are fully visible and accessible
