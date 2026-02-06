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

### ALWAYS Index These Directories
- `./hive-mind/patterns/` - Reusable architecture patterns
- `./hive-mind/troubleshooting/` - Bug fixes and solutions
- `./hive-mind/meta/` - Workflows and AI guidance

### Before Generating New Code
1. **CHECK** `./hive-mind/patterns/` for existing solutions
2. **REUSE** patterns rather than inventing new approaches
3. **FOLLOW** the established conventions in existing patterns

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
| **Elastic / Agent Builder** | `hive-mind/patterns/elastic/` | Agent Builder, A2A, MCP, ESQL, OTel, search retrievers, open crawler |
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

### Testing Themes (Local Development)
For themes you don't want committed to the repo:
- Prefix the filename with `testing`: `testingGovukTheme.ts`, `testingAcmeTheme.ts`
- These files are gitignored but auto-loaded for local development
- The "testing" prefix is stripped from the brand ID (`testingGovuk` → `govuk`)
- Use `?brand=govuk` or localStorage to activate

---

## Dev Commands

```bash
./dev start          # Start both servers (background)
./dev stop           # Stop servers
./dev status         # Check if running
./dev verify         # Quick setup verification (checks .env, venv, health)
./dev test-agent     # Test Agent Builder connection (sends test message)
./dev logs-snapshot  # View recent logs (NON-BLOCKING - use this!)
./dev logs           # Follow logs (BLOCKS FOREVER - don't use in scripts)
./dev open           # Open browser
./setup.sh           # Reconfigure Elastic connection
```

> ⚠️ **AI Agents**: Always use `./dev logs-snapshot` instead of `./dev logs`.
> The `logs` command uses `tail -f` which hangs indefinitely.
> Use `./dev logs-snapshot 100` to see the last 100 lines.

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
bd dep add <blocker-id> blocks:<id>
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

