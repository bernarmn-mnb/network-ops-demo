## ADDED Requirements

### Requirement: Page layout and interaction model
The {page_name} page SHALL use a {layout_description} layout that enables {primary_interaction}.

#### Scenario: Layout renders as designed
- **WHEN** the {page_name} page loads
- **THEN** the layout matches the design: {specific_layout_details}

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
- **THEN** at least one domain-relevant image is present (hero banner, card thumbnails, icons, or illustrations related to {domain})

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
