/**
 * useProfileContext Hook
 *
 * Builds a rich natural-language context string from the user's profile
 * so the agent can personalise every response. The context is injected
 * once at the start of each conversation (not repeated per message).
 *
 * The string is designed to be concise but comprehensive — giving the
 * agent everything it needs to tailor recommendations without the user
 * having to repeat themselves.
 */

import { useMemo } from 'react'
import { useProfile } from '../profiles'
import type { DemoProfile } from '../profiles/types'

export interface ProfileContextOptions {
  /** Custom mapper for profile.extensions — replaces the default scalar iteration */
  extensionsMapper?: (extensions: Record<string, unknown>) => string[]
}

/**
 * Convert a DemoProfile into a natural-language context block for the agent.
 */
export function buildProfileContext(
  profile: DemoProfile,
  isGuest: boolean,
  options?: ProfileContextOptions,
): string | null {
  if (isGuest) return null

  const lines: string[] = []

  lines.push(`Customer: ${profile.name}`)
  if (profile.role) lines.push(`Role: ${profile.role}`)

  // Household members / people
  if (profile.people?.members && profile.people.members.length > 0) {
    const memberDescs = profile.people.members.map((m) => {
      const parts = [m.name]
      if (m.subtitle) parts.push(`(${m.subtitle})`)
      if (m.tags && m.tags.length > 0) parts.push(`— ${m.tags.join(', ')}`)
      return parts.join(' ')
    })
    lines.push(`Household: ${memberDescs.join('; ')}`)
  }

  // Attribute groups (Preferences, Shopping Habits, etc.)
  if (profile.attributes) {
    for (const group of profile.attributes) {
      const items = group.items.map((i) => `${i.label}: ${i.value}`).join(', ')
      lines.push(`${group.title}: ${items}`)
    }
  }

  // Tags (interests, etc.)
  if (profile.tags) {
    for (const tagGroup of profile.tags) {
      lines.push(`${tagGroup.title}: ${tagGroup.values.join(', ')}`)
    }
  }

  // Stats that might be useful (loyalty, spend)
  if (profile.stats) {
    const useful = profile.stats.filter(
      (s) => s.label.toLowerCase().includes('spend') || s.label.toLowerCase().includes('loyalty')
    )
    if (useful.length > 0) {
      lines.push(useful.map((s) => `${s.label}: ${s.value}`).join(', '))
    }
  }

  // Extensions — custom mapper or generic iteration
  if (profile.extensions) {
    if (options?.extensionsMapper) {
      lines.push(...options.extensionsMapper(profile.extensions))
    } else {
      for (const [key, value] of Object.entries(profile.extensions)) {
        if (value != null && typeof value !== 'object') {
          lines.push(`${key}: ${String(value)}`)
        }
      }
    }
  }

  if (lines.length <= 1) return null

  return `--- CUSTOMER PROFILE ---\n${lines.join('\n')}\n--- END PROFILE ---`
}

/**
 * Hook that returns a memoised profile context string.
 * Returns null for guest users.
 */
export function useProfileContext(options?: ProfileContextOptions): string | null {
  const { profile, isGuest } = useProfile()

  return useMemo(
    () => buildProfileContext(profile, isGuest, options),
    [profile, isGuest, options],
  )
}
