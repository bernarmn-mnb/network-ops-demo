## Why

<!-- From the coaching conversation: what problem are we solving for this customer? Why now? -->

**Customer**: {customer_name}
**Industry**: {industry}
**Audience**: {who_will_see_this_demo}
**Demo type**: Customer Demo | Internal Showcase | POC | Training
**Timeline**: {deadline_and_constraints}

### Problem Statement

{What business problem are we solving? Be specific about the customer's pain points.}

**Pain points:**
- {pain_point_1}
- {pain_point_2}
- {pain_point_3}

### Why Elastic

{How does Elastic solve this? What's the differentiation vs alternatives?}

## What Changes

### Interview Output Contract (frozen after SA approval)

| Field | Value |
|-------|-------|
| **Target audience** | {who} |
| **Top 3 wow moments** | 1. {moment_1} 2. {moment_2} 3. {moment_3} |
| **Main demo path count** | {1-3} |
| **Chosen UX archetype** | {Investigative analytics / Triage console / Workflow cockpit / Assistant-led advisor / Hybrid} |
| **Minimum bar if time runs short** | {fallback_that_still_impresses} |
| **Out of scope / non-goals** | {what_we_are_NOT_building} |
| **Delivery method** | Localhost / Cloud Run + IAP |

### Persona

| Field | Value |
|-------|-------|
| **Name** | {persona_name} |
| **Role** | {job_title} |
| **Goals** | {what_they_want_to_achieve} |
| **Frustrations** | {problems_they_face_today} |

### User Journey

| Step | Action | What We Show | Talking Point |
|------|--------|--------------|---------------|
| 1 | {user_action} | {feature_or_page} | {key_message} |
| 2 | {user_action} | {feature_or_page} | {key_message} |
| 3 | {user_action} | {feature_or_page} | {key_message} |

### Demo Script Outline

**Opening (2 min):** {how_you_set_the_scene}

**Main demo scenes:**
1. **{scene_1_title}**: Action: {what_you_do}, Show: {what_appears}, Say: "{what_you_say}"
2. **{scene_2_title}**: Action: {what_you_do}, Show: {what_appears}, Say: "{what_you_say}"
3. **{scene_3_title}**: Action: {what_you_do}, Show: {what_appears}, Say: "{what_you_say}"

**Closing (2 min):** {how_you_wrap_up_and_call_to_action}

### Impact Criteria

**Wow moments** (ordered by narrative arc):
1. {wow_moment_1}
2. {wow_moment_2}
3. {wow_moment_3}

**Audience-specific hooks:**
- {hook_1 — what resonates with this audience}
- {hook_2}

## Capabilities

### New Capabilities
<!-- List each capability this demo needs. Each creates a spec file in specs/<name>/spec.md -->

- `demo-experience`: Quality contract — domain authenticity, production feel, no template artifacts
- `search-page`: Search configuration, faceted filtering, result display for {index_name}
- `{custom_page_name}`: {brief_description_of_custom_page}
- `{agent_name}`: Agent persona — {agent_role} with {domain} knowledge
- `branding`: {customer_name} brand extraction and application
- `golden-paths`: End-to-end demo journeys (UAT scenarios + demo guide source)
- `data-architecture`: {if multi-index or multi-agent, describe the architecture}

### Modified Capabilities
<!-- Only if this demo modifies capabilities from a previous demo build -->

## Impact

### Data
| Field | Value |
|-------|-------|
| **Source** | OOTB Dataset / LLM Generated / External Dataset / Custom |
| **Index name(s)** | {index_1}, {index_2 if applicable} |
| **Record count** | {approximate} |

### Features needed
| Feature | Needed | Notes |
|---------|--------|-------|
| Search UI | {Yes/No} | {index, key fields} |
| Agent Chat | {Yes/No} | {persona, tools} |
| Custom Pages | {Yes/No} | {page names and concepts} |
| Multi-Agent | {Yes/No} | {agent routing strategy} |
| Workflows | {Yes/No} | {workflow types} |
| Branding | {Yes/No} | {source URL} |
| Geo Search | {Yes/No} | {location data source} |
| Analytics | {Yes/No} | {what to track} |

### Environment
| Field | Value |
|-------|-------|
| **Elasticsearch** | Own Cluster / Shared Serverless |
| **Agent Builder** | Yes / No |
| **Deployment** | Localhost / Cloud Run + IAP |
