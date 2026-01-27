<p align="center">
  <img src="docs/images/logo.png" alt="Demo Starter" width="300">
</p>

# Elastic Demo Starter

[![CI](https://github.com/elastic/elastic-demo-starter/actions/workflows/ci.yml/badge.svg)](https://github.com/elastic/elastic-demo-starter/actions/workflows/ci.yml)

A production-ready starter kit for building demos with Elastic. Covers **Search**, **AI Chat**, **Analytics**, and more — with modern UI components and best practices built in.

This repository serves as a "Golden Master" for building custom Elastic demos. It comes pre-wired with correct architectural patterns for streaming chat, search experiences, analytics dashboards, and brand theming — avoiding common pitfalls and accelerating development.

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
| **Python** | 3.12+ | Backend server (FastAPI) | **Required** - setup fails if missing/old |
| **Node.js** | 18+ | Frontend build (Vite) | **Required** - warns if older |
| **Git** | Any | Clone repo, submodules | **Required** |
| GitHub CLI (`gh`) | Any | Easier cloning/auth | Recommended |
| **uv** | Latest | Backend dependency manager | **Required** for backend/dev (setup can fall back) |
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
./dev start       # Start servers in background
./dev stop        # Stop servers
./dev status      # Check if running
./dev verify      # Quick health check (setup, config, servers)
./dev test-agent  # Test Agent Builder connectivity
./dev logs        # View server logs (follows)
./dev logs-snapshot  # View recent logs and exit
./dev open        # Open browser
```

Both servers **auto-reload** on code changes - no restart needed!

### Makefile Shortcuts (Optional)

If you prefer Make targets, the Makefile quick reference maps to the most common tasks:

```bash
make start   # Start development servers
make stop    # Stop servers
make status  # Check server status
make test    # Run all tests
make check   # Run lint and test
make help    # Show all available targets
```

- Frontend: http://localhost:3000
- Backend API: http://localhost:8001/docs

### After Setup: Onboarding Your AI Assistant

> **Note**: If you used the "Vibe Coding" Quick Start above, you can skip this section.

Once the servers are running, **open the project in Cursor or VS Code** and tell your AI:

```
Read and follow docs/ONBOARDING.md
```

This will:
1. ✅ Verify your environment is correctly set up
2. 🧠 Load the hive-mind patterns into context
3. 🎨 Set up branding (if you provided a URL during setup)
4. 📋 Configure beads issue tracking (if installed)

After onboarding, you're ready to **vibe code** - ask your AI to add features, fix bugs, or customize the UI!

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

The app will be available at:
- Frontend: http://localhost:3000
- Backend: http://localhost:8000

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

Visit http://localhost:3000/brands to:
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
│   │   └── routes/
│   │       ├── agent.py      # Agent Builder proxy
│   │       ├── search.py     # Search endpoints
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
│   │   ├── App.tsx           # Router setup
│   │   ├── pages/            # Page components
│   │   │   ├── ChatPage.tsx      # AI chat interface
│   │   │   ├── SearchPageSimple.tsx  # Search UI
│   │   │   ├── A2AChatPage.tsx   # Multi-agent chat
│   │   │   └── AuditPage.tsx     # Conversation audit
│   │   ├── components/
│   │   │   ├── chat/         # Chat UI components
│   │   │   ├── search/       # Search components
│   │   │   ├── layout/       # Headers, theme toggle
│   │   │   └── branding/     # Brand switcher
│   │   ├── branding/         # Theme definitions
│   │   ├── hooks/
│   │   │   └── useAgentChat.ts
│   │   └── services/
│   │       └── agentApi.ts   # SSE client
│   └── vite.config.ts
│
├── hive-mind/                 # 🧠 Shared knowledge base (submodule)
│   └── (see above)
│
├── scripts/
│   └── interactive_setup.py  # Setup wizard
│
├── preflight-check.sh        # Pre-clone environment check
├── setup.sh                  # Setup launcher
├── dev                       # Server management script
├── docs/PREREQUISITES.md     # Detailed prerequisites guide
├── docs/ONBOARDING.md        # AI assistant onboarding prompt
└── docs/BRANDING.md          # Branding documentation
```

## Documentation

| Document | Purpose |
|----------|---------|
| [FEATURE_CATALOG.md](./docs/FEATURE_CATALOG.md) | **Start here** — Pick the building blocks you need |
| [ONBOARDING.md](./docs/ONBOARDING.md) | First-time setup guide for AI assistants |
| [CUSTOMIZATION.md](./docs/CUSTOMIZATION.md) | Chat interface customization options |
| [BRANDING.md](./docs/BRANDING.md) | Brand theming system documentation |
| [docs/PAGES.md](./docs/PAGES.md) | Page reference for demo builders |
| [DEMO_GUIDE_TEMPLATE.md](./docs/DEMO_GUIDE_TEMPLATE.md) | Template for documenting your demo |
| [CONTRIBUTING.md](./CONTRIBUTING.md) | How to contribute to the template |

### Creating a Demo Guide

When building a demo for a specific customer or use case, copy the template:

```bash
cp docs/DEMO_GUIDE_TEMPLATE.md docs/DEMO_GUIDE.md
```

Then fill in the sections to document your demo's configuration, flow, and customizations.

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
POST http://localhost:8001/api/agent/chat
Content-Type: application/json

{
  "input": "Hello Agent",
  "conversation_id": "optional-for-continuation"
}
```

Returns: SSE stream

### Search Endpoint

```bash
POST http://localhost:8001/api/search
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
GET http://localhost:8001/api/agent/health
```

## Contributing

There are **two ways to contribute**, depending on what you're improving:

### 1. Contribute to Hive Mind (Patterns & Knowledge)

Found a solution to a tricky problem? Add it to **hive-mind** so everyone benefits:

```bash
cd hive-mind
# Add your pattern to the appropriate directory
# e.g., hive-mind/patterns/elastic/MY_NEW_PATTERN.md
git add .
git commit -m "Add pattern for handling XYZ"
git push  # (requires write access, or fork hive-mind repo)
```

**What to contribute to hive-mind:**
- 🔧 Troubleshooting guides for common errors
- 🏗️ Reusable architecture patterns
- 📝 AI context and prompts

### 2. Contribute to the Starter (Code & Features)

For code changes, use the **fork workflow**:

1. **Fork this repository** on GitHub

2. **Clone your fork:**
   ```bash
   git clone https://github.com/YOUR_USERNAME/elastic-demo-starter.git
   cd elastic-demo-starter
   git submodule update --init --recursive
   ```

3. **Add upstream remote:**
   ```bash
   git remote add upstream https://github.com/elastic/elastic-demo-starter.git
   ```

4. **Run setup:** `./setup.sh`

5. **Create a branch, make changes, push, and open a PR**

**What to contribute to the starter:**
- 🐛 Bug fixes
- ✨ New features
- 🎨 Brand themes (add to `frontend/src/branding/`)
- 📝 Documentation

### Syncing Updates

```bash
git fetch upstream
git merge upstream/main
git submodule update --init --recursive  # Also update hive-mind
```

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
./preflight-check.sh  # Check prerequisites
./dev verify          # Check setup completeness
./dev status          # Check if servers running
./dev logs-snapshot   # View recent logs
./dev test-agent      # Test Agent Builder connection
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
