<p align="center">
  <img src="docs/images/logo.png" alt="Demo Starter" width="300">
</p>

# Elastic Demo Starter

[![CI](https://github.com/elastic/elastic-demo-starter/actions/workflows/ci.yml/badge.svg)](https://github.com/elastic/elastic-demo-starter/actions/workflows/ci.yml)

A **template library** for building customer demos with Elastic. Clone it, customise it for your customer, and contribute reusable pieces back.

> Created by **[Matt Adams](mailto:matthew.adams@elastic.co)** · Search AI Solutions, Elastic

This repository is the **golden master** — a verified, CI-tested foundation of architectural patterns for search, AI chat, analytics, branding, and deployment. Demo builders clone it, wire it up to their Elastic environment, and use AI-assisted development to build a compelling demo in hours. When you solve something generic (a new component, a better pattern, a bug fix), you contribute it back so the next person starts from an even better baseline.

**The workflow:** Clone &rarr; Setup &rarr; Build your demo &rarr; Contribute reusable work back &rarr; Template gets better for everyone.

## Project Vision

> **Build compelling customer demos in hours, not weeks.**
>
> This template provides verified architectural patterns, secure deployment models, and AI-assisted workflows that eliminate common pitfalls. What you demo reflects how we'd recommend customers build for real.
>
> **[Read the full Project Vision &rarr;](./docs/PROJECT_VISION.md)**

---

## 🎯 What Can You Build?

| Demo Type | Features | Key Technologies |
|-----------|----------|------------------|
| **🔍 Search Experiences** | Full-text search, faceted filtering, relevance tuning | Elasticsearch, RetrieverBuilder |
| **💬 AI Chat / Assistants** | Conversational AI, streaming responses, tool use | Agent Builder, SSE streaming |
| **🌐 Overlay Chat** | Inject AI chat onto any website without code changes | Tampermonkey userscript |
| **📊 Business Analytics** | Dashboards, visualizations, KPI tracking | ES\|QL, aggregations |
| **🛡️ Fraud Analytics** | Anomaly detection, pattern analysis, alert workflows | ES\|QL, ML features |
| **🔗 Multi-Agent Orchestration** | Coordinate multiple AI agents, complex workflows | A2A pattern, LLM coordinator |
| **📈 Search Analytics** | CTR tracking, zero-results analysis, relevance metrics | OTel, custom events |

> **Not sure what you need?** See the [Feature Catalog](./docs/FEATURE_CATALOG.md) for a guided selection of building blocks.

## Architecture

```
Frontend (Vite + React + EUI)  <-->  Backend (FastAPI)  <-->  Elastic Stack
         :3000                           :8001                (ES, Kibana, Agent Builder)
```

## Prerequisites

### Required: AI Coding Assistant ("Vibe Coding" Environment)

This project is designed for **AI-assisted development**. You'll need one of:

| Tool | Setup |
|------|-------|
| **[Cursor](https://cursor.sh)** | IDE with built-in AI (recommended) |
| **[Claude Code](https://claude.ai)** | VS Code extension |
| **GitHub Copilot** | Works, but won't use hive-mind patterns |

The setup script configures context files (`.cursorrules`, `CLAUDE.md`) that teach your AI assistant about the project patterns.

### System Requirements

Run `./preflight-check.sh` to verify all requirements, or check manually:

| Requirement | Minimum | Purpose | Status |
|-------------|---------|---------|--------|
| **uv** | Latest | Python & dependency manager | **Required** - setup.sh will offer to install |
| **Node.js** | 18+ | Frontend build (Vite) | **Required** - warns if older |
| **Git** | Any | Clone repo, submodules | **Required** |
| GitHub CLI (`gh`) | Any | Easier cloning/auth | Recommended |
| Yarn | Any | Faster npm alternative | Recommended |
| Firecrawl MCP | - | AI branding extraction | Optional (see [PREREQUISITES.md](./docs/PREREQUISITES.md)) |
| Docker | Any | Container deployment | Optional |
| Beads (`bd`) | Any | Issue tracking | Optional |

### Elastic Requirements

Depending on which features you want to use:

| Feature | Requirements |
|---------|-------------|
| **Search** | Elasticsearch URL + API Key + Index name |
| **AI Chat** | Kibana URL + API Key + Agent ID (from Agent Builder) |
| **Analytics** | Elasticsearch URL + API Key |
| **Multi-Agent** | Agent Builder + LLM Proxy URL |
| **Observability** | APM Server URL (optional) |

---

## Quick Start

### ⚡️ The "Vibe Coding" Way (Recommended)

The fastest way to get started is to let your AI assistant do the work.

1.  **Clone the repo**:
    ```bash
    git clone https://github.com/elastic/elastic-demo-starter.git my-demo
    cd my-demo
    ```

2.  **Open in your AI Editor**:
    *   **Cursor**: Open the folder, press `Cmd+L` (Chat), and type:
        > "Read docs/prompts/WELCOME_PROMPT.md and follow the instructions."
    *   **Claude Code**: Run `claude` in the terminal and type:
        > "Read docs/prompts/WELCOME_PROMPT.md and follow the instructions."

3.  **Follow the AI's lead**: It will interview you about your project goals, run the setup scripts, and create a customized execution plan.

---

### 🐢 The Manual Way

If you prefer to run commands yourself:

### 0. Pre-flight Check

After cloning, verify your environment has all prerequisites:

```bash
./preflight-check.sh
```

This checks for Python 3.12+, Node.js 18+, Git, and optional tools like GitHub CLI and Yarn. Run this **before** `./setup.sh` to catch issues early.

> **Full prerequisites guide**: See [PREREQUISITES.md](./docs/PREREQUISITES.md) for detailed installation instructions.

### 1. Clone the Repository

```bash
# Using GitHub CLI (recommended)
gh repo clone elastic/elastic-demo-starter my-demo

# OR using git directly
git clone https://github.com/elastic/elastic-demo-starter.git my-demo

cd my-demo
```

**Need GitHub CLI?**
```bash
brew install gh    # macOS
gh auth login      # Authenticate
```

### 2. Initialize Submodules

```bash
git submodule update --init --recursive
```

This downloads the `hive-mind/` shared knowledge base.

### 3. Run the Setup Wizard

```bash
./setup.sh
```

The wizard will:
1. ✅ **Validate environment** - Python 3.12+ (fails early if too old), Node.js 18+ (warns if older)
2. 🔌 **Check network** - Verifies connectivity to Elastic Cloud, npm, PyPI
3. 📦 **Initialize submodules** - Offers to fix if hive-mind is empty
4. 🎯 **Ask which features you want to configure:**
   - **Search** - Elasticsearch search UI with facets
   - **AI Chat** - Agent Builder integration (Chat, Demo, Audit, MCP)
   - **Analytics** - ES|QL dashboards and visualizations
   - **Multi-Agent** - A2A orchestration with LLM coordinator
   - **Observability** - OpenTelemetry (APM Traces, Click Tracking)
5. 🔧 **Validate credentials** - Warns if API key format looks wrong
6. 📦 **Install dependencies** - Shows errors if installation fails
7. 🎨 **Set up branding** (optional)
8. 🚀 **Launch the demo**

> **Tip**: You can re-run `./setup.sh` anytime to add more features or change configuration.

### Running the Demo

After setup, use the `./dev` script to manage servers:

```bash
./dev start            # Start servers in background
./dev stop             # Stop servers
./dev status           # Check if running (shows actual ports)
./dev verify           # Quick health check (setup, config, servers)
./dev verify-template  # Run template integrity checks (routes, contracts, registry)
./dev test-agent       # Test Agent Builder connectivity
./dev logs-snapshot    # View recent logs and exit
./dev open             # Open browser
```

Both servers **auto-reload** on code changes - no restart needed!

> **Note:** Ports are dynamic — multiple demos can run simultaneously on different ports. Use `./dev status` to see the actual URLs, or check `.dev-pids/backend.port` and `.dev-pids/frontend.port`.

### After Setup: Start a New AI Session

> **Note**: If you used the "Vibe Coding" Quick Start above, you can skip this section.

Once setup is complete, **open the project in Cursor or VS Code** and tell your AI:

```
Read and follow docs/prompts/WELCOME_PROMPT.md
```

> **Claude Code users**: CLAUDE.md detects `.setup-complete` and triggers the welcome prompt automatically — just start a new session.

The AI will interview you about your demo goals, propose a strategy, and create a customized execution plan. No more checklists — it's a collaborative brainstorm.

### Manual Dependency Setup (Advanced)

If you prefer to skip the wizard and set things up manually:

```bash
# Backend (uv)
cd backend
uv sync
cp .env.example .env      # Edit with your Elastic credentials
uv run elastic-demo-starter-backend

# Frontend (separate terminal)
cd frontend
yarn install
yarn dev
```

## Deployment (Docker)

This project includes a production-ready `docker-compose` setup.

### Prerequisites
- Docker Desktop installed
- Valid `.env` file in `backend/.env` (created via setup script)

### Build and Run

```bash
docker-compose up --build
```

The app will be available at the ports shown by `./dev status`.

### Architecture in Docker
- **Frontend**: Nginx container serving static React assets. Proxies `/api` requests to the backend.
- **Backend**: Python container running FastAPI with Uvicorn.


```env
KIBANA_URL=https://your-deployment.kb.region.gcp.elastic-cloud.com
ELASTICSEARCH_URL=https://your-deployment.es.region.gcp.elastic-cloud.com
ELASTIC_API_KEY=your_base64_api_key
AGENT_ID=your-agent-id
PORT=8001
```

### Frontend

No `.env` needed! The Vite config proxies `/api` to the backend automatically.

## Features

### 🔍 Search

Build powerful search experiences with Elasticsearch:

- ✅ Full-text search with relevance tuning
- ✅ Faceted filtering (categories, brands, price ranges)
- ✅ RetrieverBuilder for advanced query composition
- ✅ Search-as-you-type suggestions
- ✅ Result highlighting and pagination

### 💬 AI Chat (Agent Builder)

Create conversational AI assistants:

- ✅ SSE streaming chat with Agent Builder
- ✅ Real-time reasoning display (agent thinking)
- ✅ Tool call visualization
- ✅ Conversation persistence & audit trail
- ✅ Stream cancellation

### 🌐 Overlay Chat (Website Injection)

Demo AI on any website without modifying their code:

- ✅ Tampermonkey userscript for browser injection
- ✅ Floating chat widget on customer's live site
- ✅ Connects to your demo backend securely
- ✅ Auto-fetches branding from backend
- ✅ Works on sites with strict CSP

See [Overlay Pattern](./hive-mind/patterns/elastic/USERSCRIPT_INJECTION_PATTERN.md) for setup.

### 📊 Analytics

Build dashboards and track metrics:

- ✅ ES|QL powered queries
- ✅ Search analytics (CTR, MRR, zero-results tracking)
- ✅ Click tracking & user journey analysis
- ✅ Custom event pipelines

### 🔗 Multi-Agent (A2A)

Orchestrate complex AI workflows:

- ✅ LLM coordinator for multi-agent orchestration
- ✅ Connect multiple Agent Builder agents
- ✅ Unified conversation interface
- ✅ Agent routing based on intent

### 📡 Observability

Monitor and debug your demos:

- ✅ OpenTelemetry instrumentation
- ✅ APM traces for backend & search
- ✅ Distributed tracing across services

### 🎨 UI & Branding

Professional, customizable interfaces:

- ✅ Dark/light theme toggle
- ✅ Multi-brand theming with Brand Editor
- ✅ AI-powered brand extraction from websites
- ✅ EUI (Elastic UI) components
- ✅ Accessible, responsive design

### 🛠️ Developer Experience

Tools to accelerate development:

- ✅ Pre-flight environment check script
- ✅ Interactive setup wizard with validation
- ✅ Hot-reload for frontend & backend
- ✅ MCP server explorer
- ✅ Conversation audit tools

## Branding

This starter includes built-in support for multiple brand themes.

### Creating Your First Brand

There are two approaches to branding:

**Option 1: Brand Editor (Quick & Manual)**

Visit `/brands` in the running app to:
- Create new brands with color pickers
- Upload logos for light/dark modes
- Preview and switch between brands

Brands are stored in `backend/data/brands.json`.

**Option 2: AI-Powered Extraction (Recommended)**

For production-quality branding, use vibe coding to extract from a website:

```
"Extract branding from https://customer-website.com and create a theme file"
```

This creates a complete theme file with colors, fonts, logos, and CSS variables. **The brand is automatically discovered and registered** - no manual registration needed!

See `hive-mind/patterns/branding/BRANDING_EXTRACTION_PATTERNS.md` for the full extraction guide.

### Full Documentation

For complete branding documentation including:
- BrandTheme interface
- CSS variables reference
- Component patterns
- Troubleshooting

See **[BRANDING.md](./docs/BRANDING.md)**

## Issue Tracking with Beads (Optional)

This project optionally supports **[Beads](https://github.com/steveyegge/beads)** (`bd`), a lightweight issue tracker designed for AI-assisted development.

### Why Beads?

- 📋 Track tasks with dependencies (blockers)
- 🤖 AI assistants can read `bd ready` to see available work
- 🔗 Reference issues in commits: `[bd-XX] description`
- 📁 All data stored locally in `.beads/` (no external service)

### Setup

The setup script offers to install beads. If you skipped it:

```bash
# Install via Homebrew (recommended)
brew install steveyegge/beads/bd

# Or via npm
npm install -g @anthropic/bd

# Or via install script
curl -fsSL https://raw.githubusercontent.com/steveyegge/beads/main/scripts/install.sh | bash

# Initialize in your project
bd init
```

### Usage

```bash
bd ready                    # What can I work on? (no blockers)
bd list --status open       # All open issues
bd create "Add dark mode" --type feature
bd close bd-01 -r "Implemented in commit abc123"
```

### AI Integration

When beads is configured, your AI assistant will:
1. Check `bd ready` before starting work
2. Reference issues in commits: `[bd-XX] description`
3. Suggest closing issues when work is complete

See `hive-mind/meta/workflows/BEADS_ISSUE_TRACKER.md` for the full workflow guide.

---

## Hive Mind - Shared Knowledge Base

This project includes **Hive Mind** (`./hive-mind/`), a shared knowledge base of patterns, troubleshooting guides, and AI context. It's designed to accelerate development by providing verified, working solutions.

### What's in Hive Mind?

```
hive-mind/
├── patterns/              # 🏗️ Reusable Architecture
│   ├── elastic/           # Search, Agent Builder, RAG integration
│   │   ├── AGENT_BUILDER_INTEGRATION.md
│   │   ├── STREAMING_CHAT_UI_PATTERNS.md
│   │   └── ESQL_ANALYTICS_PATTERNS.md
│   ├── eui/               # UI Framework patterns
│   │   ├── EUI_VITE_INTEGRATION.md
│   │   └── EUI_NEXTJS_INTEGRATION.md
│   ├── branding/          # Dynamic theming
│   │   └── BRANDING_EXTRACTION_PATTERNS.md
│   └── deployment/        # Docker, production setup
│       └── DOCKER_PRODUCTION_SETUP.md
├── troubleshooting/       # 🔧 Known Issues & Fixes
└── meta/                  # 🤖 AI Configuration
    ├── workflows/         # Process guides (issue tracking, etc.)
    └── prompts/           # Customization prompts
```

### How It Works

When you use an AI coding assistant (Cursor, Claude Code, etc.) with this project:

1. **AI reads the patterns** - Your assistant sees verified solutions
2. **No reinventing wheels** - Common problems already solved
3. **Consistent quality** - Everyone follows the same "golden path"

### Contributing to Hive Mind

Found a better pattern? Fixed a tricky bug? **Share it!**

Hive Mind is a [git submodule](https://github.com/elastic/hive-mind) - your contributions help everyone:

```bash
# Make changes inside hive-mind/
cd hive-mind

# Commit and push (you need write access, or fork it)
git add .
git commit -m "Add pattern for XYZ"
git push

# Then update the submodule reference in the parent repo
cd ..
git add hive-mind
git commit -m "Update hive-mind submodule"
```

**Contribution guidelines:**
- 🎯 **Be generic** - Patterns should work for any customer/use case
- 🔒 **Sanitize** - No API keys, customer names, or specific URLs
- 📝 **Explain why** - AI needs context, not just code

See [hive-mind/README.md](./hive-mind/README.md) for full contribution guide.

---

## Project Structure

```
├── backend/                   # Python FastAPI server
│   ├── app/
│   │   ├── main.py           # FastAPI app entry
│   │   ├── config.py         # Environment config
│   │   ├── elasticsearch/    # ES client, search, queries
│   │   └── routes/           # 14 route modules (~50 endpoints)
│   │       ├── agent.py      # Agent Builder proxy
│   │       ├── search_simple.py  # Core search (POST, config, health)
│   │       ├── search.py     # Advanced search (suggest, capabilities, fields)
│   │       ├── audit.py      # Conversation & agent audit
│   │       ├── analytics.py  # ES|QL analytics
│   │       ├── tracking.py   # Click/event tracking
│   │       ├── a2a/          # Multi-agent orchestration
│   │       └── branding.py   # Brand CRUD API
│   ├── data/
│   │   └── brands.json       # Stored brand configs
│   └── requirements.txt
│
├── frontend/                  # Vite + React + EUI
│   ├── src/
│   │   ├── App.tsx           # Router setup (11 pages)
│   │   ├── pages/            # Page components
│   │   ├── components/       # 29 reusable components
│   │   ├── branding/         # Theme definitions
│   │   ├── hooks/            # React hooks
│   │   └── services/         # API clients
│   └── vite.config.ts
│
├── hive-mind/                 # Shared knowledge base (git submodule)
│   ├── patterns/             # 55+ reusable architecture patterns
│   ├── troubleshooting/      # Known issues & fixes
│   └── meta/                 # AI workflows & prompts
│
├── scripts/
│   ├── verify-template.py    # Template integrity suite (8 checks)
│   ├── check-localhost-urls.sh  # Hardcoded URL detection
│   └── interactive_setup.py  # Advanced manual setup
│
├── .github/workflows/ci.yml  # CI: build, lint, test, template integrity
├── preflight-check.sh        # Pre-clone environment check
├── setup.sh                  # Setup launcher
├── dev                       # Server management script
│
├── docs/
│   ├── prompts/WELCOME_PROMPT.md  # AI brainstorm (new session entry point)
│   ├── COMPONENT_REGISTRY.md     # What exists and its maturity
│   ├── USE_CASE_REGISTRY.md      # Demo use case coverage
│   └── FEATURE_CATALOG.md        # Building block selector
│
└── CONTRIBUTING.md            # How to contribute back to the template
```

## Documentation

| Document | Purpose |
|----------|---------|
| [PROJECT_VISION.md](./docs/PROJECT_VISION.md) | Project goals, roadmap, and success metrics |
| [FEATURE_CATALOG.md](./docs/FEATURE_CATALOG.md) | Pick the building blocks you need |
| [COMPONENT_REGISTRY.md](./docs/COMPONENT_REGISTRY.md) | What exists, file paths, and maturity status |
| [USE_CASE_REGISTRY.md](./docs/USE_CASE_REGISTRY.md) | Demo use case coverage and gaps |
| [WELCOME_PROMPT.md](./docs/prompts/WELCOME_PROMPT.md) | AI brainstorm prompt (new session entry point) |
| [BRANDING.md](./docs/BRANDING.md) | Brand theming system documentation |
| [DEPLOYMENT.md](./docs/DEPLOYMENT.md) | Cloud Run sidecar deployment guide |
| [PAGES.md](./docs/PAGES.md) | Page reference for demo builders |
| [CONTRIBUTING.md](./CONTRIBUTING.md) | How to contribute reusable work back to the template |

### Creating a Demo Guide

When building a demo for a specific customer or use case, copy the template:

```bash
cp docs/DEMO_GUIDE_TEMPLATE.md docs/DEMO_GUIDE.md
```

Then fill in the sections to document your demo's configuration, flow, and customizations.

## Contributing Back

The template improves because demo builders contribute their reusable work back. If you built something generic — a component, a pattern, a bug fix — it should go back into the template so the next person benefits.

See **[CONTRIBUTING.md](./CONTRIBUTING.md)** for the full guide, but the key steps are:

### Before Submitting a PR

```bash
./dev verify-template    # Must pass — catches route conflicts, contract drift, missing pages
```

This runs 8 structural checks that also run in CI. Your PR will fail if they don't pass.

### What Goes Where

| Contribution | Destination | Example |
|-------------|-------------|---------|
| Bug fixes, new components, features | **This repo** (PR) | New search component, fix broken route |
| Architecture patterns, troubleshooting | **Hive Mind** (submodule PR) | New integration pattern, error fix guide |
| Customer-specific code | **Your demo only** | Brand-specific logic, hardcoded data |

### Quick Workflow

```bash
# 1. Create a branch
git checkout -b feature/reusable-thing

# 2. Make changes, then verify
./dev verify-template

# 3. Push and open a PR
git push -u origin feature/reusable-thing
gh pr create
```

---

## Key Technical Notes

### SSE Event Types (Agent Builder)

| Event | Description |
|-------|-------------|
| `conversation_id_set` | New conversation started |
| `reasoning` | Agent thinking step |
| `thinking_complete` | Ready for text |
| `message_chunk` | Streaming text chunk |
| `message_complete` | Full response complete |

### Backend Proxy Pattern

Use `iter_content(chunk_size=None)` NOT `iter_lines()` to preserve SSE newlines:

```python
for chunk in upstream_response.iter_content(chunk_size=None):
    if chunk:
        yield chunk
```

## API Reference

### Chat Endpoint

```bash
POST /api/agent/chat
Content-Type: application/json

{
  "input": "Hello Agent",
  "conversation_id": "optional-for-continuation"
}
```

Returns: SSE stream

### Search Endpoint

```bash
POST /api/search
Content-Type: application/json

{
  "query": "laptop",
  "filters": { "category": ["Electronics"] },
  "page": 1,
  "size": 20
}
```

### Health Check

```bash
GET /api/agent/health
```

> Full OpenAPI docs available at `/docs` on the running backend (use `./dev status` for the URL).

## Telemetry

This project collects **optional, anonymous usage telemetry** to help us understand adoption and improve the starter kit.

**What's collected (with your consent):**
- Features configured (search, chat, analytics, etc.)
- Platform (macOS, Linux, Windows)
- Setup success/failure
- Optionally: your email and GitHub handle (for follow-up on issues)
- Optionally: a brief description of your use case

**What's NOT collected:**
- Credentials, API keys, or URLs
- Customer names or file paths
- Any data without explicit consent

You'll be asked at the end of `./setup.sh` whether to send telemetry. You can skip it entirely with no impact on functionality.

---

## Feedback

We'd love to hear how you're using this starter kit!

- **💡 Feature requests**: [Open a feature request](https://github.com/elastic/elastic-agent-starter/issues/new?template=feature_request.md)
- **🐛 Bug reports**: [Report an issue](https://github.com/elastic/elastic-agent-starter/issues/new?template=bug_report.md)
- **⭐ Show appreciation**: Star the repo if it's been helpful
- **💬 Questions & discussion**: [Start a discussion](https://github.com/elastic/elastic-agent-starter/discussions)

Your feedback helps prioritise improvements and identify pain points.

---

## Maintainer

Created and maintained by **Matt Adams** ([matthew.adams@elastic.co](mailto:matthew.adams@elastic.co)) — Search AI Solutions, Elastic.

Questions or ideas? Reach out on Slack: **#demo-starter**

---

## Re-running Setup

You can re-run `./setup.sh` anytime to:
- Add new feature configurations (Search, AI Chat, Analytics, etc.)
- Modify existing connections
- Reset and start fresh

The wizard remembers what's already configured and lets you choose what to update.

---

## Troubleshooting

### Quick Diagnostics

```bash
./preflight-check.sh     # Check prerequisites
./dev verify             # Check setup completeness
./dev verify-template    # Check template structural integrity
./dev status             # Check if servers running (shows ports)
./dev logs-snapshot      # View recent logs
./dev test-agent         # Test Agent Builder connection
```

### Common Issues

| Issue | Solution |
|-------|----------|
| "Python not found" or version too old | Install Python 3.12+: `brew install python3` |
| "Node not found" or version too old | Install Node 18+: `brew install node` |
| hive-mind folder empty | Run: `git submodule update --init --recursive` |
| API key errors (401) | Regenerate key in Kibana → Stack Management → API Keys |
| Agent not found | Run `./setup.sh` to list and select valid agents |
| Frontend won't start | Check `./dev logs-snapshot`, try `cd frontend && yarn install` |
| Backend won't start | Check `./dev logs-snapshot`, try `cd backend && ./venv/bin/pip install -r requirements.txt` |

### Detailed Troubleshooting

See **[hive-mind/troubleshooting/](./hive-mind/troubleshooting/)** for in-depth guides:
- [Agent Builder Error Reference](./hive-mind/troubleshooting/AGENT_BUILDER_ERROR_REFERENCE.md)
- [OTel Environment Variables](./hive-mind/troubleshooting/OTEL_ENV_VAR_FORMATTING.md)
