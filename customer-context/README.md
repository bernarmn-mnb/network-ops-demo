# Customer Context

Drop customer-specific background materials here so the AI onboarding assistant can
tailor its demo strategy to the actual customer situation. Files in this directory
are **gitignored** (they contain customer-specific information) but the directory
structure itself is committed via `.gitkeep` files.

## Directory Structure

```
customer-context/
  emails/        <- Relevant email threads, meeting invites, pre-call briefs
  notes/         <- Your own notes from calls, discovery sessions, whiteboard photos
  requirements/  <- RFPs, technical requirements docs, evaluation criteria
  research/      <- Customer website excerpts, annual reports, press releases, org charts
```

## What to Put Where

### emails/
Copy-paste or save relevant email threads as `.md` or `.txt` files. The AI looks for:
- What the customer said they care about (in their own words)
- Names and roles of stakeholders (who needs to be impressed)
- Timeline and urgency signals
- Specific products or competitors mentioned

### notes/
Your own observations and context. Examples:
- `discovery-call-2026-02-05.md` - Notes from a discovery call
- `tech-stack.md` - What you know about their current infrastructure
- `politics.md` - Internal dynamics, champions vs. skeptics

### requirements/
Formal documents the customer has shared:
- RFP responses or evaluation matrices
- Technical requirements or architecture diagrams
- Security/compliance questionnaires
- Integration requirements

### research/
Background research you or the AI have gathered:
- Excerpts from the customer's website or engineering blog
- Recent press releases or earnings call highlights
- Industry reports relevant to this customer
- Competitor analysis

## How the AI Uses This

During the onboarding brainstorm, the AI checks if any files exist here. If they do:

1. **Context Loading**: Files are scanned for key signals (pain points, stakeholders,
   tech stack, timeline, competitors)
2. **Strategy Tailoring**: Demo recommendations are customized to what the customer
   actually cares about, not generic verticals
3. **Objection Prep**: If competitors are mentioned, the AI prepares specific
   counter-positioning
4. **Stakeholder Mapping**: Different demo flows can be suggested for technical vs.
   executive audiences

If this directory is empty, the AI falls back to vertical-level value propositions
and asks you discovery questions instead.

## File Format

Use **Markdown** (`.md`) or plain text (`.txt`). Keep files focused:
- One email thread per file
- One meeting's notes per file
- Label files with dates when relevant

The AI processes these as unstructured text, so don't worry about formatting perfectly.
Just get the information in here.

## Privacy

This entire directory is gitignored. Customer-specific information never leaves your
local machine or gets committed to the repository. When you're done with a customer
engagement, you can safely delete the contents.
