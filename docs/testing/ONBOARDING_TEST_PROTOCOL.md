# Onboarding Test Protocol

> **Purpose**: Measure the end-to-end experience of building a custom demo from scratch.
> Tests the full pipeline: SA coaching conversation → autonomous build → working branded demo.
>
> **Test customer**: EE (UK telecom) — support agent use case
> **Expected total time**: 1.5–3 hours depending on build path

---

## Pre-Flight: Reset to Clean State

Run these steps to simulate a fresh clone. You're on the `testing/onboarding-eval` branch.

```bash
# 1. Clear any previous demo artifacts
rm -f DEMO_PLAN.md
rm -f customer-context/notes/*.md
rm -f customer-context/emails/*.md
rm -f customer-context/requirements/*.md
rm -f customer-context/research/*.md

# 2. Reset demo config files to defaults (verify they're still template defaults)
# demoConfig.ts: NAV_LAYOUT=null, NAV_PAGES=null, DEMO_TITLE=null, DEMO_SUBTITLE=null
# demoTracks.ts: should have template defaults
# demoPrompts.ts: should have template defaults

# 3. Drop any testing brand themes
rm -f frontend/src/branding/testing*.ts

# 4. Reset backend .env to OOTB defaults (keep ES connection, clear AGENT_ID)
# In backend/.env: set AGENT_ID= (empty), SEARCH_INDEX=ootb-products (or empty)

# 5. Verify servers are running
./dev status
./dev verify
```

---

## Phase 1: Customer Context Seeding

**Timer start**: Note the clock time when you begin.

Drop the EE customer context file into `customer-context/notes/`. This simulates
an SA who has basic info about their customer but hasn't decided what to build yet.

The seed file is at: `docs/testing/ee-customer-seed.md`

```bash
cp docs/testing/ee-customer-seed.md customer-context/notes/
```

**Time checkpoint**: This should take < 2 minutes.

---

## Phase 2: The Onboarding Conversation

**Timer start**: Note the clock time.

Open a **new agent session** (fresh chat). The agent should:
1. Run `./dev session` automatically
2. Detect no `DEMO_PLAN.md` → new session
3. Read `customer-context/notes/ee-customer-seed.md`
4. Begin the SA coaching conversation

### Your Role (SA Persona)

You're an SA covering UK telecoms. You have a meeting with EE in two weeks about
improving their customer support experience. You don't have a super specific idea
yet — you know EE is interested in AI but you want the agent to help you figure out
what would land best.

**Conversation beats to time**:

| Beat | What Happens | Note the Time |
|------|-------------|---------------|
| Opening | Agent summarises what it found, asks about the opportunity | ⏱ ______ |
| Ideation/Discovery | Brainstorming demo ideas, archetype selection | ⏱ ______ |
| Strategy | Concrete plan: data, capabilities, branding, agent persona | ⏱ ______ |
| UX Design | Custom page concepts, visual design discussion | ⏱ ______ |
| Plan Creation | DEMO_PLAN.md written, beads tasks created | ⏱ ______ |

### SA Responses to Guide the Test

These aren't scripts — adapt naturally — but steer toward:

- **When asked about the customer**: "EE, the UK mobile network. Big BT Group company.
  Meeting is with their digital customer experience team. They handle millions of
  support contacts a month and want to see what AI can do."
- **When asked about ideas**: Let the agent propose archetypes. Lean toward a
  support agent / help desk assistant. Mention you like the idea of customers being
  able to troubleshoot issues themselves.
- **When asked about data**: Push for OOTB data. Say something like "I don't want to
  spend hours on data, can we use what's already there?"
- **When asked about branding**: "Yeah definitely, it needs to look like EE. Can you
  grab their branding from the website?"
- **When asked about delivery**: "Just local for now, I'll screen share."
- **When asked about custom pages**: Be open to whatever the agent proposes. Pick
  the one that sounds most impressive.

**Phase 2 complete when**: `DEMO_PLAN.md` exists and beads tasks are created.
**Time checkpoint**: ⏱ ______ (target: 15–30 minutes for the conversation)

---

## Phase 3: The Autonomous Build

**Timer start**: Note the clock time.

After the plan is created, tell the agent to proceed with the build. Say something like:
> "Looks good, let's build it."

The agent should work through the beads tasks autonomously. You shouldn't need to
intervene unless it asks a scope question.

**Watch for**:
- Does it work through tasks in a logical order?
- Does it get stuck anywhere?
- How many times does it need to ask you something?
- Any errors or recovery loops?

**Phase 3 complete when**: The agent says the demo is ready (or you run out of patience).
**Time checkpoint**: ⏱ ______ (target: 30–90 minutes depending on build path)

---

## Phase 4: Evaluation

**Now switch to a new agent session** and use the evaluation prompt.

```bash
# The evaluation prompt is at:
# docs/testing/EVAL_PROMPT.md
#
# Start a new Cursor chat and paste/reference this prompt.
# The evaluator agent will systematically check everything.
```

The evaluator will:
1. Run automated checks (`verify-template`, TypeScript, API health)
2. Take browser screenshots of every page
3. Score branding, functionality, professionalism, and narrative
4. Produce a structured report

Use `docs/testing/PROFESSIONAL_CLONE_QA_CHECKLIST.md` alongside the evaluator report for template-level brand fidelity gates.

---

## Phase 5: Record Results

Fill in the scorecard below after the evaluation agent completes.

### Timing Summary

| Phase | Start | End | Duration |
|-------|-------|-----|----------|
| Pre-flight reset | | | |
| Conversation (Phase 2) | | | |
| Autonomous build (Phase 3) | | | |
| **Total wall-clock time** | | | |

### SA Experience Notes

- Did the conversation feel natural? (1-5): ___
- Did the agent propose good ideas? (1-5): ___
- How many times did you have to redirect? ___
- Any confusing or awkward moments? ___
- Would a less technical SA manage this? (yes/no): ___

### Evaluator Scores (filled by eval agent)

| Category | Score (1-5) | Notes |
|----------|-------------|-------|
| Branding completeness | | |
| Visual professionalism | | |
| Search functionality | | |
| Chat/Agent functionality | | |
| Demo guide quality | | |
| Demo pills/prompts | | |
| Dark mode rendering | | |
| Overall "would you present this?" | | |

### Issues Found

| Issue | Severity | Category |
|-------|----------|----------|
| | | |

---

## After the Test

```bash
# Save the results
git add -A
git commit -m "test: onboarding eval run $(date +%Y-%m-%d)"

# Compare what changed
git diff main..testing/onboarding-eval --stat

# To run again from scratch, reset:
git checkout testing/onboarding-eval
# Then re-run pre-flight reset steps
```
