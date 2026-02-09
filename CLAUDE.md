# Project Rules

> **Single Source of Truth** for AI coding assistants (Claude Code, Cursor, etc.)
> `.cursorrules` points here - no need to maintain two files.

---

## Hive Mind Integration

This project uses a shared knowledge base at `./hive-mind` (git submodule).

### AT STARTUP
1. Check if the `./hive-mind` folder exists and is not empty.
   If it is missing or empty, **STOP** and ask the user:
   > "The Hive Mind context is missing. Would you like me to run the setup script to download it?"

2. Check if `./.beads` folder exists.
   If it exists, this project uses **beads (bd)** for issue tracking.
   - Run `bd ready` and `bd blocked` to understand current work state
   - Always `bd show <id>` to read acceptance criteria before starting an issue
   - See the **Issue Tracking with Beads** section below for full workflow

### AFTER SETUP (New Demo Session)

When `DEMO_PLAN.md` exists:
- This is a returning session — read `DEMO_PLAN.md` for context
- Run `bd ready` to pick up where the last session left off

When `DEMO_PLAN.md` does NOT exist:
- This is a new demo session — read and follow `docs/prompts/WELCOME_PROMPT.md`

When `.setup-complete` does NOT exist:
- Run `./setup.sh` to configure the environment. It auto-connects to the shared OOTB cluster
  (if GitHub CLI is authenticated) and installs all dependencies silently.
- If `./setup.sh` fails or the user prefers manual setup, check `./dev status` and `backend/.env`
  to see if the environment is already functional — proceed normally if it is.

### ALWAYS Index These Directories
- `./hive-mind/patterns/` - Reusable architecture patterns
- `./hive-mind/troubleshooting/` - Bug fixes and solutions
- `./hive-mind/meta/` - Workflows and AI guidance

### Before Generating New Code
1. **CHECK** `./hive-mind/patterns/` for existing solutions
2. **REUSE** patterns rather than inventing new approaches
3. **FOLLOW** the established conventions in existing patterns

### After Making Changes (Before PRs)
1. **RUN** `./dev verify-template` — checks route integrity, frontend↔backend contract, page completeness
2. **FIX** any new failures before committing (existing failures are tracked in beads)
3. This runs automatically in CI — PRs with new failures will not pass

### When Analyzing Errors
1. **CHECK** `./hive-mind/troubleshooting/` for known issues
2. **MATCH** error messages against documented symptoms
3. **APPLY** documented solutions before attempting new fixes

### When Solving New Problems
1. **DOCUMENT** the solution in `./hive-mind/troubleshooting/` if it's a bug fix
2. **DOCUMENT** the pattern in `./hive-mind/patterns/` if it's reusable architecture
3. **UPDATE** the relevant README index files

---

## Pattern & Component Discovery

### BEFORE WRITING ANY NEW CODE
1. **Read `docs/COMPONENT_REGISTRY.md`** — know what frontend/backend components exist and their maturity
2. **Read the relevant `hive-mind/patterns/{category}/README.md`** — know what patterns apply
3. Only THEN propose new code. Reuse existing components and patterns.

### Pattern Categories (55+ patterns in hive-mind)

| Category | Directory | Use When |
|----------|-----------|----------|
| **Agent Builder** | `hive-mind/patterns/agent-builder/` | Agent Builder, A2A, MCP, streaming, userscript overlay |
| **Search** | `hive-mind/patterns/search/` | Retrievers, indexing, ESQL, inference, query rules, LTR |
| **Observability** | `hive-mind/patterns/observability/` | OTel, browser SDK, ESQL analytics, personalization |
| **Open Crawler** | `hive-mind/patterns/open-crawler/` | Crawler configs, extraction, Elasticsearch integration |
| **Agent Frameworks** | `hive-mind/patterns/agent-frameworks/` | Agno coordinator setup, multi-agent with memory |
| **Data Generation** | `hive-mind/patterns/data/` | Datasets, generators, LLM data creation, fidelity requirements |
| **Branding** | `hive-mind/patterns/branding/` | Extracting brand themes from websites, component theming |
| **EUI** | `hive-mind/patterns/eui/` | EUI + Vite or Next.js setup, SSR workarounds |
| **E-Commerce** | `hive-mind/patterns/ecommerce/` | Cart tracking, demo datasets, OTel attribution |
| **Deployment** | `hive-mind/patterns/deployment/` | Cloud Run, Docker, dynamic ports, dev scripts |

> **Full index**: `hive-mind/patterns/README.md` lists all 55+ patterns with descriptions.

---

## Project Stack

- **Frontend**: Vite + React 18 + EUI 110 + TypeScript
- **Backend**: Python FastAPI
- **Styling**: EUI components + Tailwind CSS (where EUI doesn't cover)

### EUI-Specific Rules

1. **Icons**: All EUI icons must be registered in `frontend/src/iconCache.ts`.
   - The `npm run dev` script now auto-generates this cache on start.
   - If you add a new icon while the server is running, you must restart the server or run `npm run generate-icons`.
   - **GUARANTEE**: If an icon is missing, the app will not crash but the icon will not render. Always verify icons exist in the cache.
2. **Theme**: Use EUI theme variables, support light/dark modes
3. **Colors for EuiAvatar**: Must use hex values, not CSS variables

---

## Branding System

This project supports multiple brand themes with two approaches:

### Option 1: Brand Editor (Manual)
- Available at `/brands` in the running app
- Simple UI for setting colors and uploading logos
- Brands stored in `backend/data/brands.json`
- Good for quick demos with basic color customization

### Option 2: AI-Powered Extraction (Advanced)
- Use vibe coding to extract branding from websites
- Creates theme files in `frontend/src/branding/[brandName]Theme.ts`
- Can extract fonts, gradients, and complex styling
- See `hive-mind/patterns/branding/BRANDING_EXTRACTION_PATTERNS.md`

### Key Files
- `frontend/src/branding/index.ts` - Brand registry and types
- `frontend/src/branding/BrandContext.tsx` - React context for theming
- `backend/app/routes/branding.py` - REST API for brand CRUD
- **Template**: Use `exampleTheme.ts` as the template for AI-extracted brands

### Browser Tools (Playwright MCP Auto-Configuration)

Branding extraction requires browser tools. `setup.sh` automatically configures Playwright MCP for Claude Code users:

- **What it does**: During setup (step 6/6), detects if `@playwright/mcp` is available via npx and creates/updates `.mcp.json` with the Playwright MCP server configuration.
- **`.mcp.json` is gitignored** — it's environment-specific and auto-generated per machine.
- **If already configured**: Setup skips this step (checks for existing `"playwright"` entry).
- **If npx is unavailable or the package can't be resolved**: Setup prints a warning with install instructions.
- **Manual configuration**: Add this to `.mcp.json` in the project root:
  ```json
  {
    "mcpServers": {
      "playwright": {
        "command": "npx",
        "args": ["@playwright/mcp@latest"]
      }
    }
  }
  ```
- **Cursor users**: No configuration needed — Cursor has a built-in browser.

### Testing Themes (Local Development)
For themes you don't want committed to the repo:
- Prefix the filename with `testing`: `testingGovukTheme.ts`, `testingAcmeTheme.ts`
- These files are gitignored but auto-loaded for local development
- The "testing" prefix is stripped from the brand ID (`testingGovuk` → `govuk`)
- Use `?brand=govuk` or localStorage to activate

---

## Dev Commands

```bash
./dev start            # Start both servers (background)
./dev stop             # Stop servers
./dev status           # Check if running
./dev verify           # Quick setup verification (checks .env, venv, health)
./dev verify-template  # Structural integrity checks (routes, contracts, builds)
./dev test-agent       # Test Agent Builder connection (sends test message)
./dev logs-snapshot    # View recent logs (NON-BLOCKING - use this!)
./dev logs             # Follow logs (BLOCKS FOREVER - don't use in scripts)
./dev open             # Open browser
./setup.sh             # Reconfigure Elastic connection
```

> ⚠️ **AI Agents**: Always use `./dev logs-snapshot` instead of `./dev logs`.
> The `logs` command uses `tail -f` which hangs indefinitely.
> Use `./dev logs-snapshot 100` to see the last 100 lines.

### Localhost URL Check

Hardcoded `http://localhost` URLs in frontend source break Cloud Run deployments. A CI check and standalone script catch regressions:

```bash
./scripts/check-localhost-urls.sh   # Run locally (exit 0 = clean, exit 1 = violations)
```

Exceptions (overlay userscripts, OverlayGuidePage, vite.config.ts) are excluded. To add a new exception, edit the grep exclusions in the script.

### Port Discovery (for AI Agents)

Ports are **dynamic** - don't assume defaults! Multiple demos may run on different ports.

```bash
./dev status                      # Shows actual running ports
cat .dev-pids/backend.port        # Backend port (e.g., 8001, 8002, ...)
cat .dev-pids/frontend.port       # Frontend port (e.g., 3000, 3001, ...)
```

See `hive-mind/patterns/deployment/DYNAMIC_PORT_CONFIGURATION.md` for details.

---

## Cloud Run Deployment

This project can be deployed to Google Cloud Run with IAP (Identity-Aware Proxy) protection.

> 🔒 **SECURITY: Demos must ALWAYS be behind IAP authentication.**
> Never deploy demos with public access (`--allow-unauthenticated` or `ingress=all`).
> IAP ensures only authorized users (@elastic.co) can access the demo.
> See `docs/DEPLOYMENT.md` for IAP setup instructions.

> ⚠️ **IMPORTANT: Always use SIDECARS for Cloud Run deployment.**
> The all-in-one approach (Dockerfile.cloudrun) has reliability issues with supervisor.
> The sidecar approach is battle-tested and works correctly.

> 💡 **CRITICAL IAP GOTCHA**: Cloud Run needs `allUsers` as invoker even with IAP!
> This is counter-intuitive but required. IAP authenticates at the Load Balancer,
> then the LB calls Cloud Run. Without `allUsers` invoker, you get 403 Forbidden
> even after successful IAP authentication. This is secure because `ingress:
> internal-and-cloud-load-balancing` blocks direct access - all traffic must
> go through the IAP-protected Load Balancer. The deploy script now adds this
> automatically. See `hive-mind/patterns/deployment/CLOUDRUN_SIDECAR_DEPLOYMENT.md`.

### Quick Deploy (Sidecars - RECOMMENDED)

```bash
# Set your credentials
export ELASTICSEARCH_URL="https://your-cluster.es.cloud.com"
export ELASTIC_API_KEY="your-api-key"
export SERVICE_NAME="my-demo"
export BASE_PATH="/my-demo/"

# Deploy with sidecars - THIS IS THE ONLY RECOMMENDED APPROACH
./deploy/deploy-cloudrun.sh
```

### Deployment Options

| Option | Command | Status |
|--------|---------|--------|
| **Sidecars** | `./deploy/deploy-cloudrun.sh` | ✅ **USE THIS** |
| ~~All-in-One~~ | ~~`cloudbuild.yaml`~~ | ⚠️ Not recommended - supervisor issues |
| **Debug** | `Dockerfile.cloudrun.simple` | For troubleshooting FastAPI only |

### Key Files

```
deploy/                          # Deployment configurations
├── Dockerfile.nginx             # Frontend container
├── Dockerfile.fastapi           # Backend container
├── Dockerfile.otel-collector    # OTel Collector
├── nginx.conf                   # Nginx routing config
├── service.yaml                 # Cloud Run service definition
└── deploy-cloudrun.sh           # Main deployment script
Dockerfile.cloudrun              # All-in-one image
Dockerfile.cloudrun.simple       # Debug image (FastAPI only)
cloudbuild.yaml                  # Cloud Build (all-in-one)
cloudbuild-sidecar.yaml          # Cloud Build (sidecars)
```

See `docs/DEPLOYMENT.md` for full guide.

---

## Environment Variables & Secrets

This project uses a tiered approach to environment variables and secrets.

### Tiers

| Tier | Location | Purpose | Gitignored |
|------|----------|---------|------------|
| **App config** | `backend/.env` | Read-only API key, service URLs, ports, feature flags | Yes |
| **Admin secrets** | `.secrets/ootb-admin.env` | Write/admin API keys for indexing, testing, data loading | Yes |
| **Deployment** | Root `.env` | Cloud Run-specific overrides (GCP project, region, etc.) | Yes |

### Key Principles

1. **`backend/.env` is for the running app** — it should only contain a **read-only** API key with search permissions. This is what `setup.sh` / `interactive_setup.py` writes.
2. **`.secrets/.env` is for development and testing** — admin API keys with write/index permissions, credentials for data ingestion scripts, and any other secrets that shouldn't be in the app `.env`.
3. **Never commit secrets** — both `.env` and `.secrets/` are gitignored. The `.env.example` files document the expected variables without values.
4. **Scripts should check both locations** — ingestion and data loading scripts should load from `.secrets/.env` first (admin key), falling back to `backend/.env` (read-only key).

### `.secrets/` Directory Structure

```
.secrets/
└── ootb-admin.env    # OOTB serverless cluster credentials (admin + readonly keys)
```

The secrets file uses these variable names:
```bash
ELASTICSEARCH_URL=...       # Cluster URL
KIBANA_URL=...              # Kibana URL
ADMIN_API_KEY=...           # Full-access key for indexing, data loading, testing
READONLY_API_KEY=...        # Read-only key (same value as ELASTIC_API_KEY in backend/.env)
```

> **Current state**: `backend/.env` has `ELASTIC_API_KEY` set to the read-only key.
> Ingestion scripts that need write access must load `ADMIN_API_KEY` from `.secrets/ootb-admin.env`.

### How Credentials Are Loaded

| Component | Library | Loads from | Notes |
|-----------|---------|------------|-------|
| **FastAPI app** | `python-decouple` | `backend/.env` | AutoConfig searches `backend/` directory only |
| **Ingestion scripts** (`scripts/`) | `python-dotenv` | `load_dotenv(override=True)` | Loads nearest `.env` — set vars before running or use `--api-key` flag |
| **Generators** (`backend/scripts/`) | `os.getenv()` | Environment only | Must `export` or use `dotenv` in calling script |
| **Crawler scripts** | `os.getenv()` | Environment only | Accept `--api-key` CLI flag as override |

### For AI Agents: Loading Credentials in Scripts

When writing new scripts that need Elasticsearch **write** access:

```python
# Standard pattern for scripts that need admin/write access
import os
from pathlib import Path

from dotenv import load_dotenv

# Find project root (adjust parents[N] for script depth)
project_root = Path(__file__).resolve().parents[N]

# Load app .env first (base config), then secrets (override with admin key)
load_dotenv(project_root / 'backend' / '.env')
secrets_env = project_root / '.secrets' / 'ootb-admin.env'
if secrets_env.exists():
    load_dotenv(secrets_env, override=True)

es_url = os.getenv('ELASTICSEARCH_URL')
api_key = os.getenv('ADMIN_API_KEY') or os.getenv('ELASTIC_API_KEY')
```

For **read-only** scripts (search, queries), just load `backend/.env` — no secrets needed.

### Inference Endpoints

Inference endpoint IDs (e.g. `.elser-2-elastic`, `.jina-embeddings-v3`) **change frequently** on Elastic Serverless. Never hardcode them in documentation or index mappings.

- Use `<YOUR_INFERENCE_ENDPOINT>` as a placeholder in patterns and docs
- Check the live cluster: `GET /_inference` to discover current endpoint IDs
- The project defaults to Jina embeddings via Elastic Inference Service (EIS)
- See `backend/scripts/load_serverless_ootb.py` for the canonical inference setup

---

## Issue Tracking with Beads (if `.beads/` exists)

This project uses `bd` (beads) for issue tracking with dependency support. Beads is the **persistent backlog** that survives across sessions — always check it before starting work.

> **Full reference**: `hive-mind/meta/workflows/BEADS_ISSUE_TRACKER.md`

### Session Start (ALWAYS do this)

```bash
bd ready                    # What can I work on? (no blockers)
bd blocked                  # What's stuck and why
bd stats                    # Overview of project state
```

### Before Working on an Issue

```bash
bd show <id>                # Read description AND acceptance criteria
bd update <id> --status in_progress
bd comment <id> "Starting work on this"
```

**If the issue has no acceptance criteria, ask the user before starting.**

### During Work

```bash
bd comment <id> "Progress: implemented X, working on Y"

# Found a bug while working? Create it and link back:
bd create "Bug: null check missing" --type bug --deps "discovered-from:<id>"

# Hit a blocker? Record it:
# Syntax: bd dep add <blocked-issue> <blocker-issue>
# Reads as: "<blocked> depends on <blocker>"
bd dep add <id> <blocker-id>
```

### Completing Work

```bash
bd comment <id> "Done — <brief summary of what was done>"
bd close <id> -r "All acceptance criteria met"
bd ready                    # Check what unblocked
```

### Git Commit Integration

Always reference issues in commits:
```bash
git commit -m "[<id>] description of change"
```

### Creating Issues

```bash
bd create "title" \
  --type [bug|feature|task|epic|chore] \
  --priority [0-4] \           # 0=critical, 2=normal(default), 4=backlog
  --acceptance "- [ ] Criterion 1
- [ ] Criterion 2
- [ ] Tests pass"
```

### Agent Teams + Beads

When using Claude Code agent teams, beads and internal tasks serve different roles:
- **Beads** = persistent backlog (what needs doing across sessions)
- **TaskCreate/TaskList** = ephemeral session plan (how agents divide work right now)

Workflow: pick beads issues → create TaskCreate items for each agent → agents work in parallel → close beads issues when done.

### Quick Reference

```bash
bd ready                         # Unblocked work
bd blocked                       # Stuck items
bd show <id>                     # Full details + acceptance criteria
bd update <id> --status in_progress  # Claim it
bd comment <id> "message"        # Progress note
bd close <id> -r "reason"        # Done (always use -r, not --comment)
bd list --status open            # All open
bd list --type bug --priority 0  # Critical bugs
bd search "keyword"              # Search issues
```

### Dependencies — Getting It Right

```bash
# ⚠️ bd dep add uses POSITIONAL args, NOT the blocks: prefix syntax
# The blocks: prefix ONLY works with --deps during bd create

# Syntax: bd dep add <blocked-issue> <blocker-issue>
# Meaning: first arg DEPENDS ON second arg (second blocks first)

# Example: "auth" must be done before "dashboard" can start
bd dep add dashboard-id auth-id  # dashboard depends on auth

# Example: creating with deps inline (blocks: prefix works HERE)
bd create "Build dashboard" --deps "blocks:auth-id"

# Verify the relationship
bd dep tree <id>                 # Shows what blocks this issue
bd blocked                       # Shows all blocked issues and why
```

