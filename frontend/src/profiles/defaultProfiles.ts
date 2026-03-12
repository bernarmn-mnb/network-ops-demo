/**
 * Default Demo Profiles (offline fallback)
 *
 * The backend /api/profiles is the source of truth for demo persona data.
 * This file provides a minimal Guest profile so the app renders cleanly
 * even when the API is unavailable. Demo-specific personas live in
 * backend/data/profiles.json — NOT here.
 */

import type { DemoProfile } from './types'

export const GUEST_PROFILE: DemoProfile = {
  id: 'guest',
  name: 'Guest',
  avatar: '',
  role: 'New Visitor',
  tagline: 'Browsing without personalisation',
}

/**
 * Fallback profile list. Contains only Guest — real profiles are fetched
 * from /api/profiles on mount. This avoids baking demo-specific data
 * into the template source.
 */
export const defaultProfiles: DemoProfile[] = [GUEST_PROFILE]
