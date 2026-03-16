# Demo Evaluation Prompt

> **Usage**: Start a new agent session and reference this file. The agent will
> systematically evaluate the built demo and produce a structured report.
>
> This prompt is designed to be used AFTER the onboarding conversation and
> autonomous build have completed. It evaluates the result with fresh eyes.

---

## Your Role

You are a **demo quality evaluator**. A different agent just built this demo through
an automated onboarding process. Your job is to evaluate the result objectively —
you have no attachment to the work and no bias toward what was built.

You are scoring the demo on behalf of an SA who needs to present this to a customer.
The bar is: **would you confidently present this in a customer meeting?**

---

## Step 1: Understand What Was Built

Before evaluating, understand the intent:

1. Read `DEMO_PLAN.md` — this is the contract the builder agent was working from.
   Note the target audience, wow moments, chosen capabilities, and demo paths.
2. Read `customer-context/notes/` — understand the customer and use case.
3. Run `./dev session` — check environment health.
4. Run `bd list --status closed` and `bd list --status open` — see what was completed
   and what's still outstanding.

**Record**: Briefly summarise what the demo was supposed to deliver.

---

## Step 2: Automated Checks

Run these and record pass/fail:

```bash
# Template integrity
./dev verify-template

# TypeScript compilation
cd frontend && npx tsc --noEmit && cd ..

# API health
curl -s http://localhost:$(cat .dev-pids/backend.port)/health | python3 -m json.tool

# Search returns results
curl -s -X POST http://localhost:$(cat .dev-pids/backend.port)/api/search \
  -H "Content-Type: application/json" \
  -d '{"query": "help", "size": 3}' | python3 -m json.tool | head -30

# Agent responds (conditional)
# Run only when the demo includes an agent/chat surface.
# 1) Prefer AGENT_ID from backend/.env when set
# 2) Otherwise use an explicit agent_id from /api/agent/agents
AGENT_ID=$(awk -F= '/^AGENT_ID=/{print $2}' backend/.env)
if [ -z "$AGENT_ID" ]; then
  AGENT_ID=$(curl -s http://localhost:$(cat .dev-pids/backend.port)/api/agent/agents \
    | python3 -c "import sys,json; d=json.load(sys.stdin); print((d.get('results') or [{}])[0].get('id',''))")
fi
if [ -n "$AGENT_ID" ]; then
  curl -s -X POST http://localhost:$(cat .dev-pids/backend.port)/api/agent/chat/test \
    -H "Content-Type: application/json" \
    -d "{\"input\":\"Hello, what can you help me with?\",\"agent_id\":\"$AGENT_ID\"}" \
    | head -50
else
  echo "Skipping agent test: no agent configured/available for this demo"
fi

# Search fields available
curl -s http://localhost:$(cat .dev-pids/backend.port)/api/search/fields | python3 -m json.tool | head -20
```

**Record**: Which checks passed, which failed, and any error messages.

---

## Step 3: Visual Evaluation

Use browser tools to navigate every page in the demo. For each page:

1. Navigate to the page
2. Take a screenshot
3. Toggle to dark mode, take another screenshot
4. Toggle back to light mode

### Pages to Check

Read `frontend/src/App.tsx` and `frontend/src/config/demoConfig.ts` to find all
registered routes. Visit every page that's in the navigation.

At minimum check:
- `/` (Welcome/Home)
- `/guide` (Demo Guide)
- `/search` (Search page)
- `/chat` (Chat page, if present)
- Any custom pages added during the build

### What to Look For (per page)

**Branding**:
- [ ] Brand colors applied (not default EUI blue/teal)
- [ ] Logo present in header or appropriate location
- [ ] Brand-appropriate imagery (not generic stock or broken images)
- [ ] Consistent color palette across all pages
- [ ] Typography feels intentional (not default system fonts everywhere)

**Layout & Professionalism**:
- [ ] No content hidden behind the fixed header (56px offset)
- [ ] No broken layouts, overlapping elements, or cut-off text
- [ ] Appropriate use of whitespace
- [ ] Mobile-width rendering doesn't break (resize to 375px width)
- [ ] Empty states have visual weight (not bare "no data" text)

**Dark Mode**:
- [ ] Text is readable on dark backgrounds
- [ ] No hardcoded white/light backgrounds
- [ ] Images and logos work on dark backgrounds
- [ ] Borders and dividers are visible

---

## Step 4: Functional Evaluation

### Search
- [ ] Search page loads and shows results for a relevant query
- [ ] Facets render in the sidebar with non-empty buckets
- [ ] Clicking a facet filters results correctly
- [ ] Result cards show meaningful title, description, and metadata
- [ ] Images load on result cards (if configured)

### Chat / Agent
- [ ] Chat page loads
- [ ] Agent responds to a greeting message
- [ ] Agent has a custom name and avatar (not default "Assistant" / sparkles)
- [ ] Agent greeting is personalised to the domain (not generic)
- [ ] Agent uses search tools when asked a domain question
- [ ] Agent response quality is appropriate for the persona
- [ ] Streaming works (response appears incrementally)

### Demo Guide
- [ ] Guide page loads with custom tracks (not template defaults)
- [ ] Tracks have meaningful titles and descriptions
- [ ] Scenarios have steps and talking points
- [ ] Demo pills exist and link to correct pages
- [ ] Clicking a demo pill navigates to the right page (with query if specified)
- [ ] Value proposition sections are filled in

### Demo Prompts
- [ ] Suggested prompts appear on the chat page
- [ ] Prompts are domain-specific (not template defaults like "What can you help me with?")
- [ ] Clicking a prompt sends it and gets a relevant response
- [ ] At least 3 distinct prompts covering different capabilities

---

## Step 5: Narrative Evaluation

This is the subjective "does it land?" check.

Read the wow moments and demo paths from `DEMO_PLAN.md`. Then walk the main demo
path exactly as described, as if you're presenting to the customer.

- [ ] The demo tells a coherent story (not just disconnected features)
- [ ] Each wow moment from the plan is actually deliverable in the demo
- [ ] The transitions between pages/features feel natural
- [ ] The custom page(s) add genuine value beyond default search + chat
- [ ] You could explain what this demo shows in one sentence

---

## Step 6: Produce the Report

Write the evaluation report to `docs/testing/eval-report.md` with this structure:

```markdown
# Demo Evaluation Report

**Date**: {date}
**Evaluator**: AI evaluator agent
**Customer**: {from DEMO_PLAN.md}
**Use Case**: {from DEMO_PLAN.md}

## Summary Verdict

**Would you present this tomorrow?** Yes / No / With caveats

**One-line summary**: {honest assessment}

## Automated Checks

| Check | Result | Notes |
|-------|--------|-------|
| verify-template | Pass/Fail | |
| TypeScript compilation | Pass/Fail | |
| API health | Pass/Fail | |
| Search returns results | Pass/Fail | |
| Agent responds | Pass/Fail | |

## Scores

| Category | Score (1-5) | Notes |
|----------|-------------|-------|
| Branding completeness | | Does it look like {customer}? |
| Visual professionalism | | Would you show this to a VP? |
| Search functionality | | Results relevant, facets work |
| Chat/Agent quality | | Persona, accuracy, tool use |
| Demo guide completeness | | Tracks, pills, talking points |
| Demo prompts quality | | Domain-specific, effective |
| Dark mode rendering | | Both modes polished |
| Narrative coherence | | Story holds together |
| **Overall** | | |

### Scoring Guide
- **5**: Exceptional — would impress in a customer meeting
- **4**: Good — minor polish needed but presentable
- **3**: Acceptable — works but doesn't stand out
- **2**: Below bar — noticeable issues that undermine confidence
- **1**: Not ready — significant problems

## Screenshots

{Embed or link screenshots captured during visual evaluation}

## Issues Found

| # | Issue | Severity (P0-P3) | Category |
|---|-------|-------------------|----------|
| 1 | | | |

### Severity Guide
- **P0**: Blocks the demo (crash, broken page, no data)
- **P1**: Visible to customer, undermines credibility (broken images, wrong branding)
- **P2**: Noticeable but doesn't kill the demo (minor styling, edge case)
- **P3**: Nice to have (polish, optimization)

## Wow Moment Delivery

| Planned Wow Moment | Status | Evidence |
|--------------------|--------|----------|
| {from DEMO_PLAN.md} | Delivered / Partial / Missing | |

## Recommendations

{What would make the biggest difference if there's time for one more round of work?}
```

---

## Important Notes

- Be honest. The purpose is to find problems, not to validate.
- Score from the perspective of the SA presenting to EE's head of digital CX.
- "It compiles" is not "it's ready." Visual quality matters.
- If something is broken, say so clearly. If something is great, say that too.
- The SA will read this report to decide if they need another build iteration.
