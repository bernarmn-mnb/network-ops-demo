## ADDED Requirements

### Requirement: Brand extraction from source
Brand colours, logo, and typography SHALL be extracted from {source_url}, not guessed or generated.

#### Scenario: Colour accuracy
- **WHEN** comparing the demo's primary and accent colours to {source_url}
- **THEN** the colours are recognisably the same brand (extracted from the actual website, not approximated)

#### Scenario: Logo present
- **WHEN** viewing the app header
- **THEN** the {customer_name} logo is displayed (downloaded file, not a text placeholder)

#### Scenario: Extraction failure fallback
- **WHEN** automated extraction tools fail (Firecrawl unavailable, site blocks scraping)
- **THEN** the user is asked for brand assets — colours and logo are never guessed

### Requirement: Theme file completeness
The brand theme file SHALL define all required colour variables for both light and dark modes.

#### Scenario: Light mode colours
- **WHEN** the demo runs in light mode
- **THEN** all `var(--brand-*)` CSS variables resolve to {customer_name} brand colours

#### Scenario: Dark mode colours
- **WHEN** the demo runs in dark mode
- **THEN** all `var(--brand-*)` CSS variables resolve to appropriate dark-mode variants of the brand colours

### Requirement: Cross-page branding consistency
Branding SHALL be applied consistently across ALL pages in the demo, including search, chat, custom pages, and the demo guide.

#### Scenario: Every page is branded
- **WHEN** navigating to any page in the demo
- **THEN** the header shows the {customer_name} logo, page elements use brand colours, and no page reverts to template-default styling

#### Scenario: Side-by-side comparison
- **WHEN** viewing the demo alongside the {customer_name} website
- **THEN** a stakeholder would recognise the demo as being branded for {customer_name}
