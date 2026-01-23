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
   - Run `bd ready` to see available work before starting
   - Reference issues in commits: `[bd-XX] description`
   - See `hive-mind/meta/workflows/BEADS_ISSUE_TRACKER.md` for full guide

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

## Reference Guide

Operational references (project stack, dev commands, port discovery, branding notes, and key patterns) live in `docs/AI_ASSISTANT_GUIDE.md`.

---

## Issue Tracking (if `.beads/` exists)

This project uses `bd` (beads) for issue tracking when enabled. Run `bd prime` for workflow context, or install hooks (`bd hooks install`) for auto-injection. For full workflow details: `bd prime`.

**Check if enabled**: Look for `.beads/` folder in project root.

**If enabled**, use these commands:

```bash
bd ready                    # What can I work on? (no blockers)
bd list --status open       # All open issues
bd create "title" --type bug  # Create new issue
bd close [id] -r "reason"   # Close with reason
```

**Workflow integration**:

- Before starting work: `bd ready`
- Reference in commits: `[bd-XX] description`
- After completing: `bd close bd-XX -r "Done"`

See `hive-mind/meta/workflows/BEADS_ISSUE_TRACKER.md` for full guide.

---

## Project Planning & Tracking

For new features:

1. Use Speckit to define spec → plan → tasks (`/speckit.constitution`, `/speckit.specify`, `/speckit.plan`, `/speckit.tasks`)
2. Convert tasks to Beads issues (`bd create`)
3. Add dependencies (`bd dep add`)
4. Implement using `/speckit.implement`
5. Update issue status as you progress (`bd update`, `bd close`)
6. File new issues for discovered work (`bd create --type discovered-from`)

Check ready work: `bd ready --json`

---

## AI Assistant Operating Rules

Concise policy reference for all coding agents touching this repository. Keep responses factual and avoid speculative language.

### 1. Communication & Planning

- Always mention assumptions; ask the user to confirm anything ambiguous before editing.
- Follow the required plan/approval workflow when prompted and wait for explicit approval to execute.
- Use UK-English spelling in comments, documentation, and commit messages.

### 2. File Safety

- Do **not** edit `.env` or other environment files; only reference `.env.example`.
- Delete files only when you created them or the user explicitly instructs you to remove older assets.
- Never run destructive git commands (`git reset --hard`, `git checkout --`, `git restore`, `rm -rf .git`) unless the user provides written approval in this thread.
- Treat rename automation as a one-time setup; never re-run it on an established project.

### 3. Collaboration Etiquette

- If another agent has edited a file, read their changes and build on them—do not revert or overwrite.
- Coordinate before touching large refactors that might conflict with ongoing work.
- Prefer `apply_patch` (or notebook editing tools) so diffs stay minimal and reviewable.

### 4. Git & Commits

- Check `git status` before staging and before committing.
- Keep commits atomic and list paths explicitly, e.g. `git commit -m "feat: add CI" -- path/to/file`.
- For new files: `git restore --staged :/ && git add <paths> && git commit -m "<msg>" -- <paths>`.
- Quote any paths containing brackets/parentheses when staging to avoid globbing.
- Never amend existing commits unless the user instructs you to.

### 5. Pre-flight Checklist

1. Read the task, confirm assumptions, and outline the approach.
2. Inspect the relevant files (include imports/configs for context).
3. Run the documented commands (`make lint`, `make test`, etc.) after code changes; backend targets use uv from `backend/pyproject.toml`.
4. Summarise edits, mention tests, and flag follow-up work in the final response.

Refer to `docs/AI_ASSISTANT_GUIDE.md` for detailed prompts, command references, and Speckit guidance.
