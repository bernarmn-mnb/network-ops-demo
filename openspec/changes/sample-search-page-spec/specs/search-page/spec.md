## ADDED Requirements

### Requirement: Search index configuration
The system SHALL connect to a domain-specific Elasticsearch index configured in `searchConfig.ts`. The index name MUST match the value set in `backend/.env` as `SEARCH_INDEX`.

#### Scenario: Index matches backend config
- **WHEN** the search page loads
- **THEN** queries are sent to the index specified in `SEARCH_INDEX` env var, not the template default

#### Scenario: Fields discovered via API
- **WHEN** the build agent configures `searchConfig.ts`
- **THEN** `GET /api/search/fields` is called first and `suggested_config` is used as the basis for field mappings

### Requirement: Search field mapping with boosts
The system SHALL map domain text fields to `fields.search` in `searchConfig.ts` with appropriate boost values. The primary title field MUST have the highest boost (3+), description fields MUST have lower boost (1-2).

#### Scenario: Boosted title field
- **WHEN** a user searches for a term that appears in both the title and description of a result
- **THEN** the result with the term in its title ranks higher than the result with the term only in description

#### Scenario: All searchable fields populated
- **WHEN** `searchConfig.ts` is configured
- **THEN** `fields.search` contains at least 2 entries mapped to real fields from the index (not template placeholders)

### Requirement: Result display mapping
The system SHALL map result fields to `display` properties so each result card shows: title, description, and at least one of image or badges.

#### Scenario: Title and description visible
- **WHEN** search results are displayed
- **THEN** each result card shows a non-empty title (from `display.title`) and a non-empty description (from `display.description`)

#### Scenario: Image or badge enrichment
- **WHEN** search results are displayed
- **THEN** each result card shows at least one visual element: either a thumbnail image (from `display.image`) or keyword badges (from `display.badges`)

#### Scenario: No placeholder text in results
- **WHEN** a search returns results from the actual indexed data
- **THEN** no result card contains template placeholder text such as "Product Name", "Description here", or "example.com"

### Requirement: Faceted filtering
The system SHALL provide sidebar facets for keyword-type fields that allow users to narrow search results.

#### Scenario: Facets produce non-empty buckets
- **WHEN** the search page loads with no active filters
- **THEN** at least 2 facets are visible in the sidebar, each with at least 2 selectable values (non-empty aggregation buckets)

#### Scenario: Facet selection filters results
- **WHEN** a user selects a facet value
- **THEN** the result count decreases and all visible results match the selected facet value

#### Scenario: Multiple facet combination
- **WHEN** a user selects values from two different facets
- **THEN** results are filtered by the intersection (AND logic) of both selections

### Requirement: Range filters for numeric fields
The system SHALL provide range filter controls (sliders or inputs) for numeric fields where min/max filtering adds value (price, rating, date).

#### Scenario: Range filter bounds match data
- **WHEN** a range filter is displayed
- **THEN** the min and max values reflect actual data bounds (not hardcoded 0-100)

#### Scenario: Range filter narrows results
- **WHEN** a user adjusts a range filter to a narrower band
- **THEN** all visible results have values within the selected range

### Requirement: Sort options
The system SHALL provide sort controls with domain-relevant options beyond default relevance sorting.

#### Scenario: At least two sort options
- **WHEN** the sort dropdown is opened
- **THEN** at least "Relevance" and one domain-specific sort option (e.g., price, date, rating) are available

#### Scenario: Sort changes result order
- **WHEN** a user selects a non-relevance sort option
- **THEN** results are reordered according to the selected field and direction

### Requirement: Empty state handling
The system SHALL display a helpful empty state when no results match the current query or filters.

#### Scenario: No results for query
- **WHEN** a search query returns zero results
- **THEN** the page displays a visual empty state (icon or illustration) with actionable text suggesting the user broaden their search or clear filters

#### Scenario: No results after filtering
- **WHEN** active filters produce zero results
- **THEN** the empty state includes a "Clear all filters" action that resets to the unfiltered state

### Requirement: Dark mode compatibility
The system SHALL render correctly in both light and dark EUI themes without hardcoded colors.

#### Scenario: Theme toggle preserves readability
- **WHEN** the user toggles between light and dark mode
- **THEN** all text remains readable, no elements become invisible, and no borders or backgrounds use hardcoded hex values
