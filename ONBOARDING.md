# Onboarding Prompt

> **For the user**: Copy this entire file content and paste it into your AI coding assistant (Cursor/Claude Code) as your first prompt after running `./setup.sh`.
>
> Or simply tell your AI: *"Read and follow ONBOARDING.md"*

---

## Prerequisites

**Before running this onboarding, ensure:**
1. You have verified prerequisites by running `./preflight-check.sh`
2. You have run `./setup.sh` at least once
3. The setup wizard completed successfully (creates `.setup-complete` marker file)

If `.setup-complete` doesn't exist, tell the user to run `./setup.sh` first.

> **See also**: [PREREQUISITES.md](./PREREQUISITES.md) for detailed information about mandatory, recommended, and optional tools.

---

## Instructions for AI Agent

You are helping onboard a new user to this **Elastic Demo Starter** project. This is a multi-purpose demo platform supporting:

- **Agent Builder Chat** - Streaming chat with Elastic Agent Builder
- **A2A Multi-Agent** - Orchestrate multiple agents with a coordinator LLM
- **Elasticsearch Search** - Full-featured search with facets, analytics, and RetrieverBuilder
- **Search Analytics** - CTR, MRR, zero-results tracking via ES|QL
- **OpenTelemetry** - APM traces, click tracking, and observability
- **MCP Server Explorer** - Browse and test MCP (Model Context Protocol) tools
- **Conversation Audit** - View conversation history and agent reasoning
- **Brand Theming** - Customize appearance for customer demos

Please complete the following checklist to verify the environment is properly set up and ready for "vibe coding".

**Complete each section in order. Report your findings as you go.**

---

### 1. Verify Project Context is Loaded

First, confirm you can see the project rules:

**Check ONE of these exists and you can read it:**
- `.cursorrules` (for Cursor)
- `CLAUDE.md` (for Claude Code)

**Verify the file contains:**
- Reference to `hive-mind/` folder
- EUI-specific rules (icon cache, theme)
- Project stack info (Vite + React + FastAPI)

**If you cannot find these files**, tell the user:
> "I cannot see the project context files. Please ensure you've opened the project root folder, not a subfolder."

**Troubleshooting:**
- If in a subfolder: Close and reopen the project root
- If files exist but empty: The repo may be corrupted - re-clone

---

### 2. Check Hive Mind Knowledge Base

Verify the shared knowledge base is available:

```
Check: Does ./hive-mind/ folder exist and contain files?
```

**If missing or empty**, tell the user:
> "The hive-mind submodule appears to be missing. Run: `git submodule update --init --recursive`"

**If present**, briefly confirm:
- `hive-mind/patterns/` exists (architecture patterns)
- `hive-mind/troubleshooting/` exists (known fixes)
- `hive-mind/meta/workflows/BEADS_ISSUE_TRACKER.md` exists

**Troubleshooting:**
- Submodule init fails: Check internet connection, then try `git submodule sync && git submodule update --init`
- Folder exists but empty: Run `cd hive-mind && git checkout main && cd ..`

---

### 3. Check Beads Issue Tracking

Determine if beads is configured for this project:

```
Check: Does ./.beads/ folder exist?
```

**If `.beads/` folder exists:**

The project *intends* to use beads for issue tracking. Now verify the CLI is working:

1. Run `bd ready` to test the CLI
2. **If it works:** Tell the user "Beads is configured. I'll use `bd ready` to check for work and reference issues in commits as `[bd-XX]`."
3. **If `bd` command not found:** The beads CLI isn't installed. Tell user:
   > "Beads folder exists but CLI not found. Install with: `brew install steveyegge/beads/bd` or see https://github.com/steveyegge/beads"
4. **If `bd` fails with database error:** The database needs initialization. Run:
   ```
   bd init
   ```
   This creates the database. Then retry `bd ready`.

**If `.beads/` does NOT exist:**
1. This project is not using beads
2. Tell the user: "Beads is not configured. I'll skip issue tracking integration."

**Troubleshooting:**
- `bd` not in PATH: Add `$GOPATH/bin` to your PATH, or run `export PATH=$PATH:$(go env GOPATH)/bin`
- Database corrupted: Delete `.beads/beads.db*` files and run `bd stats` to recreate

---

### 4. Sanity Check Environment

Verify the development environment is ready.

**Quick Check (Recommended):**

First, check if setup was already completed:

```
Check: Does ./.setup-complete file exist?
```

If `.setup-complete` exists, read it to see:
- When setup was run (`timestamp:` line)
- What features are configured (`features:` line)
- Search index name (`search_index:` line)

**If `.setup-complete` does NOT exist:**
> "Setup hasn't been run yet. Please run `./setup.sh` first, then come back to this onboarding."

---

**Detailed Checks (if .setup-complete exists):**

Verify these files/folders exist:
- [ ] `backend/.env` - Elastic configuration
- [ ] `backend/venv/` - Python virtual environment  
- [ ] `frontend/node_modules/` - Frontend dependencies

**If `backend/.env` exists**, verify it contains these variables (check they're not empty):

| Variable | Required | Purpose |
|----------|----------|---------|
| `KIBANA_URL` | For Agent Builder | Your Elastic Cloud Kibana URL |
| `ELASTIC_API_KEY` | ✅ Yes | API key for authentication (used by Agent Builder & ES) |
| `AGENT_ID` | For Agent Builder | The agent to connect to |
| `ELASTIC_CLOUD_ID` | For Search | Elastic Cloud deployment ID |
| `SEARCH_INDEX` | For Search | Elasticsearch index to search (default: products) |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | For APM | OTel/APM endpoint URL |
| `OTEL_EXPORTER_OTLP_HEADERS` | For APM | Auth header (Authorization=Bearer xxx) |
| `PORT` | Optional | Backend port (default: 8001) |
| `FRONTEND_PORT` | Optional | Frontend port (default: 3000) |
| `LLM_PROXY_URL` | For A2A | LLM proxy for A2A coordinator |
| `LLM_PROXY_API_KEY` | For A2A | API key for LLM proxy |

**Report any missing items with specific guidance:**

| Missing Item | How to Fix |
|--------------|------------|
| `backend/.env` | Run `./setup.sh` and choose option 3 (configure Elastic) |
| `backend/venv/` | Run `python3 -m venv backend/venv && backend/venv/bin/pip install -r backend/requirements.txt` |
| `frontend/node_modules/` | Run `cd frontend && yarn install` (or `npm install`) |
| Empty KIBANA_URL | Get from Elastic Cloud console → Deployments → your deployment |
| Empty ELASTIC_API_KEY | See "Creating an API Key" section below |
| Empty AGENT_ID | Find in Kibana → Agent Builder → select your agent → copy ID from URL |

---

### 4b. Verify Servers Start

Before proceeding, confirm the servers can actually run.

**Option A: Use verify command (Quick)**
```bash
./dev verify
```

This checks .setup-complete, .env, venv, node_modules, and pings the health endpoint.

**Option B: Start and check status**
```bash
./dev start
./dev status
```

**Expected output from `./dev status`:**
```
Backend:  Running (PID: XXXX)
Frontend: Running (PID: XXXX)
```

**File-based verification (for agents with limited shell access):**
- Check `.dev-pids/backend.pid` exists → backend was started
- Check `.dev-pids/frontend.pid` exists → frontend was started
- Check `.dev-pids/backend.port` for actual backend port
- Check `.dev-pids/frontend.port` for actual frontend port

**If servers don't start:**

| Symptom | Likely Cause | Fix |
|---------|--------------|-----|
| Backend fails immediately | Missing Python dependencies | `backend/venv/bin/pip install -r backend/requirements.txt` |
| Backend port in use | Another process on port 8001 | Kill it or change PORT in `.env` |
| Frontend fails | Missing node_modules | `cd frontend && yarn install` |
| Frontend port in use | Another process on port 3000 | Kill it or change FRONTEND_PORT in `.env` |
| Both fail with venv error | Wrong Python version | Recreate venv: `rm -rf backend/venv && python3 -m venv backend/venv` |

Run `./dev logs-snapshot` to see detailed error messages.

**Once servers are running**, continue to branding.

---

### 5. Create Branding Theme

There are two approaches to branding. First, check if a URL was pre-configured during setup:

```
Check: Does ./NEXT_STEPS_BRANDING.md exist?
```

> **Background:** This file is created when you run `./setup.sh` and select **Option 2: AI-powered extraction** in the branding step, then provide a website URL. If you selected "Brand Editor" or "Skip", this file won't exist.

---

#### Understanding the Branding System

**Key files:**
- `frontend/src/branding/index.ts` - Brand registry and `BrandTheme` interface (the contract for all brands)
- `frontend/src/branding/[brand]Theme.ts` - Individual brand theme definitions (auto-discovered!)
- `frontend/src/branding/exampleTheme.ts` - Example template (use as reference structure)

**Where new brand themes go:**
```
frontend/src/branding/
├── index.ts              ← Auto-discovery logic (don't modify)
├── BrandContext.tsx      ← React context (don't modify)
├── exampleTheme.ts       ← Example template to copy
└── [yourBrand]Theme.ts   ← YOUR NEW THEME GOES HERE (auto-registered!)
```

**Auto-Discovery:** Theme files matching `*Theme.ts` are automatically discovered and registered. Just create the file with a `[brandName]Branding` export and it's available immediately!

---

#### If NEXT_STEPS_BRANDING.md EXISTS (AI extraction pre-configured):

1. Read the file to find the target URL
2. Follow the branding extraction pattern in `hive-mind/patterns/branding/BRANDING_EXTRACTION_PATTERNS.md`
3. **Use `frontend/src/branding/exampleTheme.ts` as your template** - copy its structure exactly
4. Create the new theme file: `frontend/src/branding/[brandName]Theme.ts`
   - Export a `[brandName]Branding` object (e.g., `acmeBranding`, `myCompanyBranding`)
   - The brand will be **automatically discovered and registered** - no manual registration needed!
5. Optionally set it as default by changing return value of `getSelectedBrandId()` in `index.ts`
6. Delete `NEXT_STEPS_BRANDING.md` after completing

**Template file location:** `frontend/src/branding/exampleTheme.ts`

**Note:** Theme files are auto-discovered using Vite's `import.meta.glob`. Just create the file with the correct export name and it's automatically available!

---

#### If NEXT_STEPS_BRANDING.md DOES NOT exist:

Ask the user which branding approach they want:

> "No branding was pre-configured during setup. You have two options:
>
> **Option 1: Brand Editor (Quick & Manual)**  
> Use the built-in editor at http://localhost:3000/brands to set colors and upload logos manually. Good for quick demos.
>
> **Option 2: AI-Powered Extraction (Recommended)**  
> Give me a website URL and I'll extract the brand colors, fonts, and logo automatically. Creates a full theme file with proper CSS variables.
>
> Which would you prefer? Or type a URL to start extraction."

**If user provides a URL:**

1. Read the extraction pattern: `hive-mind/patterns/branding/BRANDING_EXTRACTION_PATTERNS.md`
2. **Review the BrandTheme interface** in `frontend/src/branding/index.ts` - this is the contract
3. **Copy the template:** `frontend/src/branding/exampleTheme.ts`
4. Create new theme: `frontend/src/branding/[brandName]Theme.ts`
   - Export a `[brandName]Branding` object (e.g., `myBrandBranding`)
   - The brand is **automatically discovered and registered** - no manual registration needed!
5. Set as default brand if requested (modify `getSelectedBrandId()` return value in `index.ts`)

**If user chooses Brand Editor:**
- Note that they can access it at http://localhost:3000/brands and move on

---

#### After Creating a Brand

To verify branding is working:
1. Visit http://localhost:3000?brand=[yourbrandid]
2. Check header shows brand logo and colors
3. Toggle dark mode to verify CSS variables adapt correctly
4. See `hive-mind/patterns/branding/COMPONENT_BRANDING_PATTERNS.md` for component usage

---

### 5b. Configure Search (if Elasticsearch enabled)

**Skip this section if `ELASTIC_CLOUD_ID` or `ELASTICSEARCH_URL` is not set in `.env`**

The search page (`/search`) works out-of-the-box with robust defaults, but displays raw JSON if the index fields don't match the expected product structure. To provide a better user experience, configure the search to understand your index's field mapping.

---

#### Check Search Configuration Status

1. **Visit the search page**: http://localhost:3000/search
2. **Run a test search** (e.g., search for `*` or any term)

**If you see a yellow warning banner** saying "Search needs configuration":
- The index fields don't match the expected structure
- Results are displayed as raw JSON
- Continue with configuration below

**If results display nicely** with titles, images, prices:
- The index already matches expected fields
- Configuration is optional (skip to section 6)

---

#### Configure Search Fields

**Step 1: Discover available fields**

Fetch the index mapping from the API:

```bash
curl http://localhost:8001/api/search/fields | jq
```

Or visit: http://localhost:8001/api/search/fields

The response includes:
- `index`: The configured search index name
- `configured`: Whether fields match expected structure
- `fields`: List of all fields with types and purposes
- `suggested_config`: AI-generated configuration suggestion

**Step 2: Update frontend configuration**

Edit `frontend/src/config/searchConfig.ts`:

1. Update `fields.search` to match your searchable text fields
2. Update `display` to map your fields to UI components:
   - `title`: Field containing the main title/name
   - `description`: Field containing description text
   - `image`: Field containing image URL
   - `price`: Field containing price (numeric)
   - `brand`: Field for brand/manufacturer
   - `category`: Field for category/type

Example for a recipes index:

```typescript
export const searchConfig: SearchConfig = {
  index: "recipes",
  queryTemplate: "simple",
  fields: {
    search: [
      { field: "recipe_name", boost: 3 },
      { field: "ingredients", boost: 2 },
      { field: "instructions", boost: 1 },
    ],
  },
  display: {
    title: "recipe_name",
    description: "instructions",
    image: "photo_url",
    badges: ["cuisine", "difficulty"],
  },
  facets: [
    { field: "cuisine", label: "Cuisine", size: 20 },
    { field: "difficulty", label: "Difficulty", size: 10 },
  ],
}
```

**Step 3: Restart frontend**

```bash
./dev stop && ./dev start
```

**Step 4: Verify configuration**

1. Visit http://localhost:3000/search
2. Run a test search
3. Confirm results display with proper titles, images, etc.
4. Confirm facet filters appear in sidebar

---

#### Troubleshooting Search

| Issue | Cause | Fix |
|-------|-------|-----|
| "Elasticsearch not connected" | Backend can't reach ES | Check `ELASTIC_CLOUD_ID` and `ELASTIC_API_KEY` in `.env` |
| Results show but no facets | Facet fields don't exist or aren't `keyword` type | Check field types in mapping, use `.keyword` subfield |
| Images not loading | Wrong field name or URLs are relative | Verify `display.image` points to field with full URLs |
| "No results" for all queries | Index is empty or field names wrong | Check index has documents, verify search field names |

---

### 6. Final Summary

After completing all checks, provide a summary:

```
## Onboarding Complete! ✅

**Environment Status:**
- Project context: [Loaded/Missing]
- Hive Mind: [Available/Missing]
- Beads tracking: [Enabled/Disabled/CLI not installed]
- Backend config: [Valid/Incomplete - list missing vars]
- Dependencies: [Installed/Missing]
- Servers: [Running/Not tested]

**Branding:**
- [Created via Brand Editor / AI-extracted for X / Not configured]
- Brand Editor available at: http://localhost:3000/brands

**Search:**
- [Configured / Unconfigured (showing JSON) / Not enabled]
- Search page: http://localhost:3000/search

**Available Features:**
- Chat: http://localhost:3000/chat - Talk to your Agent Builder agent
- A2A: http://localhost:3000/a2a - Multi-agent orchestration (requires LLM proxy)
- Search: http://localhost:3000/search - Product search with facets (requires ES connection)
- Analytics: /api/analytics - Search quality metrics via ES|QL (requires ES connection)
- MCP: http://localhost:3000/mcp - Explore MCP server tools
- Audit: http://localhost:3000/audit - View conversation history
- API Docs: http://localhost:3000/docs - Full OpenAPI documentation (42 routes)

**Ready to vibe code!** 

Try asking me to:
- "Add a feature to the chat interface"
- "Fix a bug in the streaming logic"
- "Customize the UI layout"
```

---

## Creating an API Key (for Agent Builder)

If you need to create an API key:

1. **Navigate to API Keys**: Kibana → Stack Management → Security → API Keys
2. **Click "Create API Key"**
3. **Configure permissions** - At minimum, you need:
   ```json
   {
     "agent_builder": {
       "application": "kibana-.kibana",
       "privileges": ["feature_agentBuilder.all"],
       "resources": ["*"]
     }
   }
   ```
   Or simply use a key with `superuser` role for demos.
4. **Copy the encoded key** (the Base64 string, not the ID)
5. **Save it** - You won't be able to see it again!

**Common API Key Errors:**

| Error | Cause | Fix |
|-------|-------|-----|
| HTTP 401 | Invalid or expired API key | Create a new API key |
| HTTP 403 | Key lacks required permissions | Create key with `agent_builder` privileges |
| HTTP 404 | Agent not found | Check AGENT_ID is correct |
| Connection refused | Wrong Kibana URL | Verify URL starts with `https://` and ends with correct domain |

---

## Notes for the AI Agent

- **Be thorough but concise** - users want to get coding quickly
- **Don't ask permission for each step** - just do the checks and report
- **If branding fails**, don't block - offer to retry or skip
- **Reference hive-mind patterns** when making changes
- **If beads is enabled**, run `bd ready` to see if there's existing work to pick up
- **Always use the template** at `frontend/src/branding/exampleTheme.ts` for new brand themes

---

## Quick Reference

| Task | Command/Location |
|------|-----------------|
| **Pre-flight check** | `./preflight-check.sh` (verify prerequisites) |
| Start servers | `./dev start` |
| Stop servers | `./dev stop` |
| **Verify setup** | `./dev verify` (quick health check) |
| View logs | `./dev logs-snapshot` |
| Check status | `./dev status` |
| Reconfigure | `./setup.sh` (Elasticsearch, OTel, Agent Builder, LLM Proxy) |
| Prerequisites guide | `PREREQUISITES.md` |
| Chat page | http://localhost:3000/chat |
| A2A page | http://localhost:3000/a2a |
| Search page | http://localhost:3000/search |
| MCP Explorer | http://localhost:3000/mcp |
| Audit page | http://localhost:3000/audit |
| Brand Editor | http://localhost:3000/brands |
| API Docs | http://localhost:8001/docs |
| Search API | POST /api/search |
| Search fields | GET /api/search/fields (discover index mapping) |
| Search config | `frontend/src/config/searchConfig.ts` |
| Analytics API | /api/analytics/* (CTR, MRR, top queries) |
| Theme template | `frontend/src/branding/exampleTheme.ts` |
| Branding patterns | `hive-mind/patterns/branding/` |
| OTel patterns | `hive-mind/patterns/elastic/OTEL_*.md` |
| Beads issues | `bd ready`, `bd list` |

---

*This file is a one-time onboarding prompt. After completion, users interact normally with their AI coding assistant.*
