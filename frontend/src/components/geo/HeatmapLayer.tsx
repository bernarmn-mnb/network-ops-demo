/**
 * HeatmapLayer - Aggregation visualization wrapper.
 *
 * For Mapbox: renders via the heatmap layer type (handled inline in MapboxMap).
 * For Leaflet: renders circle markers with size/opacity based on doc_count (handled inline in LeafletMap).
 *
 * This component acts as a data-preparation layer that transforms raw aggregation
 * buckets into the format expected by each map renderer. It does not render directly
 * but passes prepared data to the active map.
 */

import type { AggregationBucket } from '../../hooks/useGeoSearch'

export interface HeatmapBucket {
  key: string
  doc_count: number
  location: { lat: number; lng: number }
}

/**
 * Transform raw aggregation buckets into heatmap-ready format.
 * Filters out buckets without valid locations.
 */
export function prepareHeatmapBuckets(buckets: AggregationBucket[]): HeatmapBucket[] {
  return buckets
    .filter((b) => b.location && typeof b.location.lat === 'number' && typeof b.location.lng === 'number')
    .map((b) => ({
      key: b.key,
      doc_count: b.doc_count,
      location: { lat: b.location.lat, lng: b.location.lng },
    }))
}

/**
 * Calculate appropriate geohash precision based on zoom level.
 * Higher zoom = higher precision = smaller cells.
 */
export function zoomToPrecision(zoom: number): number {
  if (zoom <= 3) return 2
  if (zoom <= 5) return 3
  if (zoom <= 8) return 4
  if (zoom <= 11) return 5
  if (zoom <= 14) return 6
  return 7
}
