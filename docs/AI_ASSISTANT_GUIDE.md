# AI Assistant Guide

Reference guide for coding agents working on this repository. Operational rules live in `AGENTS.md`; use this document for workflow references and project context.

## 1. Workflow Expectations

1. **Plan first** – run the planning tool, wait for user approval, then execute.
2. **State assumptions** – if any requirement is unclear, ask before making edits.
3. **Edit with context** – prefer `apply_patch`, keep diffs focused, and avoid touching files you did not read in this session.
4. **Verify locally** – use the commands below before handing off.
5. **Summarise precisely** – final replies must describe changes, mention tests, and flag any follow-up work.

Backend tooling uses uv. The Makefile targets `install-backend`, `lint-backend`, and `test-backend` run through `uv` in `backend/`.

## 2. Project Stack

- **Frontend**: Vite + React 18 + EUI 110 + TypeScript
- **Backend**: Python FastAPI
- **Styling**: EUI components + Tailwind CSS (where EUI does not cover)

### EUI-specific rules

1. **Icons**: All EUI icons must be registered in `frontend/src/iconCache.ts`
2. **Theme**: Use EUI theme variables, support light/dark modes
3. **Colours for EuiAvatar**: Must use hex values, not CSS variables

## 3. Key Patterns Available

| Pattern                          | Location                                                      | Use When                                                |
| -------------------------------- | ------------------------------------------------------------- | ------------------------------------------------------- |
| **Agent Builder API Management** | `hive-mind/patterns/elastic/AGENT_BUILDER_API_MANAGEMENT.md`  | **Investigating, updating, or creating agents via API** |
| Agent Builder Integration        | `hive-mind/patterns/elastic/AGENT_BUILDER_INTEGRATION.md`     | Connecting frontend to Agent Builder with SSE streaming |
| **A2A Coordinator Pattern**      | `hive-mind/patterns/elastic/A2A_COORDINATOR_PATTERN.md`       | **Multi-agent orchestration with coordinator LLM**      |
| MCP Server Integration           | `hive-mind/patterns/elastic/MCP_SERVER_INTEGRATION.md`        | Connecting to Kibana MCP server from IDEs               |
| Conversation History Audit       | `hive-mind/patterns/elastic/CONVERSATION_HISTORY_AUDIT.md`    | Viewing agent reasoning and tool calls                  |
| Streaming Chat UI                | `hive-mind/patterns/elastic/STREAMING_CHAT_UI_PATTERNS.md`    | Building chat interfaces with SSE                       |
| EUI + Vite Setup                 | `hive-mind/patterns/eui/EUI_VITE_INTEGRATION.md`              | Setting up EUI with Vite, icon cache issues             |
| Branding Extraction              | `hive-mind/patterns/branding/BRANDING_EXTRACTION_PATTERNS.md` | Extracting brand colours/fonts from websites            |
| **Dynamic Port Config**          | `hive-mind/patterns/deployment/DYNAMIC_PORT_CONFIGURATION.md` | **Port conflicts, discovering actual running ports**    |

## 4. Dev Commands

```bash
./dev start          # Start both servers (background)
./dev stop           # Stop servers
./dev status         # Check if running
./dev verify         # Quick setup verification (checks .env, venv, health)
./dev test-agent     # Test Agent Builder connection (sends test message)
./dev logs-snapshot  # View recent logs (NON-BLOCKING - use this!)
./dev logs           # Follow logs (BLOCKS FOREVER - do not use in scripts)
./dev open           # Open browser
./setup.sh           # Reconfigure Elastic connection
```

> ⚠️ **AI agents**: Always use `./dev logs-snapshot` instead of `./dev logs`.\
> The `logs` command uses `tail -f` which hangs indefinitely.\
> Use `./dev logs-snapshot 100` to see the last 100 lines.

## 5. Port Discovery (for AI agents)

Ports are **dynamic** - do not assume defaults. Multiple demos may run on different ports.

```bash
./dev status                # Shows actual running ports
cat .dev-pids/backend.port  # Backend port (e.g., 8001, 8002, ...)
cat .dev-pids/frontend.port # Frontend port (e.g., 3000, 3001, ...)
```

See `hive-mind/patterns/deployment/DYNAMIC_PORT_CONFIGURATION.md` for details.

## 6. Branding System

This project supports multiple brand themes with two approaches:

### Option 1: Brand Editor (manual)

- Available at `/brands` in the running app
- Simple UI for setting colours and uploading logos
- Brands stored in `backend/data/brands.json`
- Good for quick demos with basic colour customisation

### Option 2: AI-powered extraction (advanced)

- Use vibe coding to extract branding from websites
- Creates theme files in `frontend/src/branding/[brandName]Theme.ts`
- Can extract fonts, gradients, and complex styling
- See `hive-mind/patterns/branding/BRANDING_EXTRACTION_PATTERNS.md`

### Key files

- `frontend/src/branding/index.ts` - Brand registry and types
- `frontend/src/branding/BrandContext.tsx` - React context for theming
- `backend/app/routes/branding.py` - REST API for brand CRUD
- **Template**: Use `exampleTheme.ts` as the template for AI-extracted brands
