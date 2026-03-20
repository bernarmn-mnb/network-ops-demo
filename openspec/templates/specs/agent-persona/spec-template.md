## ADDED Requirements

### Requirement: Agent persona and identity
The chat agent SHALL present as "{agent_name}" — a {agent_role} for {customer_name}. The persona MUST be visible in the chat UI (custom name, avatar, and greeting).

#### Scenario: Branded chat identity
- **WHEN** the chat interface loads
- **THEN** the agent is identified by name ("{agent_name}"), has a custom avatar (not the default sparkles icon), and delivers a personalised greeting referencing {domain}

#### Scenario: Consistent persona voice
- **WHEN** the agent responds to any message
- **THEN** the tone, vocabulary, and style match a {agent_role} — {tone_description}

### Requirement: Domain knowledge and tool usage
The agent SHALL use its configured tools to provide {domain}-specific answers grounded in actual indexed data, not generic responses.

#### Scenario: Tool-grounded responses
- **WHEN** a user asks a {domain}-specific question (e.g., "{sample_question}")
- **THEN** the agent uses its search tools to find relevant data and includes specific details from the results in its response

#### Scenario: No hallucinated data
- **WHEN** the agent responds with specific claims (prices, availability, specifications)
- **THEN** those claims are traceable to actual documents in the configured search index

#### Scenario: Graceful unknowns
- **WHEN** a user asks about something not in the indexed data
- **THEN** the agent acknowledges the limitation rather than fabricating an answer

### Requirement: Conversation flow for demo scenarios
The agent SHALL handle the demo scenario conversation naturally, supporting the golden path narrative.

#### Scenario: Demo prompt quality
- **WHEN** a user sends one of the configured demo prompts
- **THEN** the agent responds with a comprehensive, well-formatted answer that showcases {domain} expertise and tool usage

#### Scenario: Multi-turn conversation
- **WHEN** a user follows up on a previous response
- **THEN** the agent maintains context and builds on the previous exchange

### Requirement: Response formatting
Agent responses SHALL be well-formatted with appropriate structure for the content type.

#### Scenario: Structured responses
- **WHEN** the agent provides a list, comparison, or multi-part answer
- **THEN** the response uses markdown formatting (headers, bullet points, bold key terms) for readability

#### Scenario: Concise responses
- **WHEN** the agent responds to a simple question
- **THEN** the response is concise and direct — not padded with unnecessary preamble
