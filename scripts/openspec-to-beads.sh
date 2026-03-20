#!/usr/bin/env bash
# Convert OpenSpec tasks.md into beads issues
#
# Usage: ./scripts/openspec-to-beads.sh <change-name> [--epic <epic-id>] [--dry-run]
#
# Reads openspec/changes/<change-name>/tasks.md, parses task groups and
# individual tasks, and creates beads issues with bd create.
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

TASKS_FILE="openspec/changes/${CHANGE_NAME}/tasks.md"
PROPOSAL_FILE="openspec/changes/${CHANGE_NAME}/proposal.md"

if [[ ! -f "$TASKS_FILE" ]]; then
  echo "Error: $TASKS_FILE not found"
  exit 1
fi

echo "Converting OpenSpec tasks from: $TASKS_FILE"
[[ "$DRY_RUN" == "true" ]] && echo "(dry run — no beads will be created)"
echo ""

# Extract acceptance criteria from the spec if it exists
SPEC_DIR="openspec/changes/${CHANGE_NAME}/specs"

current_group=""
task_ids=()

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

    cmd="bd create \"${title}\" --type task --priority 2"

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
  echo "Dry run complete. $(grep -c '^\- \[ \]' "$TASKS_FILE") tasks would be created."
else
  echo "Created ${#task_ids[@]} beads issues from OpenSpec tasks."
  [[ -n "$EPIC_ID" ]] && echo "All linked to epic: $EPIC_ID"
fi
