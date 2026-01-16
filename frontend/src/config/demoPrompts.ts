/**
 * Demo Prompt Configuration
 * 
 * This file defines suggested prompts for live demos. Each prompt includes:
 * - The prompt text to send to the agent
 * - Feature it demonstrates
 * - Expected outcome for the presenter
 * 
 * EASY TO EDIT: Just modify this file when your demo needs change!
 * 
 * NOTE: Keep this list SHORT (4-5 prompts) to avoid cluttering the UI.
 * Each prompt should demonstrate a distinct, compelling feature.
 */

export interface DemoPrompt {
  /** The prompt text to send */
  prompt: string
  
  /** Short label for the pill (defaults to prompt if not provided) */
  label?: string
  
  /** Primary feature this prompt demonstrates (shown on pill) */
  feature: string
  
  /** What the presenter should observe/explain (shown in tooltip) */
  outcome: string
  
  /** Color for the feature badge */
  color?: 'accent' | 'success' | 'primary' | 'warning' | 'hollow'
  
  /** Icon to show (EUI icon name or emoji) */
  icon?: string
}

/**
 * Demo prompts - keep this list focused!
 * 
 * Each prompt demonstrates ONE key feature clearly.
 * The feature is shown directly on the pill for easy reference.
 * 
 * CUSTOMIZE THESE for your specific Agent Builder agent!
 */
export const DEMO_PROMPTS: DemoPrompt[] = [
  {
    prompt: 'What can you help me with?',
    label: 'Capabilities',
    feature: 'Introduction',
    outcome: 'Agent explains its capabilities. Shows streaming response and reasoning steps.',
    color: 'primary',
    icon: '💡',
  },
  {
    prompt: 'Search for recent security alerts',
    label: 'Search alerts',
    feature: 'Tool Call',
    outcome: 'Agent uses a tool to search data. Watch the tool call card appear with inputs/outputs.',
    color: 'accent',
    icon: '🔍',
  },
  {
    prompt: 'Explain this step by step',
    label: 'Step by step',
    feature: 'Reasoning',
    outcome: 'Agent shows detailed reasoning steps. Expand each step to see the thinking process.',
    color: 'success',
    icon: '🧠',
  },
  {
    prompt: 'Summarize our conversation',
    label: 'Summarize',
    feature: 'Context',
    outcome: 'Agent uses conversation history to provide a summary. Shows context awareness.',
    color: 'warning',
    icon: '📝',
  },
]

/**
 * Get all demo prompts
 */
export function getDemoPrompts(): DemoPrompt[] {
  return DEMO_PROMPTS
}

/**
 * Get a demo prompt by feature name
 */
export function getDemoPromptByFeature(feature: string): DemoPrompt | undefined {
  return DEMO_PROMPTS.find(p => p.feature.toLowerCase() === feature.toLowerCase())
}
