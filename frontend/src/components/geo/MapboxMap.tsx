/**
 * MapboxMap - Mapbox GL JS map renderer using react-map-gl.
 *
 * Requires VITE_MAPBOX_TOKEN env var.
 * Supports markers, heatmap layers, vector tile layers, and delivery zone polygons.
 */

import { useCallback, useState, useRef, useEffect } from 'react'
import Map, { Marker, Popup, Source, Layer, NavigationControl } from 'react-map-gl/mapbox'
import type { MapMouseEvent, ViewStateChangeEvent, MapRef } from 'react-map-gl/mapbox'
import 'mapbox-gl/dist/mapbox-gl.css'
import { EuiText } from '@elastic/eui'
import { useMap } from './MapProvider'
import { StoreMarker } from './StoreMarker'
import type { StoreMarkerData } from './StoreMarker'
import type { Bounds } from './MapProvider'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface MapboxMapProps {
  markers?: StoreMarkerData[]
  onBoundsChange?: (bounds: Bounds) => void
  onMapClick?: (lat: number, lng: number) => void
  onMarkerClick?: (store: StoreMarkerData) => void
  heatmapBuckets?: Array<{ key: string; doc_count: number; location: { lat: number; lng: number } }>
  deliveryZones?: Array<{ id: string; name: string; coordinates: number[][][] }>
  /** Enable vector tile layer from /api/geo/vector-tiles */
  showVectorTiles?: boolean
  height?: string
}

// ---------------------------------------------------------------------------
// Token
// ---------------------------------------------------------------------------

const MAPBOX_TOKEN = (import.meta as unknown as { env: Record<string, string> }).env
  .VITE_MAPBOX_TOKEN || ''

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function MapboxMap({
  markers = [],
  onBoundsChange,
  onMapClick,
  onMarkerClick,
  heatmapBuckets = [],
  deliveryZones = [],
  showVectorTiles = false,
  height = '100%',
}: MapboxMapProps) {
  const { viewport, setViewport, fitBoundsTarget, fitBoundsSeq } = useMap()
  const [popupStore, setPopupStore] = useState<StoreMarkerData | null>(null)
  const mapRef = useRef<MapRef>(null)
  const lastFitSeq = useRef(0)

  // Respond to fit-bounds requests
  useEffect(() => {
    if (fitBoundsSeq > lastFitSeq.current && fitBoundsTarget && mapRef.current) {
      lastFitSeq.current = fitBoundsSeq
      mapRef.current.fitBounds(
        [
          [fitBoundsTarget.topLeft.lng, fitBoundsTarget.bottomRight.lat],  // SW
          [fitBoundsTarget.bottomRight.lng, fitBoundsTarget.topLeft.lat],  // NE
        ],
        { padding: 40, duration: 1000 },
      )
    }
  }, [fitBoundsSeq, fitBoundsTarget])

  const handleMoveEnd = useCallback(
    (e: ViewStateChangeEvent) => {
      const map = e.target
      const b = map.getBounds()
      if (!b) return
      const center = map.getCenter()
      const zoom = map.getZoom()
      const bounds: Bounds = {
        topLeft: { lat: b.getNorth(), lng: b.getWest() },
        bottomRight: { lat: b.getSouth(), lng: b.getEast() },
      }
      setViewport({ center: { lat: center.lat, lng: center.lng }, zoom, bounds })
      onBoundsChange?.(bounds)
    },
    [onBoundsChange, setViewport],
  )

  const handleClick = useCallback(
    (e: MapMouseEvent) => {
      const { lng, lat } = e.lngLat
      onMapClick?.(lat, lng)
    },
    [onMapClick],
  )

  // No token — early return AFTER all hooks
  if (!MAPBOX_TOKEN) {
    return (
      <div style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f5f5' }}>
        <EuiText color="subdued" textAlign="center">
          <p>
            <strong>Mapbox token not configured.</strong><br />
            Set <code>VITE_MAPBOX_TOKEN</code> in your environment or switch to Leaflet.
          </p>
        </EuiText>
      </div>
    )
  }

  // Build heatmap GeoJSON
  const heatmapGeoJSON: GeoJSON.FeatureCollection = {
    type: 'FeatureCollection',
    features: heatmapBuckets.map((b) => ({
      type: 'Feature' as const,
      properties: { weight: b.doc_count },
      geometry: {
        type: 'Point' as const,
        coordinates: [b.location.lng, b.location.lat],
      },
    })),
  }

  // Build delivery zone GeoJSON
  const zoneGeoJSON: GeoJSON.FeatureCollection = {
    type: 'FeatureCollection',
    features: deliveryZones.map((z) => ({
      type: 'Feature' as const,
      properties: { name: z.name },
      geometry: {
        type: 'Polygon' as const,
        coordinates: z.coordinates,
      },
    })),
  }

  return (
    <Map
      ref={mapRef}
      initialViewState={{
        latitude: viewport.center.lat,
        longitude: viewport.center.lng,
        zoom: viewport.zoom,
      }}
      style={{ width: '100%', height }}
      mapStyle="mapbox://styles/mapbox/light-v11"
      mapboxAccessToken={MAPBOX_TOKEN}
      onMoveEnd={handleMoveEnd}
      onClick={handleClick}
    >
      <NavigationControl position="top-right" />

      {/* Heatmap layer */}
      {heatmapBuckets.length > 0 && (
        <Source id="heatmap-source" type="geojson" data={heatmapGeoJSON}>
          <Layer
            id="heatmap-layer"
            type="heatmap"
            paint={{
              'heatmap-weight': ['get', 'weight'],
              'heatmap-intensity': 1,
              'heatmap-radius': 30,
              'heatmap-opacity': 0.7,
            }}
          />
        </Source>
      )}

      {/* Delivery zone fill */}
      {deliveryZones.length > 0 && (
        <Source id="delivery-zones-source" type="geojson" data={zoneGeoJSON}>
          <Layer
            id="delivery-zone-fill"
            type="fill"
            paint={{
              'fill-color': '#0077CC',
              'fill-opacity': 0.15,
            }}
          />
          <Layer
            id="delivery-zone-outline"
            type="line"
            paint={{
              'line-color': '#0077CC',
              'line-width': 2,
            }}
          />
        </Source>
      )}

      {/* Vector tile layer */}
      {showVectorTiles && (
        <Source
          id="vector-tile-source"
          type="vector"
          tiles={[`${window.location.origin}/api/geo/vector-tiles/{z}/{x}/{y}`]}
          minzoom={0}
          maxzoom={14}
        >
          <Layer
            id="vector-tile-points"
            type="circle"
            source-layer="stores"
            paint={{
              'circle-radius': 6,
              'circle-color': '#FF6633',
              'circle-opacity': 0.8,
            }}
          />
        </Source>
      )}

      {/* Store markers */}
      {markers.map((store) => {
        const lat = (store.source?.lat as number) ?? 0
        const lng = (store.source?.lng as number) ?? (store.source?.lon as number) ?? 0
        return (
          <Marker
            key={store.id}
            latitude={lat}
            longitude={lng}
            anchor="bottom"
            onClick={(e) => {
              e.originalEvent.stopPropagation()
              setPopupStore(store)
              onMarkerClick?.(store)
            }}
          />
        )
      })}

      {/* Popup */}
      {popupStore && (
        <Popup
          latitude={(popupStore.source?.lat as number) ?? 0}
          longitude={
            (popupStore.source?.lng as number) ?? (popupStore.source?.lon as number) ?? 0
          }
          onClose={() => setPopupStore(null)}
          closeOnClick={false}
          anchor="top"
        >
          <StoreMarker store={popupStore} onClick={onMarkerClick} />
        </Popup>
      )}
    </Map>
  )
}

export default MapboxMap
