/**
 * Profile Context Provider
 *
 * Manages the active demo persona. Follows the same pattern as BrandContext:
 *  - Loads profiles from /api/profiles (falls back to embedded defaults)
 *  - Persists selection in localStorage + optional ?profile= URL param
 *  - Exposes useProfile() hook for any component to read the active persona
 *
 * Usage:
 *   const { profile, setProfile, profiles } = useProfile()
 */

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react'
import type { DemoProfile } from './types'
import { defaultProfiles, GUEST_PROFILE } from './defaultProfiles'

const STORAGE_KEY = 'demo-profile-id'
const URL_PARAM = 'profile'

// ---------------------------------------------------------------------------
// Context shape
// ---------------------------------------------------------------------------

interface ProfileContextType {
  profile: DemoProfile
  profileId: string
  setProfile: (id: string) => void
  profiles: DemoProfile[]
  isGuest: boolean
  /** True while the initial API fetch is in flight */
  isLoading: boolean
  refreshProfiles: () => Promise<void>
}

const ProfileContext = createContext<ProfileContextType | null>(null)

// ---------------------------------------------------------------------------
// Persistence helpers
// ---------------------------------------------------------------------------

function getStoredProfileId(): string | null {
  if (typeof window === 'undefined') return null
  const urlParams = new URLSearchParams(window.location.search)
  return urlParams.get(URL_PARAM) || localStorage.getItem(STORAGE_KEY)
}

function persistProfileId(id: string): void {
  localStorage.setItem(STORAGE_KEY, id)

  const url = new URL(window.location.href)
  if (url.searchParams.has(URL_PARAM)) {
    url.searchParams.set(URL_PARAM, id)
    window.history.replaceState({}, '', url.toString())
  }
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

interface ProfileProviderProps {
  children: ReactNode
  /**
   * Which profile to select by default when no stored/URL selection exists.
   * If omitted, selects the first non-guest profile loaded from the API,
   * or falls back to 'guest'.
   */
  defaultProfileId?: string
}

export function ProfileProvider({ children, defaultProfileId }: ProfileProviderProps) {
  const [allProfiles, setAllProfiles] = useState<DemoProfile[]>(defaultProfiles)
  const [profileId, setProfileId] = useState<string>(
    () => getStoredProfileId() || defaultProfileId || 'guest'
  )
  const [isLoading, setIsLoading] = useState(true)

  const profile = allProfiles.find((p) => p.id === profileId) || GUEST_PROFILE

  // Fetch profiles from the backend on mount
  const refreshProfiles = useCallback(async () => {
    try {
      setIsLoading(true)
      const res = await fetch('/api/profiles/')
      if (res.ok) {
        const data: DemoProfile[] = await res.json()
        if (data.length > 0) {
          setAllProfiles(data)

          // Auto-select the first non-guest profile if nothing was persisted
          const stored = getStoredProfileId()
          if (!stored && !defaultProfileId) {
            const firstReal = data.find((p) => p.id !== 'guest')
            if (firstReal) {
              setProfileId(firstReal.id)
              persistProfileId(firstReal.id)
            }
          }
        }
      }
    } catch {
      // API not available — keep embedded defaults
    } finally {
      setIsLoading(false)
    }
  }, [defaultProfileId])

  useEffect(() => {
    refreshProfiles()
  }, [refreshProfiles])

  const setProfile = useCallback(
    (id: string) => {
      const found = allProfiles.find((p) => p.id === id)
      if (found) {
        setProfileId(id)
        persistProfileId(id)
      }
    },
    [allProfiles]
  )

  const contextValue: ProfileContextType = {
    profile,
    profileId,
    setProfile,
    profiles: allProfiles,
    isGuest: profile.id === 'guest',
    isLoading,
    refreshProfiles,
  }

  return (
    <ProfileContext.Provider value={contextValue}>
      {children}
    </ProfileContext.Provider>
  )
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useProfile(): ProfileContextType {
  const ctx = useContext(ProfileContext)
  if (!ctx) {
    throw new Error('useProfile must be used within a ProfileProvider')
  }
  return ctx
}
