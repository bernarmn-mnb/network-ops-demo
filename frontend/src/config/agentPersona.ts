/**
 * Agent Persona Configuration
 *
 * Defines the AI assistant's personality, avatar, and interaction modes.
 * Demos customise by creating their own persona object.
 *
 * @example
 * // Demo persona (e.g. in config/myDemoPersona.ts):
 * import type { AgentPersona } from './agentPersona'
 * export const MY_PERSONA: AgentPersona = {
 *   name: 'Sage',
 *   tagline: 'Your personal shopping assistant',
 *   avatarColor: '#2B6CB0',
 *   avatarUrl: '/sage-avatar.jpg',
 *   avatarOptions: { photo: '/sage-avatar.jpg', illustrated: undefined, initial: undefined },
 *   personality: 'Warm and knowledgeable.',
 *   modes: [
 *     { id: 'shopping', label: 'Shopping', icon: 'package', description: 'Find products', color: '#2B6CB0', contextPrefix: '', suggestions: [] },
 *     { id: 'planning', label: 'Planning', icon: 'list', description: 'Plan ahead', color: '#8B6914', contextPrefix: '', suggestions: [] },
 *   ],
 * }
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Avatar rendering strategy */
export type AvatarStyle = 'photo' | 'illustrated' | 'initial'

/**
 * A distinct interaction mode the agent can operate in.
 *
 * Modes allow a single agent to shift between different tasks or personas.
 * When only one mode exists, the UI hides the mode switcher.
 */
export interface AgentMode {
  id: string
  label: string
  /** EUI icon name */
  icon: string
  description: string
  /** Accent colour for mode UI elements (hex value) */
  color: string
  /** Context prefix injected into agent messages when this mode is active */
  contextPrefix: string
  /** Suggestion chips shown when this mode is active */
  suggestions: { label: string; prompt: string }[]
  /** Override agent ID — uses a dedicated Agent Builder agent for this mode */
  agentId?: string
}

/**
 * Full agent persona definition.
 *
 * Encapsulates everything the UI needs to render and personalise the
 * assistant experience: name, avatar, greeting style, and modes.
 */
export interface AgentPersona {
  name: string
  tagline: string
  /** Fallback avatar initial-letter colour (hex) */
  avatarColor: string
  /** Avatar image URL (resolved from active avatar style) */
  avatarUrl?: string
  /** All available avatar options for preview / selection */
  avatarOptions: Record<AvatarStyle, string | undefined>
  /** Short personality description shown in the UI */
  personality: string
  /** Interaction modes — at least one required */
  modes: AgentMode[]
}

// ---------------------------------------------------------------------------
// Defaults
// ---------------------------------------------------------------------------

/** Default avatar style — demos can override */
export const DEFAULT_AVATAR_STYLE: AvatarStyle = 'initial'

/**
 * Default persona for the template.
 *
 * Provides a single "General" mode with neutral branding.
 * Demos override this with a domain-specific persona.
 */
export const DEFAULT_PERSONA: AgentPersona = {
  name: 'EE Support Copilot',
  tagline: 'your operations support specialist',
  avatarColor: '#1B4D8F',
  avatarUrl: undefined,
  avatarOptions: { photo: undefined, illustrated: undefined, initial: undefined },
  personality: 'Calm, decisive, and focused on turning incident data into clear action.',
  modes: [
    {
      id: 'general',
      label: 'Incident Advisor',
      icon: 'wrench',
      description: 'Prioritise incidents and explain practical next steps',
      color: '#1B4D8F',
      contextPrefix: '',
      suggestions: [
        { label: 'Top risks', prompt: 'Summarize the highest operational risks right now.' },
        { label: 'Next best action', prompt: 'Given this fault, what should the team do first?' },
        { label: 'Exec briefing', prompt: 'Give me a 30-second business briefing for this incident.' },
      ],
    },
  ],
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Time-of-day aware greeting prefix.
 * Returns "Morning", "Afternoon", or "Evening".
 */
export function getTimeOfDayGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return 'Morning'
  if (hour < 17) return 'Afternoon'
  return 'Evening'
}

/**
 * Build a personalised greeting for the agent.
 *
 * @param persona - The active agent persona
 * @param firstName - User's first name, or null for guests
 * @param isGuest - Whether the user is an unauthenticated guest
 */
export function buildPersonalisedGreeting(
  persona: AgentPersona,
  firstName: string | null,
  isGuest: boolean,
): string {
  const tod = getTimeOfDayGreeting()

  if (isGuest || !firstName) {
    return `Good ${tod.toLowerCase()}! I'm ${persona.name}, ${persona.tagline.toLowerCase()}. How can I help you today?`
  }

  return `Good ${tod.toLowerCase()}, ${firstName}! I'm ${persona.name}, ${persona.tagline.toLowerCase()}. How can I help you today?`
}
