## ADDED Requirements

### Requirement: Search index configuration
The search page SHALL query a domain-specific Elasticsearch index matching the `SEARCH_INDEX` value in `backend/.env`.

#### Scenario: Index matches backend config
- **WHEN** the search page loads and a query is executed
- **THEN** results come from the configured `SEARCH_INDEX`, not the template default

#### Scenario: Fields discovered via API
- **WHEN** configuring `searchConfig.ts`
- **THEN** `GET /api/search/fields` is called first and `suggested_config` is used as the basis for field mappings

### Requirement: Search field mapping with domain-appropriate boosts
The system SHALL map domain text fields to `fields.search` with boost values that reflect field importance. The primary title/name field MUST have the highest boost (3+).

#### Scenario: Title-boosted ranking
- **WHEN** a user searches for a term that appears in both the title and description of different results
- **THEN** the result with the term in its title ranks higher

#### Scenario: All searchable fields populated
- **WHEN** `searchConfig.ts` is configured
- **THEN** `fields.search` contains at least 2 entries mapped to real index fields with explicit boost values

### Requirement: Domain-relevant result display
Each result card SHALL show: a meaningful title, a descriptive summary, and visual elements that convey information density. All content MUST use {domain}-specific terminology.

#### Scenario: Complete result cards
- **WHEN** search results are displayed
- **THEN** each card shows a non-empty title, a non-empty description, and at least TWO of: thumbnail image, keyword badges, colored status/sentiment indicator, metadata line (date, source, author), or rating/score display
- **AND** cards have consistent visual weight — no card is just a title and bare text

#### Scenario: Domain-specific result content
- **WHEN** viewing any result card
- **THEN** the title, description, badges, and any metadata use {domain} terminology — not generic field names or template defaults

### Requirement: Faceted filtering with non-empty buckets
The search page SHALL provide sidebar facets for keyword-type fields. Each facet MUST produce at least 2 selectable values with the full dataset.

#### Scenario: Facets render with values
- **WHEN** the search page loads with no active filters
- **THEN** at least 2 facets are visible, each with at least 2 selectable values

#### Scenario: Facet filtering works
- **WHEN** a user selects a facet value
- **THEN** result count decreases and all visible results match the selected value

#### Scenario: Multi-facet AND logic
- **WHEN** a user selects values from two different facets
- **THEN** results reflect the intersection of both selections

### Requirement: Range filters with data-accurate bounds
Range filter controls SHALL have min/max values that reflect the actual data distribution, not hardcoded defaults.

#### Scenario: Bounds match data
- **WHEN** a range filter is displayed
- **THEN** the min/max values correspond to the actual data range in the index

### Requirement: Domain-relevant sort options
The sort dropdown SHALL include at least "Relevance" and one {domain}-specific sort field.

#### Scenario: Sort options available
- **WHEN** the sort dropdown is opened
- **THEN** at least "Relevance" and one domain-specific option (e.g., {sort_field}) are available

### Requirement: Empty state handling
Zero-result states SHALL display a visual element and actionable text.

#### Scenario: Query with no results
- **WHEN** a search returns zero results
- **THEN** a visual empty state appears with a suggestion to broaden the search or clear filters

#### Scenario: Filter combination with no results
- **WHEN** active filters produce zero results
- **THEN** a "Clear all filters" action is available and functional
