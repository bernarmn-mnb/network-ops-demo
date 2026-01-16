# Prerequisites Guide

This document lists all prerequisites for the Elastic Demo Starter, categorized by importance.

---

## Quick Check

After cloning, run the pre-flight check script to verify your environment:

```bash
./preflight-check.sh
```

Run this **before** `./setup.sh` to catch missing prerequisites early with clear guidance on how to fix them.

---

## Mandatory Prerequisites

These are **required** - the setup wizard will fail without them.

| Tool | Minimum Version | Purpose | Install |
|------|-----------------|---------|---------|
| **Python** | 3.8+ | Backend server (FastAPI) | [python.org](https://www.python.org/downloads/) or `brew install python3` |
| **Node.js** | 18+ | Frontend build (Vite/React) | [nodejs.org](https://nodejs.org/) or `brew install node` |
| **Git** | Any | Clone repo, manage submodules | `xcode-select --install` (macOS) or [git-scm.com](https://git-scm.com/) |

### Verification Commands

```bash
# Python (need 3.8+)
python3 --version

# Node.js (need 18+)
node --version

# Git
git --version
```

---

## Recommended Tools

These are **not required**, but significantly improve the experience.

### GitHub CLI (`gh`)

**Why**: Makes cloning and authentication much easier.

```bash
# Instead of fiddling with SSH keys or tokens:
gh repo clone elastic/elastic-demo-starter my-demo
```

**Install**:
- macOS: `brew install gh`
- Windows: `winget install GitHub.cli`
- Linux: See [cli.github.com](https://cli.github.com/)

After installing, authenticate: `gh auth login`

---

### Yarn

**Why**: Significantly faster than npm for installing frontend dependencies (3-5x faster).

```bash
# Install globally
npm install -g yarn
```

The setup wizard will automatically use yarn if available, otherwise falls back to npm.

---

### Cursor IDE

**Why**: The demo is designed for "vibe coding" with AI assistance. Cursor has the best AI integration.

**Install**: [cursor.sh](https://cursor.sh/)

**Alternatives**: VS Code with Claude extension, or any IDE with AI copilot features.

---

## Optional Enhancements

These enable specific features but are not needed for the core demo.

### Firecrawl MCP Server

**Why**: Enables the AI assistant to automatically extract branding (colors, logos, fonts) from any website URL. Without this, you'll need to manually configure branding via the Brand Editor UI.

**What it does**: When you say "Extract branding from https://example.com", the AI can:
1. Scrape the website
2. Extract brand colors, fonts, and logo
3. Generate a theme file automatically

**Setup**:

1. Get a Firecrawl API key from [firecrawl.dev](https://firecrawl.dev/)

2. Add to your Cursor MCP settings (`~/.cursor/mcp.json`):
   ```json
   {
     "mcpServers": {
       "firecrawl": {
         "command": "npx",
         "args": ["-y", "firecrawl-mcp"],
         "env": {
           "FIRECRAWL_API_KEY": "your-api-key-here"
         }
       }
     }
   }
   ```

3. Restart Cursor

**Alternative**: Use the built-in Brand Editor at `/brands` to manually set colors and upload logos.

---

### Beads CLI (`bd`)

**Why**: Local issue tracking that integrates with your AI coding workflow. The AI can check for tasks and reference issues in commits.

**Setup**:
```bash
# Install via Homebrew (recommended)
brew install steveyegge/beads/bd

# Or via npm
npm install -g @anthropic/bd

# Or via install script
curl -fsSL https://raw.githubusercontent.com/steveyegge/beads/main/scripts/install.sh | bash
```

**Usage**:
```bash
bd ready     # Check for available tasks
bd list      # List all issues
bd add       # Create new issue
```

---

### jq

**Why**: Makes debugging API responses much easier.

```bash
# macOS
brew install jq

# Usage
curl http://localhost:8001/api/search/fields | jq
```

---

## Network Requirements

The setup requires internet access to:

| Domain | Purpose |
|--------|---------|
| `cloud.elastic.co` | Elastic Cloud API (Agent Builder) |
| `*.elastic-cloud.com` | Your deployment (Kibana, Elasticsearch) |
| `registry.npmjs.org` | Frontend dependencies |
| `pypi.org` | Backend dependencies |

If you're behind a corporate proxy, ensure these domains are accessible.

---

## Platform-Specific Notes

### macOS

Most tools can be installed via Homebrew:
```bash
# Install Homebrew first if needed
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Install everything
brew install python3 node git gh yarn jq
```

### Windows

Use Windows Subsystem for Linux (WSL2) for the best experience:
```bash
# In PowerShell (admin)
wsl --install

# Then in WSL
sudo apt update
sudo apt install python3 python3-venv nodejs npm git
```

Alternatively, use native Windows with:
- Python from [python.org](https://www.python.org/downloads/)
- Node.js from [nodejs.org](https://nodejs.org/)
- Git from [git-scm.com](https://git-scm.com/)

### Linux (Ubuntu/Debian)

```bash
sudo apt update
sudo apt install python3 python3-venv nodejs npm git

# For newer Node.js
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install nodejs
```

---

## Troubleshooting

### "Python not found" but Python is installed

Your system might have `python` instead of `python3`:
```bash
# Check what you have
which python python3

# Create an alias if needed
alias python3=python
```

### Node.js version too old

Use nvm to manage Node.js versions:
```bash
# Install nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash

# Install and use Node 20
nvm install 20
nvm use 20
```

### Corporate proxy blocking connections

Set proxy environment variables:
```bash
export HTTP_PROXY=http://your-proxy:port
export HTTPS_PROXY=http://your-proxy:port

# For npm specifically
npm config set proxy http://your-proxy:port
npm config set https-proxy http://your-proxy:port
```

---

## Quick Start Checklist

Before the hackathon, verify:

- [ ] `./preflight-check.sh` passes with no errors
- [ ] You have Elastic Cloud credentials ready (Kibana URL, API Key)
- [ ] You know which Agent ID to use (or will create one)
- [ ] Your IDE is set up (Cursor recommended)
- [ ] (Optional) Firecrawl MCP configured for branding extraction
