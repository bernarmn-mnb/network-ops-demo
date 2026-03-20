#!/usr/bin/env bash
# Convert OpenSpec tasks.md into beads issues with spec references
#
# Usage: ./scripts/openspec-to-beads.sh <change-name> [--epic <epic-id>] [--dry-run]
#
# Reads openspec/changes/<change-name>/tasks.md, parses task groups and
# individual tasks, and creates beads issues with bd create.
#
# Each beads task references the relevant OpenSpec spec file for acceptance
# criteria instead of embedding checkboxes — keeping beads lightweight.
#
# If --epic is provided, links each task as a dependency of the epic.
# If --dry-run is provided, prints bd commands without executing them.

set -euo pipefail

CHANGE_NAME="${1:?Usage: $0 <change-name> [--epic <epic-id>] [--dry-run]}"
shift

EPIC_ID=""
DRY_RUN=false

while [[ $# -gt 0 ]]; do
  case "$1" in
    --epic) EPIC_ID="$2"; shift 2 ;;
    --dry-run) DRY_RUN=true; shift ;;
    *) echo "Unknown option: $1"; exit 1 ;;
  esac
done

CHANGE_DIR="openspec/changes/${CHANGE_NAME}"
TASKS_FILE="${CHANGE_DIR}/tasks.md"
SPECS_DIR="${CHANGE_DIR}/specs"

if [[ ! -f "$TASKS_FILE" ]]; then
  echo "Error: $TASKS_FILE not found"
  exit 1
fi

echo "Converting OpenSpec tasks from: $TASKS_FILE"
[[ "$DRY_RUN" == "true" ]] && echo "(dry run — no beads will be created)"
echo ""

# Build a list of available spec files for reference
spec_files=""
if [[ -d "$SPECS_DIR" ]]; then
  spec_files=$(find "$SPECS_DIR" -name "spec.md" -type f 2>/dev/null | sort)
fi

current_group=""
task_ids=()
task_count=0

while IFS= read -r line; do
  # Match group headers: ## 1. Group Name
  if [[ "$line" =~ ^##\ [0-9]+\.\ (.+) ]]; then
    current_group="${BASH_REMATCH[1]}"
    continue
  fi

  # Match task lines: - [ ] 1.1 Task description
  if [[ "$line" =~ ^-\ \[\ \]\ ([0-9]+\.[0-9]+)\ (.+) ]]; then
    task_num="${BASH_REMATCH[1]}"
    task_desc="${BASH_REMATCH[2]}"
    title="[${current_group}] ${task_desc}"
    task_count=$((task_count + 1))

    # Find relevant spec references from task description
    acceptance="Implement per OpenSpec specs in ${CHANGE_DIR}/specs/"
    if echo "$task_desc" | grep -qi "search"; then
      [[ -f "${SPECS_DIR}/search-page/spec.md" ]] && acceptance="Satisfies scenarios in ${SPECS_DIR}/search-page/spec.md"
    elif echo "$task_desc" | grep -qi "brand"; then
      [[ -f "${SPECS_DIR}/branding/spec.md" ]] && acceptance="Satisfies scenarios in ${SPECS_DIR}/branding/spec.md"
    elif echo "$task_desc" | grep -qi "agent\|chat\|persona"; then
      [[ -f "${SPECS_DIR}/agent-persona/spec.md" ]] && acceptance="Satisfies scenarios in ${SPECS_DIR}/agent-persona/spec.md"
    elif echo "$task_desc" | grep -qi "demo.*track\|golden.*path\|demo.*guide"; then
      [[ -f "${SPECS_DIR}/golden-paths/spec.md" ]] && acceptance="Generate from ${SPECS_DIR}/golden-paths/spec.md"
    elif echo "$task_desc" | grep -qi "verify\|UAT\|test"; then
      acceptance="Run /opsx:verify against all specs in ${SPECS_DIR}/"
    fi

    # Always add demo-experience as cross-cutting quality check
    if [[ -f "${SPECS_DIR}/demo-experience/spec.md" ]]; then
      acceptance="${acceptance}
Also satisfies: ${SPECS_DIR}/demo-experience/spec.md (domain authenticity)"
    fi

    cmd="bd create \"${title}\" --type task --priority 2 --acceptance \"${acceptance}\""

    if [[ "$DRY_RUN" == "true" ]]; then
      echo "  $cmd"
    else
      output=$(eval "$cmd" 2>&1)
      task_id=$(echo "$output" | grep -oE '[a-z-]+-[a-z0-9]+' | head -1)
      if [[ -n "$task_id" ]]; then
        task_ids+=("$task_id")
        echo "  Created: $task_id — $title"
        if [[ -n "$EPIC_ID" ]]; then
          bd dep add "$task_id" "$EPIC_ID" 2>/dev/null || true
        fi
      else
        echo "  Warning: could not parse ID from: $output"
      fi
    fi
  fi
done < "$TASKS_FILE"

echo ""
if [[ "$DRY_RUN" == "true" ]]; then
  echo "Dry run complete. ${task_count} tasks would be created."
  echo "Each task references specs in ${SPECS_DIR}/ for acceptance criteria."
else
  echo "Created ${#task_ids[@]} beads issues from OpenSpec tasks."
  [[ -n "$EPIC_ID" ]] && echo "All linked to epic: $EPIC_ID"
  echo "Tasks reference specs in ${SPECS_DIR}/ for acceptance criteria."
fi
