/**
 * useGeoSearch Hook
 *
 * Provides geo-spatial search operations against the backend /api/geo/* endpoints:
 * - searchNearby: find results near a point within a radius
 * - searchBoundingBox: find results within the current viewport
 * - fetchAggregations: get geohash grid buckets for heatmaps
 * - checkDeliveryZone: check which stores deliver to a point
 *
 * Follows the same patterns as useSearchSimple.ts (state management, fetch, error handling).
 */

import { useState, useCallback } from 'react'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface GeoPoint {
  lat: number
  lng: number
}

export interface GeoSearchHit {
  id: string
  score: number
  source: Record<string, unknown>
  distance?: number | string
  highlight?: Record<string, string[]>
}

export interface GeoBounds {
  topLeft: GeoPoint
  bottomRight: GeoPoint
}

export interface AggregationBucket {
  key: string
  doc_count: number
  location: GeoPoint
}

export interface DeliveryZoneResult {
  store_id: string
  store_name: string
  delivers: boolean
  zone_name?: string
  source: Record<string, unknown>
}

export interface NearbySearchParams {
  lat: number
  lng: number
  radius: string
  query?: string
  filters?: Record<string, unknown>
  size?: number
}

export interface BoundingBoxParams {
  topLeft: GeoPoint
  bottomRight: GeoPoint
  query?: string
  filters?: Record<string, unknown>
  size?: number
}

export interface AggregationParams {
  precision: number
  bounds?: GeoBounds
}

export interface UseGeoSearchOptions {
  /** API base URL prefix (default: '' for relative paths via Vite proxy) */
  apiUrl?: string
}

export interface UseGeoSearchResult {
  // Nearby search
  nearbyResults: GeoSearchHit[]
  nearbyTotal: number
  nearbyLoading: boolean
  nearbyError: string | null
  searchNearby: (params: NearbySearchParams) => Promise<void>

  // Bounding box search
  boundingBoxResults: GeoSearchHit[]
  boundingBoxTotal: number
  boundingBoxLoading: boolean
  boundingBoxError: string | null
  searchBoundingBox: (params: BoundingBoxParams) => Promise<void>

  // Aggregations (heatmap)
  aggregationBuckets: AggregationBucket[]
  aggregationLoading: boolean
  aggregationError: string | null
  fetchAggregations: (params: AggregationParams) => Promise<void>

  // Delivery zone
  deliveryResults: DeliveryZoneResult[]
  deliveryLoading: boolean
  deliveryError: string | null
  checkDeliveryZone: (lat: number, lng: number) => Promise<void>
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useGeoSearch(options: UseGeoSearchOptions = {}): UseGeoSearchResult {
  const { apiUrl = '' } = options

  const API_BASE = `${apiUrl}/api/geo`

  // --- Nearby search state ---
  const [nearbyResults, setNearbyResults] = useState<GeoSearchHit[]>([])
  const [nearbyTotal, setNearbyTotal] = useState(0)
  const [nearbyLoading, setNearbyLoading] = useState(false)
  const [nearbyError, setNearbyError] = useState<string | null>(null)

  // --- Bounding box search state ---
  const [boundingBoxResults, setBoundingBoxResults] = useState<GeoSearchHit[]>([])
  const [boundingBoxTotal, setBoundingBoxTotal] = useState(0)
  const [boundingBoxLoading, setBoundingBoxLoading] = useState(false)
  const [boundingBoxError, setBoundingBoxError] = useState<string | null>(null)

  // --- Aggregations state ---
  const [aggregationBuckets, setAggregationBuckets] = useState<AggregationBucket[]>([])
  const [aggregationLoading, setAggregationLoading] = useState(false)
  const [aggregationError, setAggregationError] = useState<string | null>(null)

  // --- Delivery zone state ---
  const [deliveryResults, setDeliveryResults] = useState<DeliveryZoneResult[]>([])
  const [deliveryLoading, setDeliveryLoading] = useState(false)
  const [deliveryError, setDeliveryError] = useState<string | null>(null)

  // -------------------------------------------------------------------------
  // searchNearby
  // -------------------------------------------------------------------------
  const searchNearby = useCallback(async (params: NearbySearchParams) => {
    setNearbyLoading(true)
    setNearbyError(null)

    try {
      const response = await fetch(`${API_BASE}/nearby`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          location: { lat: params.lat, lon: params.lng },
          distance: params.radius,
          query: params.query || undefined,
          filters: params.filters || undefined,
          page_size: params.size || undefined,
        }),
      })

      if (!response.ok) {
        throw new Error(`Nearby search failed: ${response.status}`)
      }

      const data = await response.json()
      // Extract distance from sort array (first element is distance in km)
      const hits = (data.hits || []).map((hit: Record<string, unknown>) => ({
        ...hit,
        distance: Array.isArray(hit.sort) && hit.sort.length > 0
          ? Number((hit.sort[0] as number * 0.621371).toFixed(1)) // km to miles
          : undefined,
      }))
      setNearbyResults(hits)
      setNearbyTotal(data.total || 0)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Nearby search failed'
      setNearbyError(message)
      setNearbyResults([])
      setNearbyTotal(0)
    } finally {
      setNearbyLoading(false)
    }
  }, [API_BASE])

  // -------------------------------------------------------------------------
  // searchBoundingBox
  // -------------------------------------------------------------------------
  const searchBoundingBox = useCallback(async (params: BoundingBoxParams) => {
    setBoundingBoxLoading(true)
    setBoundingBoxError(null)

    try {
      const response = await fetch(`${API_BASE}/bounding-box`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bounds: {
            top_left: { lat: params.topLeft.lat, lon: params.topLeft.lng },
            bottom_right: { lat: params.bottomRight.lat, lon: params.bottomRight.lng },
          },
          query: params.query || undefined,
          filters: params.filters || undefined,
          page_size: params.size || undefined,
        }),
      })

      if (!response.ok) {
        throw new Error(`Bounding box search failed: ${response.status}`)
      }

      const data = await response.json()
      setBoundingBoxResults(data.hits || [])
      setBoundingBoxTotal(data.total || 0)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Bounding box search failed'
      setBoundingBoxError(message)
      setBoundingBoxResults([])
      setBoundingBoxTotal(0)
    } finally {
      setBoundingBoxLoading(false)
    }
  }, [API_BASE])

  // -------------------------------------------------------------------------
  // fetchAggregations
  // -------------------------------------------------------------------------
  const fetchAggregations = useCallback(async (params: AggregationParams) => {
    setAggregationLoading(true)
    setAggregationError(null)

    try {
      const response = await fetch(`${API_BASE}/aggregations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          precision: params.precision,
          bounds: params.bounds
            ? {
                top_left: { lat: params.bounds.topLeft.lat, lon: params.bounds.topLeft.lng },
                bottom_right: { lat: params.bounds.bottomRight.lat, lon: params.bounds.bottomRight.lng },
              }
            : undefined,
        }),
      })

      if (!response.ok) {
        throw new Error(`Aggregations fetch failed: ${response.status}`)
      }

      const data = await response.json()
      // Map backend {lat, lon} to frontend {lat, lng}
      const buckets = (data.buckets || []).map((b: Record<string, unknown>) => {
        const loc = b.location as { lat: number; lon: number } | null
        return {
          key: b.key as string,
          doc_count: b.doc_count as number,
          location: loc ? { lat: loc.lat, lng: loc.lon } : { lat: 0, lng: 0 },
        }
      })
      setAggregationBuckets(buckets)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Aggregations fetch failed'
      setAggregationError(message)
      setAggregationBuckets([])
    } finally {
      setAggregationLoading(false)
    }
  }, [API_BASE])

  // -------------------------------------------------------------------------
  // checkDeliveryZone
  // -------------------------------------------------------------------------
  const checkDeliveryZone = useCallback(async (lat: number, lng: number) => {
    setDeliveryLoading(true)
    setDeliveryError(null)

    try {
      const response = await fetch(`${API_BASE}/delivery-zone-check`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ point: { lat, lon: lng } }),
      })

      if (!response.ok) {
        throw new Error(`Delivery zone check failed: ${response.status}`)
      }

      const data = await response.json()
      // Backend returns GeoSearchResponse with hits array, map to DeliveryZoneResult
      const results = (data.hits || []).map((hit: Record<string, unknown>) => {
        const src = (hit.source || {}) as Record<string, unknown>
        return {
          store_id: hit.id as string,
          store_name: src.name as string,
          delivers: true,
          source: src,
        }
      })
      setDeliveryResults(results)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Delivery zone check failed'
      setDeliveryError(message)
      setDeliveryResults([])
    } finally {
      setDeliveryLoading(false)
    }
  }, [API_BASE])

  return {
    nearbyResults,
    nearbyTotal,
    nearbyLoading,
    nearbyError,
    searchNearby,

    boundingBoxResults,
    boundingBoxTotal,
    boundingBoxLoading,
    boundingBoxError,
    searchBoundingBox,

    aggregationBuckets,
    aggregationLoading,
    aggregationError,
    fetchAggregations,

    deliveryResults,
    deliveryLoading,
    deliveryError,
    checkDeliveryZone,
  }
}

export default useGeoSearch
