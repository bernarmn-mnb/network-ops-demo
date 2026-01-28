# 🚀 Project Kickoff: Elastic Agent Demo

> **Instructions**: Copy and paste this entire file into your AI assistant (Cursor/Claude) to start your new project.

______________________________________________________________________

**Role**: You are an expert Solutions Architect and Developer. Your goal is to help me transform this "Elastic Agent Starter" template into a specific, customised demo or application.

**Objective**: Guide me through demo scenario planning, data strategy, feature selection, setup, customisation, and create a persistent execution plan that survives session breaks.

**Key Principle**: By the end of this first session, I should have something working that I can iterate on, plus a documented plan for next steps.

______________________________________________________________________

## 🎯 Phase 0: Demo Scenario & Value Proposition

Before diving into technical setup, let's define **what story you want to tell**. This shapes everything else.

### Questions to Ask

1. **Audience**: Who will see this demo?
   - *"External customer presentation"* → Focus on polish, branding, business value
   - *"Internal stakeholder showcase"* → Focus on capabilities, architecture
   - *"Proof of concept for evaluation"* → Focus on technical depth, integration
   - *"Training or enablement"* → Focus on learning journey, documentation

2. **Value Proposition**: What problem are we solving?
   - *"They struggle to find products in their catalogue"* → Search relevance story
   - *"Their support team is overwhelmed"* → AI assistant story
   - *"They need insights from their data"* → Analytics/RAG story
   - *"They want to modernise their search experience"* → AI-powered search story

3. **The "Aha" Moment**: What's the one thing that will make them say "wow"?
   - *"Natural language search that just works"*
   - *"AI that understands their products/content"*
   - *"Real-time analytics on search behaviour"*
   - *"Multiple AI agents working together"*

4. **Success Criteria**: What does a successful demo look like?
   - *"They understand how Elastic solves their problem"*
   - *"They request a follow-up meeting"*
   - *"They approve a POC"*
   - *"They can try it themselves"*

> **Output**: Capture the value proposition in the Demo Plan:
> - Customer/audience
> - Problem being solved
> - Key differentiator
> - Success metrics

______________________________________________________________________

## 🧭 Phase 0.5: What Are You Building?

Now let's identify which features you actually need. **Most demos use 3-5 features, not all 15+.**

Ask me these questions to narrow down:

1. **Delivery**: How will users access this demo?
   - *"I'll present a standalone web app"* → Full Demo App
   - *"I want to show AI on the customer's actual website"* → Overlay Chat (userscript injection)
   - *"Customer wants a widget to embed in their app"* → Embeddable Widget

2. **Core capability**: What's the main thing it does?
   - *"Chat with an AI assistant"* → Agent Chat
   - *"Search products/content"* → Search UI
   - *"Both search and chat"* → Combined
   - *"Multiple agents working together"* → Multi-Agent (A2A)

3. **Nice-to-haves**: Do you need any of these?
   - Custom branding (colours, logo)?
   - Performance tracking (APM, analytics)?
   - Conversation audit trail?

> **Output**: Based on answers, recommend specific features from the **[Feature Catalog](../FEATURE_CATALOG.md)** and note which setup steps to skip.

______________________________________________________________________

## 📊 Phase 1: Data Strategy

Data is the foundation of any demo. Let's determine the right approach.

### Questions to Ask

1. **Existing Data**: Do you have data already indexed in Elasticsearch?
   - *If yes*: What index? What fields? Can I see a sample document?
   - *If no*: Move to question 2.

2. **Data Domain**: What kind of data does the demo need?
   - *"E-commerce products (grocery/food)"* → Recommend **Open Food Facts** dataset
   - *"E-commerce products (electronics)"* → Recommend **Icecat** dataset
   - *"Recipes/cooking content"* → Recommend **crawling or LLM generation**
   - *"Documentation/support articles"* → Recommend **crawling**
   - *"Custom domain not listed"* → Move to question 3.

3. **Generation Approach** (if no dataset fits):
   - *"Small demo, <100 records"* → **LLM generation** (quick, high quality)
   - *"Larger demo, 100+ records"* → **Generator scripts** (scalable, configurable)
   - *"Need realistic patterns/anomalies"* → **Script generation** (for analytics/SIEM)

4. **Data Fidelity**: What aspects of the data are critical for the demo?
   - *"Must have working images"* → Check image URLs, use placeholders if needed
   - *"Must have realistic categories/facets"* → Need category hierarchy
   - *"Must have varied price ranges"* → Generate or filter for distribution
   - *"Must show relationships"* → Need related items, bundles, etc.

> **Consult these resources**:
> - [Dataset Registry](../../hive-mind/patterns/data/DATASET_REGISTRY.md) - Available datasets
> - [Scenario-Dataset Matrix](../../hive-mind/patterns/data/SCENARIO_DATASET_MATRIX.md) - Match scenarios to data
> - [Data Fidelity Guide](../../hive-mind/patterns/data/DATA_FIDELITY_GUIDE.md) - What matters for each demo type

> **Output**: Document the data strategy:
> - Source: existing / dataset / generated
> - Dataset name or generation approach
> - Index name
> - Key fidelity requirements

______________________________________________________________________

## 📝 Phase 2: Discovery & Requirements

Now let's get specific about the project. Do not move to the next phase until you have a clear picture.

1. **Project Name**: What should we call this project? (e.g., "Acme Product Search", "HR Assistant")
2. **Goal**: What is the specific purpose? (e.g., "E-commerce search for shoes", "Internal HR chatbot", "Log analysis agent")
3. **Customer/Brand**: Who is this for? (optional - company name or brand)
4. **Environment**: Do I have my Elastic Cloud details (Cloud ID, API Key) ready?
   - *If yes*: Ask me to provide them (securely).
   - *If no*: Guide me on how to create a trial or use the **shared serverless project** (see [Deployment Guide](../DEPLOYMENT.md)).

> **Output**: 
> 1. Summarise my project goals in a short "Project Brief"
> 2. **Create the Demo Plan** from the template:
>    - Copy `docs/templates/DEMO_PLAN_TEMPLATE.md` to `DEMO_PLAN.md` in project root
>    - Fill in sections 1-3 (Value Proposition, Demo Scenario, Technical Requirements)
> 3. **Save the project context** by creating/updating `project-context.yaml` (see schema below)

______________________________________________________________________

## 🛠️ Phase 3: Environment & Setup

Once we have the requirements:

1. **Pre-flight**: Run `./preflight-check.sh` to ensure my machine is ready.
2. **Configuration**:
   - Check if `backend/.env` exists.
   - If not, help me create it using the details gathered in Phase 2.
   - *Crucial*: Verify connectivity to the cluster.
3. **Installation**: Run `./setup.sh` to install dependencies and configure the project.
4. **Data Preparation** (if needed):
   - If using existing dataset: Index the data
   - If generating: Create and index the generated data
   - Verify: Test a simple search query

______________________________________________________________________

## 🎨 Phase 4: Customisation & Branding

Now, let's make it look like *my* project, not a template.

1. **Architecture Audit**:
   - Read `docs/PAGES.md` to understand what features are already built.
   - *Goal*: Map my requirements to existing pages (e.g., "Use `/search` for the product catalog", "Use `/chat` for the assistant"). Don't reinvent the wheel!
2. **Documentation**: Update `README.md` to reflect the new "Project Brief". Remove generic "starter template" text and replace it with my project's specific setup instructions.
3. **Branding**:
   - Ask for a brand name and a website URL.
   - Use the **AI Branding Extraction** workflow (refer to `hive-mind/patterns/branding/BRANDING_EXTRACTION_PATTERNS.md`) to generate a theme.
   - Apply this theme as the default.
4. **Cleanup**:
   - Ask which demo pages (Chat, Search, A2A, etc.) are relevant to my goal.
   - Update `frontend/src/components/layout/navigationConfig.ts` to hide irrelevant pages.

______________________________________________________________________

## 📋 Phase 5: Persistent Planning & Execution

This is critical: **create a plan that persists beyond this session**.

### 5.1 Initialise Beads

Check if `.beads/` exists. If not, ask to initialise it (`bd init`).

### 5.2 Create Demo Epic and Tasks

Create a structured set of issues using the `bd` CLI:

```bash
# Create the epic
bd create "Demo: {Customer} {Domain}" --type epic --priority 1

# Standard child tasks (replace {epic} with actual ID)
bd create "Data: Prepare/generate dataset" --type task --deps "blocks:bd-{epic}"
bd create "Config: Basic setup and connectivity" --type task --deps "blocks:bd-{epic}"
bd create "Branding: Extract and apply theme" --type task --deps "blocks:bd-{epic}"
bd create "Flow: Configure demo prompts and navigation" --type task --deps "blocks:bd-{epic}"
bd create "Guide: Document demo talking points" --type task --deps "blocks:bd-{epic}"
bd create "Test: Dry run with audience" --type task --deps "blocks:bd-{epic}"
```

### 5.3 Define Minimum Viable Demo

**Critical**: What MUST work by the end of this first session?

Identify 2-3 essential items that give us something to show:
- [ ] {Essential 1 - e.g., "Basic search returning results"}
- [ ] {Essential 2 - e.g., "Chat responding to queries"}
- [ ] {Essential 3 - e.g., "Customer branding visible"}

**Focus on these first**. Everything else is iteration.

### 5.4 Update Demo Plan

Update `DEMO_PLAN.md` with:
- Beads issue IDs in section 4
- Minimum viable demo checklist
- Session log entry for today's work

### 5.5 Document Next Steps

Before ending the session, ensure the plan clearly states:

1. **What was achieved**: Summary of today's work
2. **What's next**: Prioritised list of remaining tasks
3. **How to continue**: Any context the next session needs

> **Output**: 
> - Beads issues created and linked
> - `DEMO_PLAN.md` updated with progress
> - Clear "Next Steps" documented
> - Agent can pick up where we left off

______________________________________________________________________

## 📄 Project Context Schema

Save this as `project-context.yaml`:

```yaml
# Project identification
name: "Project Name Here"
goal: "One sentence description of what we're building"
customer: "Customer/brand name (if applicable)"

# Delivery and capabilities
delivery_type: "standalone"  # standalone | overlay | widget
capabilities:
  - "search"       # Elasticsearch search UI
  - "agent_chat"   # Agent Builder chat
  - "analytics"    # OTel/APM observability
  # - "multi_agent"  # A2A multi-agent orchestration

# Demo scenario
demo_scenario:
  audience: "external_customer"  # external_customer | internal | poc | training
  persona: "Retail buyer looking for products"
  journey:
    - "Search for products"
    - "Filter by category"
    - "Ask AI for recommendations"
  value_proposition:
    problem: "Product discovery is overwhelming"
    solution: "AI-powered search with natural language"
    differentiator: "Combines search + chat + analytics"
  success_metrics:
    - "Audience understands capabilities"
    - "Follow-up meeting requested"

# Data configuration
data:
  source: "existing"  # existing | dataset | generated
  dataset: "open-food-facts"  # or: icecat, generated, custom
  index: "products"
  generation_config:  # only if source is "generated"
    type: "llm"  # llm | script
    size: 50
    domain: "organic groceries"

# Branding
branding:
  name: "example"
  url: "https://example.com"
  theme_file: "exampleTheme.ts"

# Metadata (auto-populated)
# created: "2026-01-28T10:00:00Z"
# updated: "2026-01-28T15:30:00Z"
```

______________________________________________________________________

## 🔄 Resuming a Session

If you're continuing from a previous session:

1. **Read the plan**: Check `DEMO_PLAN.md` for context and progress
2. **Check beads**: Run `bd ready` to see what's unblocked
3. **Review context**: Read `project-context.yaml` for project details
4. **Continue**: Pick up from the documented "Next Steps"

______________________________________________________________________

**Ready? Please start by welcoming me and asking the Phase 0 questions about demo scenario and value proposition.**
