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
    prompt: 'Summarize the top operational risks from today\'s open incidents.',
    label: 'Risk Summary',
    feature: 'Executive View',
    outcome: 'Shows concise, business-focused risk framing with clear priorities for leadership.',
    color: 'primary',
    icon: '📊',
  },
  {
    prompt: 'Find high severity faults related to vibration and tell me what to do first.',
    label: 'Find Critical Faults',
    feature: 'Search + Guidance',
    outcome: 'Combines incident lookup with actionable recommendations in one response.',
    color: 'accent',
    icon: '🚨',
  },
  {
    prompt: 'Explain this fault step by step in plain language for a non-technical manager.',
    label: 'Plain-language Explain',
    feature: 'Reasoning',
    outcome: 'Demonstrates transparent reasoning that technical and business audiences can both follow.',
    color: 'success',
    icon: '🧠',
  },
  {
    prompt: 'Draft a 30-second incident briefing with immediate action, risk, and expected downtime.',
    label: '30-sec Briefing',
    feature: 'Decision Support',
    outcome: 'Produces a meeting-ready summary that helps stakeholders make a quick decision.',
    color: 'warning',
    icon: '⏱️',
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
