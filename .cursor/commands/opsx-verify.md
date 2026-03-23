---
name: /opsx-verify
id: opsx-verify
category: Workflow
description: Run UAT golden path tests and design review against OpenSpec specs
---

Run UAT verification: golden path browser tests + design review against specs.

This is the final quality gate after build. It produces a structured pass/fail report with screenshot evidence.

**Input**: Optionally specify a change name (e.g., `/opsx:verify build-kwikfit-demo`). If omitted, auto-detect from active changes.

**Pre-requisites**: All build tasks in `tasks.md` should be complete. Servers must be running (`./dev status`).

---

**Steps**

1. **Select the change**

   If a name is provided, use it. Otherwise run `openspec list --json` and auto-select if only one active change exists.

2. **Load specs for verification**

   Read these spec files from `openspec/changes/<name>/specs/`:
   - `golden-paths/spec.md` — end-to-end demo journey scenarios
   - `demo-experience/spec.md` — quality contract (domain authenticity, production feel)
   - Any capability specs (`search-page/`, `{custom-page}/`, `agent-persona/`, `branding/`)

3. **Confirm servers are running**

   ```bash
   ./dev status
   ```

   If not running, prompt user to start with `./dev start`.

4. **Run Golden Path Tests (functional UAT)**

   For each golden path requirement in `specs/golden-paths/spec.md`:

   a. Read the **Track** metadata and announce: "Testing Golden Path: {title}"

   b. For each scenario within the path:
      - Read the **Navigation** metadata (path, label)
      - Navigate to the page in the browser
      - Execute each **Step** (search queries, click actions, chat messages)
      - Take a screenshot after each step
      - Check each **Expected outcome** line (the THEN conditions)
      - Record: Pass / Fail / Partial with notes

   c. Check the **Fail conditions absent** scenario:
      - Verify none of the listed fail conditions occur across the path

5. **Run Design Review (experiential UAT)**

   For each requirement in `specs/demo-experience/spec.md`:

   a. Check "Domain-authentic first impression":
      - Navigate to each page in the demo
      - Take a screenshot of each
      - Verify domain identification within 5 seconds
      - Verify no template artifacts visible

   b. Check "Domain-specific content and terminology":
      - Review all visible text on key pages
      - Flag any generic/template terms

   c. Check "Dark mode consistency":
      - Toggle to dark mode
      - Navigate all pages, screenshot each
      - Verify readability and branding

   d. Check "Cross-page branding consistency":
      - Compare branding elements across 3+ pages
      - Verify logo, colours, fonts are consistent

6. **Run Capability Spot Checks**

   For each capability spec (`search-page`, `agent-persona`, `branding`, custom pages):
   - Pick 2-3 key scenarios from the spec
   - Verify them via browser interaction
   - Record results

7. **Generate Verification Report**

   Create `openspec/changes/<name>/verify-report.md` with this structure:

   ```markdown
   # UAT Verification Report: {change-name}

   **Date**: {date}
   **Verified by**: AI Agent
   **Servers**: Backend port {port}, Frontend port {port}

   ## Golden Path Results

   | Path | Scenario | Status | Evidence | Notes |
   |------|----------|--------|----------|-------|
   | {path_title} | {scenario} | Pass/Fail | screenshot-NNN.png | {notes} |

   ## Design Review Results

   | Requirement | Scenario | Status | Notes |
   |-------------|----------|--------|-------|
   | Domain authenticity | Visual identification | Pass/Fail | {notes} |
   | Domain authenticity | No template artifacts | Pass/Fail | {notes} |
   | Content density | Information density | Pass/Fail | {notes} |
   | Dark mode | Theme toggle | Pass/Fail | {notes} |
   | Branding | Cross-page consistency | Pass/Fail | {notes} |

   ## Capability Spot Checks

   | Capability | Scenario | Status | Notes |
   |------------|----------|--------|-------|
   | {capability} | {scenario} | Pass/Fail | {notes} |

   ## Issues Found

   | ID | Severity | Description | Fix Type | Spec Reference |
   |----|----------|-------------|----------|----------------|
   | 1 | P0/P1/P2 | {description} | Auto-fix / Consult SA | specs/{cap}/spec.md |

   ## Overall Verdict

   | Gate | Result |
   |------|--------|
   | All golden paths pass end-to-end | Pass / Fail |
   | No P0/P1 design issues | Pass / Fail |
   | Domain authenticity verified | Pass / Fail |
   | Dark/light mode both polished | Pass / Fail |
   | Would present this tomorrow? | Yes / No — {rationale} |
   ```

8. **Present results and next steps**

   If all gates pass: "UAT complete — ready for `/opsx:archive`."

   If issues found:
   - **Auto-fix issues** (prompt wording, config values, missing images): offer to fix immediately
   - **P0/P1 issues**: list them clearly and recommend fixing before delivery
   - **Consult-SA issues** (scope changes, narrative changes): flag for SA review

   After fixes, offer to re-run verification on failed scenarios only.

**Guardrails**
- Always take screenshots — the report must include visual evidence
- Check BOTH light and dark mode
- Do not skip golden paths — each is a required test
- If browser tools are unavailable, fall back to API-only testing and note that visual verification was not performed
- The verify report lives in the change directory (not project root)
- Auto-fix vs Consult-SA: only auto-fix things that don't change the agreed narrative (see decision framework in design.md)
