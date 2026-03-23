## ADDED Requirements

<!--
  DATA ARCHITECTURE SPEC TEMPLATE
  
  Use this template when the demo needs:
  - Multiple Elasticsearch indexes
  - Multiple agents with different personas/tools
  - Custom backend routes not in the template
  - Data pipelines or ingestion beyond standard OOTB
  
  For simple single-index, single-agent demos, this spec can be omitted.
-->

### Requirement: Data indexes
The demo SHALL use the following Elasticsearch indexes, each serving a distinct data domain.

#### Scenario: Primary index - {index_1_name}
- **GIVEN** the `{index_1_name}` index contains {data_description_1}
- **WHEN** a user interacts with {page_or_feature_1}
- **THEN** data is sourced from `{index_1_name}` with fields: {key_fields_1}

#### Scenario: Secondary index - {index_2_name}
- **GIVEN** the `{index_2_name}` index contains {data_description_2}
- **WHEN** a user interacts with {page_or_feature_2}
- **THEN** data is sourced from `{index_2_name}` with fields: {key_fields_2}

### Requirement: Agent architecture
The demo SHALL use {agent_count} agent(s), each with distinct personas and tool access.

#### Scenario: Primary agent - {agent_1_name}
- **GIVEN** an agent named "{agent_1_name}" configured with `{index_1_name}` search tools
- **WHEN** a user chats on {page_1}
- **THEN** the agent responds with {agent_1_persona} personality using data from `{index_1_name}`

#### Scenario: Secondary agent - {agent_2_name}
- **GIVEN** a separate agent named "{agent_2_name}" configured with `{index_2_name}` search tools
- **WHEN** a user chats on {page_2}
- **THEN** the agent responds with {agent_2_persona} personality using data from `{index_2_name}`

#### Scenario: Agent routing
- **WHEN** a user navigates between pages with different agents
- **THEN** each page connects to its designated agent, and conversations do not cross between agents

### Requirement: Data ingestion
All indexes SHALL be populated with domain-authentic data before demo delivery.

#### Scenario: Data quality
- **WHEN** querying any index
- **THEN** results contain realistic {domain} data with complete fields — no empty values, no "test" records, no placeholder content

#### Scenario: Data volume
- **WHEN** browsing search results with no filters
- **THEN** at least {min_record_count} results are available, providing enough variety for meaningful faceting and search

#### Scenario: Image variety
- **WHEN** viewing search results for a specific category
- **THEN** product images vary by category (e.g., shoes show shoe images, jackets show jacket images) — not the same generic photo repeated for all products in a sport. Use category-specific Unsplash queries for image URLs.

#### Scenario: Generation approach with fallback
- **WHEN** generating product data
- **THEN** LLM-powered generation is preferred for realistic descriptions, but a deterministic fallback script (using templates + random combinations) MUST exist in case the LLM proxy is unavailable or rate-limited

### Requirement: Backend routes
Any custom backend routes required beyond the template defaults SHALL be implemented and documented.

#### Scenario: Custom route - {route_description}
- **GIVEN** the backend is running
- **WHEN** `{http_method} {route_path}` is called with {sample_params}
- **THEN** the response contains {expected_data}
