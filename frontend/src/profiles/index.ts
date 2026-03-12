/**
 * Profile System — barrel export
 *
 * Re-exports types, context, and defaults for convenient imports:
 *   import { useProfile, ProfileProvider } from '../profiles'
 *   import type { DemoProfile } from '../profiles'
 */

export type {
  DemoProfile,
  ProfileStat,
  AttributeGroup,
  AttributeItem,
  TagGroup,
  ProfileMember,
  PeopleGroup,
  SearchPersonalization,
} from './types'

export { ProfileProvider, useProfile } from './ProfileContext'
export { ProfileSwitcher } from './ProfileSwitcher'
export { GUEST_PROFILE } from './defaultProfiles'
