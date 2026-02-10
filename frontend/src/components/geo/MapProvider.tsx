/**
 * MapProvider - Context provider for geo/map state
 *
 * Provides:
 * - Map library selection (mapbox vs leaflet)
 * - Viewport state (center, zoom, bounds)
 * - User geolocation
 *
 * Wrap your geo pages with <MapProvider> and consume via useMap().
 */

import React, { createContext, useContext, useState, useCallback } from 'react'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type MapLibrary = 'mapbox' | 'leaflet'

export interface LatLng {
  lat: number
  lng: number
}

export interface Bounds {
  topLeft: LatLng
  bottomRight: LatLng
}

export interface Viewport {
  center: LatLng
  zoom: number
  bounds?: Bounds
}

interface MapContextValue {
  /** Which map renderer to use */
  mapLibrary: MapLibrary
  setMapLibrary: (lib: MapLibrary) => void

  /** Current viewport (center, zoom, visible bounds) */
  viewport: Viewport
  setViewport: (viewport: Viewport) => void

  /** User's browser-reported location (null until requested) */
  userLocation: LatLng | null
  setUserLocation: (loc: LatLng | null) => void

  /** Request geolocation from the browser */
  requestUserLocation: () => void
  locationLoading: boolean
  locationError: string | null

  /** Fit-to-bounds trigger: map components watch fitBoundsSeq for changes */
  fitBoundsTarget: Bounds | null
  fitBoundsSeq: number
  requestFitBounds: (bounds: Bounds) => void
}

// ---------------------------------------------------------------------------
// Defaults
// ---------------------------------------------------------------------------

const DEFAULT_CENTER: LatLng = { lat: 39.8283, lng: -98.5795 } // US center
const DEFAULT_ZOOM = 4

const DEFAULT_VIEWPORT: Viewport = {
  center: DEFAULT_CENTER,
  zoom: DEFAULT_ZOOM,
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

const MapContext = createContext<MapContextValue | null>(null)

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

interface MapProviderProps {
  children: React.ReactNode
  /** Override the default map library */
  defaultLibrary?: MapLibrary
  /** Override the default viewport */
  defaultViewport?: Viewport
}

export function MapProvider({
  children,
  defaultLibrary = 'leaflet',
  defaultViewport = DEFAULT_VIEWPORT,
}: MapProviderProps) {
  const [mapLibrary, setMapLibrary] = useState<MapLibrary>(defaultLibrary)
  const [viewport, setViewport] = useState<Viewport>(defaultViewport)
  const [userLocation, setUserLocation] = useState<LatLng | null>(null)
  const [locationLoading, setLocationLoading] = useState(false)
  const [locationError, setLocationError] = useState<string | null>(null)
  const [fitBoundsTarget, setFitBoundsTarget] = useState<Bounds | null>(null)
  const [fitBoundsSeq, setFitBoundsSeq] = useState(0)

  const requestUserLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by this browser')
      return
    }

    setLocationLoading(true)
    setLocationError(null)

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const loc: LatLng = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        }
        setUserLocation(loc)
        setLocationLoading(false)
      },
      (err) => {
        setLocationError(err.message)
        setLocationLoading(false)
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 },
    )
  }, [])

  const requestFitBounds = useCallback((bounds: Bounds) => {
    setFitBoundsTarget(bounds)
    setFitBoundsSeq((s) => s + 1)
  }, [])

  return (
    <MapContext.Provider
      value={{
        mapLibrary,
        setMapLibrary,
        viewport,
        setViewport,
        userLocation,
        setUserLocation,
        requestUserLocation,
        locationLoading,
        locationError,
        fitBoundsTarget,
        fitBoundsSeq,
        requestFitBounds,
      }}
    >
      {children}
    </MapContext.Provider>
  )
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useMap(): MapContextValue {
  const ctx = useContext(MapContext)
  if (!ctx) {
    throw new Error('useMap must be used within a <MapProvider>')
  }
  return ctx
}
