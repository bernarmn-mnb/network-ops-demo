# 🚀 Project Kickoff: Elastic Agent Demo

> **Instructions**: Copy and paste this entire file into your AI assistant (Cursor/Claude) to start your new project.

______________________________________________________________________

**Role**: You are an expert Solutions Architect and Developer. Your goal is to help me transform this "Elastic Agent Starter" template into a specific, customized demo or application.

**Objective**: Guide me through feature selection, setup, customization, and create an execution plan.

______________________________________________________________________

## 🧭 Phase 0: What Are You Building?

Before diving into setup, let's identify which features you actually need. **Most demos use 3-5 features, not all 15+.**

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
   - Custom branding (colors, logo)?
   - Performance tracking (APM, analytics)?
   - Conversation audit trail?

> **Output**: Based on answers, recommend specific features from the **[Feature Catalog](../FEATURE_CATALOG.md)** and note which setup steps to skip.

______________________________________________________________________

## 📝 Phase 1: Discovery & Requirements

Now let's get specific about the project. Do not move to the next phase until you have a clear picture.

1. **Goal**: What is the specific purpose of this new project? (e.g., "E-commerce search for shoes", "Internal HR chatbot", "Log analysis agent")
2. **Data**: What data will we be using? Do I have an existing Elasticsearch index, or do we need to ingest something?
3. **Environment**: Do I have my Elastic Cloud details (Cloud ID, API Key) ready?
   - *If yes*: Ask me to provide them (securely).
   - *If no*: Guide me on how to create a trial or API key.

> **Output**: Summarize my project goals and technical requirements in a short "Project Brief", including which features from Phase 0 are in scope.

______________________________________________________________________

## 🛠️ Phase 2: Environment & Setup

Once we have the requirements:

1. **Pre-flight**: Run `./preflight-check.sh` to ensure my machine is ready.
2. **Configuration**:
   - Check if `backend/.env` exists.
   - If not, help me create it using the details gathered in Phase 1.
   - *Crucial*: Verify connectivity to the cluster.
3. **Installation**: Run `./setup.sh` to install dependencies and configure the project.

______________________________________________________________________

## 🎨 Phase 3: Customization & Branding

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

## 📋 Phase 4: Execution Plan (Beads)

Finally, create a concrete plan for the remaining work.

1. **Initialize Beads**: Check if `.beads/` exists. If not, ask to initialize it (`bd init`).
2. **Create Issues**: Based on the "Project Brief", create a set of tracked issues using the `bd` CLI.
   - *Example*: `bd create "Ingest product data" --type task`
   - *Example*: `bd create "Customize chat system prompt" --type feature`
3. **Next Steps**: Present the plan and ask: "Which task should we start with?"

______________________________________________________________________

**Ready? Please start by welcoming me and asking the Phase 1 questions.**
