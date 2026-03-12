/**
 * Assistant Task Configuration
 *
 * Defines distinct "tasks" or work modes the assistant supports.
 * Each task configures which content panels appear, which browser tools
 * are available, and what suggestions to show.
 *
 * The template provides types and a single default task.
 * Demos create their own task configs and override ASSISTANT_TASKS.
 *
 * @example
 * // Demo tasks (e.g. in config/myDemoTasks.ts):
 * import type { AssistantTaskConfig } from './assistantTasks'
 * export const PLANNER_TASK: AssistantTaskConfig = {
 *   id: 'planner',
 *   label: 'Planner',
 *   icon: 'list',
 *   color: '#2B6CB0',
 *   description: 'Plan and organise tasks',
 *   modeId: 'planning',
 *   contentTabs: [
 *     { id: 'plan', label: 'Plan', icon: 'calendar' },
 *     { id: 'list', label: 'List', icon: 'list' },
 *   ],
 *   browserToolNames: ['browser.set_weekly_plan', 'browser.set_shopping_list'],
 *   suggestions: [
 *     { label: 'Plan my week', prompt: 'Help me plan meals for this week' },
 *   ],
 * }
 */

import type { AgentPersona } from './agentPersona'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** A content tab in the task's right-hand panel */
export interface TaskTab {
  id: string
  label: string
  /** EUI icon name */
  icon: string
}

/** A quick-start suggestion chip */
export interface TaskSuggestion {
  label: string
  prompt: string
}

/**
 * Configuration for a single assistant task/mode.
 *
 * Each task maps to an AgentMode from agentPersona.ts via `modeId`.
 * Tasks define the UI layout (tabs, tools, suggestions) while modes
 * define the agent behaviour (context prefix, agent ID).
 */
export interface AssistantTaskConfig {
  /** Unique task identifier */
  id: string
  /** Display label */
  label: string
  /** EUI icon name */
  icon: string
  /** Accent colour for the task pill (hex value) */
  color: string
  /** Short description */
  description: string
  /** Corresponding mode ID from agentPersona.ts */
  modeId: string
  /** Right-pane content tabs */
  contentTabs: TaskTab[]
  /** Browser tool names this task can use */
  browserToolNames: string[]
  /** Suggestion chips for this task (optional — overrides mode suggestions) */
  suggestions?: TaskSuggestion[]
}

// ---------------------------------------------------------------------------
// Builder functions
// ---------------------------------------------------------------------------

/**
 * Build a greeting message for a task.
 *
 * Demos can override this with a custom function that switches on task.id.
 * The template version uses the persona name and a generic greeting.
 */
export function buildTaskGreeting(
  task: AssistantTaskConfig,
  persona: AgentPersona,
  firstName: string | null,
): string {
  if (firstName) {
    return `Hi ${firstName}! I'm ${persona.name} — ready to help with ${task.description.toLowerCase()}. What would you like to start with?`
  }
  return `Hello! I'm ${persona.name}. I can help with ${task.description.toLowerCase()}. What would you like to start with?`
}

/**
 * Get suggestions for a task.
 *
 * Returns task-level suggestions if defined, otherwise falls back
 * to the matching mode's suggestions from the persona.
 */
export function buildTaskSuggestions(
  task: AssistantTaskConfig,
  persona: AgentPersona,
): TaskSuggestion[] {
  if (task.suggestions?.length) {
    return task.suggestions
  }
  const mode = persona.modes.find(m => m.id === task.modeId)
  return mode?.suggestions ?? []
}

/**
 * Build placeholder text for the chat input when a task is active.
 */
export function buildTaskPlaceholder(
  task: AssistantTaskConfig,
  persona: AgentPersona,
): string {
  return `Ask ${persona.name} about ${task.description.toLowerCase()}...`
}

// ---------------------------------------------------------------------------
// Defaults
// ---------------------------------------------------------------------------

/** Default task for the template — a simple general assistant */
export const DEFAULT_TASK: AssistantTaskConfig = {
  id: 'general',
  label: 'General',
  icon: 'sparkles',
  color: '#0077CC',
  description: 'General assistance',
  modeId: 'general',
  contentTabs: [],
  browserToolNames: [],
  suggestions: [
    { label: 'Help me search', prompt: 'Help me find what I\'m looking for' },
    { label: 'Get started', prompt: 'What can you help me with?' },
  ],
}

/** All available tasks — demos override this array */
export const ASSISTANT_TASKS: AssistantTaskConfig[] = [DEFAULT_TASK]

/** Look up a task by ID */
export function getTaskById(id: string): AssistantTaskConfig | undefined {
  return ASSISTANT_TASKS.find(t => t.id === id)
}
