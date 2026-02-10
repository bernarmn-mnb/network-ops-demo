/**
 * LeafletMap - Leaflet-based map renderer using react-leaflet v4.
 *
 * Uses OpenStreetMap tiles (free, no API key required).
 * Renders store markers, circle overlays for heatmap, and GeoJSON delivery zones.
 */

import { useEffect, useRef, useCallback, useState } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, useMap as useLeafletMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { useMap } from './MapProvider'
import { StoreMarker } from './StoreMarker'
import type { StoreMarkerData } from './StoreMarker'
import type { Bounds } from './MapProvider'

// Fix Leaflet default marker icon path issue with bundlers
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
})

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface LeafletMapProps {
  /** Store markers to display */
  markers?: StoreMarkerData[]
  /** Called when map finishes moving (reports new bounding box) */
  onBoundsChange?: (bounds: Bounds) => void
  /** Called when the map is clicked */
  onMapClick?: (lat: number, lng: number) => void
  /** Called when a marker is clicked */
  onMarkerClick?: (store: StoreMarkerData) => void
  /** Heatmap buckets to render as circles */
  heatmapBuckets?: Array<{ key: string; doc_count: number; location: { lat: number; lng: number } }>
  /** Delivery zone polygons (GeoJSON coordinates) */
  deliveryZones?: Array<{ id: string; name: string; coordinates: number[][][] }>
  /** Map container height */
  height?: string
}

// ---------------------------------------------------------------------------
// Inner component that has access to react-leaflet map instance
// ---------------------------------------------------------------------------

function MapEventHandler({
  onBoundsChange,
  onMapClick,
}: {
  onBoundsChange?: (bounds: Bounds) => void
  onMapClick?: (lat: number, lng: number) => void
}) {
  const { setViewport, fitBoundsTarget, fitBoundsSeq } = useMap()
  const map = useLeafletMap()
  const [initialReported, setInitialReported] = useState(false)
  const lastFitSeq = useRef(0)

  const reportBounds = useCallback(
    (m: L.Map) => {
      const b = m.getBounds()
      const center = m.getCenter()
      const zoom = m.getZoom()
      const bounds: Bounds = {
        topLeft: { lat: b.getNorth(), lng: b.getWest() },
        bottomRight: { lat: b.getSouth(), lng: b.getEast() },
      }
      setViewport({ center: { lat: center.lat, lng: center.lng }, zoom, bounds })
      onBoundsChange?.(bounds)
    },
    [onBoundsChange, setViewport],
  )

  // Report initial bounds on mount
  useEffect(() => {
    if (!initialReported && map) {
      reportBounds(map)
      setInitialReported(true)
    }
  }, [map, initialReported, reportBounds])

  // Respond to fit-bounds requests
  useEffect(() => {
    if (fitBoundsSeq > lastFitSeq.current && fitBoundsTarget && map) {
      lastFitSeq.current = fitBoundsSeq
      map.fitBounds(
        [
          [fitBoundsTarget.topLeft.lat, fitBoundsTarget.topLeft.lng],
          [fitBoundsTarget.bottomRight.lat, fitBoundsTarget.bottomRight.lng],
        ],
        { padding: [40, 40], maxZoom: 14 },
      )
    }
  }, [fitBoundsSeq, fitBoundsTarget, map])

  useMapEvents({
    moveend: (e) => reportBounds(e.target),
    click: (e) => onMapClick?.(e.latlng.lat, e.latlng.lng),
  })

  return null
}

function HeatmapCircles({
  buckets,
}: {
  buckets: Array<{ key: string; doc_count: number; location: { lat: number; lng: number } }>
}) {
  const map = useLeafletMap()
  const layerRef = useRef<L.LayerGroup>(L.layerGroup())

  useEffect(() => {
    const group = layerRef.current
    group.clearLayers()

    if (buckets.length === 0) {
      group.removeFrom(map)
      return
    }

    const maxCount = Math.max(...buckets.map((b) => b.doc_count), 1)

    buckets.forEach((bucket) => {
      const ratio = bucket.doc_count / maxCount
      const radius = 8000 + ratio * 40000 // meters
      const circle = L.circle([bucket.location.lat, bucket.location.lng], {
        radius,
        color: '#FF6633',
        fillColor: '#FF6633',
        fillOpacity: 0.15 + ratio * 0.45,
        weight: 1,
      })
      circle.bindTooltip(`${bucket.doc_count} stores`)
      group.addLayer(circle)
    })

    group.addTo(map)

    return () => {
      group.removeFrom(map)
    }
  }, [buckets, map])

  return null
}

function DeliveryZonePolygons({
  zones,
}: {
  zones: Array<{ id: string; name: string; coordinates: number[][][] }>
}) {
  const map = useLeafletMap()
  const layerRef = useRef<L.LayerGroup>(L.layerGroup())

  useEffect(() => {
    const group = layerRef.current
    group.clearLayers()

    if (zones.length === 0) {
      group.removeFrom(map)
      return
    }

    zones.forEach((zone) => {
      // GeoJSON coordinates are [lng, lat] - Leaflet expects [lat, lng]
      const latLngs = zone.coordinates[0].map(
        (coord) => [coord[1], coord[0]] as [number, number],
      )
      const polygon = L.polygon(latLngs, {
        color: '#0077CC',
        fillColor: '#0077CC',
        fillOpacity: 0.15,
        weight: 2,
      })
      polygon.bindTooltip(zone.name)
      group.addLayer(polygon)
    })

    group.addTo(map)

    return () => {
      group.removeFrom(map)
    }
  }, [zones, map])

  return null
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export function LeafletMap({
  markers = [],
  onBoundsChange,
  onMapClick,
  onMarkerClick,
  heatmapBuckets = [],
  deliveryZones = [],
  height = '100%',
}: LeafletMapProps) {
  const { viewport } = useMap()

  return (
    <MapContainer
      center={[viewport.center.lat, viewport.center.lng]}
      zoom={viewport.zoom}
      style={{ height, width: '100%' }}
      scrollWheelZoom
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      <MapEventHandler onBoundsChange={onBoundsChange} onMapClick={onMapClick} />

      {heatmapBuckets.length > 0 && <HeatmapCircles buckets={heatmapBuckets} />}
      {deliveryZones.length > 0 && <DeliveryZonePolygons zones={deliveryZones} />}

      {markers.map((store) => (
        <Marker
          key={store.id}
          position={[
            (store.source?.lat as number) ?? 0,
            (store.source?.lng as number) ?? (store.source?.lon as number) ?? 0,
          ]}
        >
          <Popup>
            <StoreMarker store={store} onClick={onMarkerClick} />
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  )
}

export default LeafletMap
