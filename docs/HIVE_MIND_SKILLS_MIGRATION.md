# Hive Mind Skills Migration Assessment

## Why this exists

Hive Mind recently moved toward a new agent-skills-oriented format. This project consumes Hive Mind as a submodule, so onboarding and environment checks need to remain stable across both:

- legacy pattern-first layouts (`hive-mind/patterns`, `.hive-mind-index.json`)
- newer skills-style layouts (`hive-mind/skills` or `hive-mind/.cursor/skills`)

## What was updated in this repo

1. `dev`
   - Added format-agnostic Hive Mind detection via `is_hive_mind_loaded()`.
   - Updated `verify` and `session` commands to use that detection.
   - Fixed `bd` issue-count parsing in `./dev session` with portable regex (`[[:space:]]`) to avoid macOS shell arithmetic failures.

2. `setup.sh`
   - Updated submodule initialization gating to support both legacy and new Hive Mind layouts.
   - Added explicit log output for detected layout (patterns vs skills format) to make onboarding behavior visible.

3. `docs/prompts/WELCOME_PROMPT.md`
   - Added `./dev session` as the first environment snapshot command.
   - Added guidance to prefer repo-local onboarding context when machine-level Hive Mind setup exists from other projects.

4. `README.md`
   - Added onboarding stability note for machines that already ran Hive Mind bootstrap in other repos.

## Onboarding risks addressed

- **False negative Hive Mind detection** when format changes.
- **`./dev session` failing on macOS** due to non-portable regex parsing.
- **Cross-project global AI setup bleed-through** causing onboarding drift.

## Validation checklist

- `./dev session` runs successfully and reports session details.
- `./dev verify` passes.
- `./dev verify-template` passes to ensure no template integrity regressions.

