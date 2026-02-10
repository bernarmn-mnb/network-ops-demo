/**
 * Geo Search Page
 *
 * Demonstrates Elasticsearch geo capabilities with dual map implementations:
 * - Mapbox GL JS (vector tiles via ES _mvt API)
 * - Leaflet (standard JSON API)
 *
 * Search modes:
 * - Nearby: geo_distance filter + distance sort
 * - Viewport: geo_bounding_box on map drag
 * - Heatmap: geotile_grid aggregations
 * - Vector Tiles: ES _mvt endpoint (Mapbox only)
 * - Delivery Zones: geo_shape containment queries
 */

import { useCallback, useState, useEffect, useMemo } from 'react'
import {
  EuiPageTemplate,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiText,
  EuiLoadingSpinner,
  EuiEmptyPrompt,
  EuiPanel,
  EuiBadge,
  EuiCallOut,
} from '@elastic/eui'
import { AppHeader } from '../components/layout/AppHeader'
import { MapProvider, useMap } from '../components/geo/MapProvider'
import type { Bounds } from '../components/geo/MapProvider'
import { MapControls } from '../components/geo/MapControls'
import type { SearchMode } from '../components/geo/MapControls'
import { MapboxMap } from '../components/geo/MapboxMap'
import { LeafletMap } from '../components/geo/LeafletMap'
import { StoreDetailPanel } from '../components/geo/StoreDetailPanel'
import type { StoreDetail } from '../components/geo/StoreDetailPanel'
import { FormatComparisonPanel } from '../components/geo/FormatComparisonPanel'
import { useGeoSearch } from '../hooks/useGeoSearch'
import type { StoreMarkerData } from '../components/geo/StoreMarker'

// ---------------------------------------------------------------------------
// Inner page (must be inside MapProvider)
// ---------------------------------------------------------------------------

/** Calculate bounding box from markers */
function getMarkersBounds(markers: StoreMarkerData[]): Bounds | null {
  if (markers.length === 0) return null
  let minLat = 90, maxLat = -90, minLng = 180, maxLng = -180
  let valid = 0
  markers.forEach((m) => {
    const lat = m.source?.lat as number | undefined
    const lng = (m.source?.lng ?? m.source?.lon) as number | undefined
    if (lat != null && lng != null) {
      minLat = Math.min(minLat, lat)
      maxLat = Math.max(maxLat, lat)
      minLng = Math.min(minLng, lng)
      maxLng = Math.max(maxLng, lng)
      valid++
    }
  })
  if (valid === 0) return null
  // Pad single-point results so the map doesn't zoom to max
  if (maxLat - minLat < 0.01) { minLat -= 0.05; maxLat += 0.05 }
  if (maxLng - minLng < 0.01) { minLng -= 0.05; maxLng += 0.05 }
  return {
    topLeft: { lat: maxLat, lng: minLng },
    bottomRight: { lat: minLat, lng: maxLng },
  }
}

function GeoSearchContent() {
  const { mapLibrary, userLocation, viewport, requestFitBounds } = useMap()
  const geo = useGeoSearch()

  const [searchMode, setSearchMode] = useState<SearchMode>('viewport')
  const [radius, setRadius] = useState('25mi')
  const [selectedStore, setSelectedStore] = useState<StoreDetail | null>(null)
  const [selectedStoreTypes, setSelectedStoreTypes] = useState<string[]>([])
  const [selectedFeatures, setSelectedFeatures] = useState<string[]>([])
  const [lastQuery, setLastQuery] = useState<Record<string, unknown> | null>(null)
  const [lastResponse, setLastResponse] = useState<Record<string, unknown> | string | null>(null)
  const [autoZoom, setAutoZoom] = useState(false)

  const STORE_TYPES = ['Flagship', 'Mall', 'Outlet', 'Express', 'Warehouse']
  const FEATURES = [
    'curbside_pickup', 'in_store_pickup', 'same_day_delivery',
    'repair_services', 'device_trade_in', 'personal_shopping',
  ]

  // Build filters from selected store types and features
  const buildFilters = useCallback(() => {
    const filters: Record<string, unknown> = {}
    if (selectedStoreTypes.length > 0) filters.type = selectedStoreTypes
    if (selectedFeatures.length > 0) filters.features = selectedFeatures
    return Object.keys(filters).length > 0 ? filters : undefined
  }, [selectedStoreTypes, selectedFeatures])

  // Perform search based on current mode
  const handleSearch = useCallback(() => {
    const filters = buildFilters()

    switch (searchMode) {
      case 'nearby': {
        const loc = userLocation ?? viewport.center
        const queryBody = {
          geo_distance: { distance: radius, location: { lat: loc.lat, lon: loc.lng } },
          sort: [{ _geo_distance: { location: { lat: loc.lat, lon: loc.lng }, order: 'asc' } }],
        }
        setLastQuery(queryBody)
        geo.searchNearby({ lat: loc.lat, lng: loc.lng, radius, filters })
        break
      }
      case 'viewport': {
        // Use current bounds or fall back to full US bounding box
        const bounds = viewport.bounds ?? {
          topLeft: { lat: 50, lng: -130 },
          bottomRight: { lat: 24, lng: -65 },
        }
        const queryBody = {
          geo_bounding_box: {
            location: {
              top_left: { lat: bounds.topLeft.lat, lon: bounds.topLeft.lng },
              bottom_right: { lat: bounds.bottomRight.lat, lon: bounds.bottomRight.lng },
            },
          },
        }
        setLastQuery(queryBody)
        geo.searchBoundingBox({
          topLeft: bounds.topLeft,
          bottomRight: bounds.bottomRight,
          filters,
        })
        break
      }
      case 'heatmap': {
        const precision = viewport.zoom < 5 ? 3 : viewport.zoom < 8 ? 4 : 5
        const queryBody = { aggs: { geotile_grid: { field: 'location', precision } } }
        setLastQuery(queryBody)
        geo.fetchAggregations({
          precision,
          bounds: viewport.bounds
            ? { topLeft: viewport.bounds.topLeft, bottomRight: viewport.bounds.bottomRight }
            : undefined,
        })
        break
      }
      case 'vector-tiles': {
        setLastQuery({ _mvt: `/{index}/_mvt/location/{z}/{x}/{y}` })
        setLastResponse(
          'Binary protobuf response (application/x-protobuf).\n' +
          'Mapbox GL JS consumes this directly as a vector tile source.\n' +
          'No JSON parsing needed — tiles are rendered natively.',
        )
        break
      }
      case 'delivery-zones': {
        const loc = userLocation ?? viewport.center
        const queryBody = {
          geo_shape: {
            delivery_zone: {
              shape: { type: 'point', coordinates: [loc.lng, loc.lat] },
              relation: 'contains',
            },
          },
        }
        setLastQuery(queryBody)
        geo.checkDeliveryZone(loc.lat, loc.lng)
        break
      }
    }
  }, [searchMode, radius, userLocation, viewport, buildFilters, geo])

  // Auto-search on bounds change in viewport mode
  const handleBoundsChange = useCallback(
    (bounds: Bounds) => {
      if (searchMode === 'viewport') {
        geo.searchBoundingBox({ topLeft: bounds.topLeft, bottomRight: bounds.bottomRight })
      } else if (searchMode === 'heatmap') {
        const precision = viewport.zoom < 5 ? 3 : viewport.zoom < 8 ? 4 : 5
        geo.fetchAggregations({ precision, bounds: { topLeft: bounds.topLeft, bottomRight: bounds.bottomRight } })
      }
    },
    [searchMode, viewport.zoom, geo],
  )

  // Handle map click
  const handleMapClick = useCallback(
    (lat: number, lng: number) => {
      if (searchMode === 'nearby') {
        geo.searchNearby({ lat, lng, radius, filters: buildFilters() })
      } else if (searchMode === 'delivery-zones') {
        geo.checkDeliveryZone(lat, lng)
      }
    },
    [searchMode, radius, buildFilters, geo],
  )

  // Handle marker click -> open detail panel
  const handleMarkerClick = useCallback((marker: StoreMarkerData) => {
    const src = marker.source ?? {}
    setSelectedStore({
      id: marker.id,
      name: marker.name,
      type: marker.type,
      address: src.address as string | undefined,
      phone: src.phone as string | undefined,
      rating: marker.rating,
      distance: marker.distance,
      services: src.services as string[] | undefined,
      features: src.features as string[] | undefined,
      source: src,
    })
  }, [])

  // No manual initial search needed — the Leaflet/Mapbox map reports
  // initial bounds on mount which triggers handleBoundsChange automatically.

  // Update last response when results change
  useEffect(() => {
    if (searchMode === 'vector-tiles') return
    const results = searchMode === 'nearby'
      ? geo.nearbyResults
      : searchMode === 'heatmap'
        ? geo.aggregationBuckets
        : searchMode === 'delivery-zones'
          ? geo.deliveryResults
          : geo.boundingBoxResults
    if (results.length > 0) {
      setLastResponse({ hits: results.length, sample: results[0] })
    }
  }, [searchMode, geo.nearbyResults, geo.boundingBoxResults, geo.aggregationBuckets, geo.deliveryResults])

  // Convert search results to marker data
  const markers: StoreMarkerData[] = useMemo(() => {
    const results = searchMode === 'nearby'
      ? geo.nearbyResults
      : searchMode === 'delivery-zones'
        ? geo.deliveryResults.map((d) => ({
            id: d.store_id,
            score: 0,
            source: d.source,
            distance: undefined,
          }))
        : geo.boundingBoxResults

    return results.map((hit) => {
      const src = (hit.source ?? {}) as Record<string, unknown>
      const loc = src.location as { lat: number; lon: number } | undefined
      return {
        id: hit.id || (src.id as string) || '',
        name: (src.name as string) || 'Unknown Store',
        type: src.type as string | undefined,
        rating: src.rating as number | undefined,
        distance: hit.distance,
        address: src.address as string | undefined,
        source: { ...src, lat: loc?.lat, lng: loc?.lon, lon: loc?.lon },
      }
    })
  }, [searchMode, geo.nearbyResults, geo.boundingBoxResults, geo.deliveryResults])

  // Fit map to current marker data
  const handleFitBounds = useCallback(() => {
    const bounds = getMarkersBounds(markers)
    if (bounds) requestFitBounds(bounds)
  }, [markers, requestFitBounds])

  // Auto-zoom when results change
  useEffect(() => {
    if (autoZoom && markers.length > 0) {
      const bounds = getMarkersBounds(markers)
      if (bounds) requestFitBounds(bounds)
    }
  }, [autoZoom, markers, requestFitBounds])

  // Delivery zone data for polygon rendering
  const deliveryZones = useMemo(() => {
    if (searchMode !== 'delivery-zones') return []
    return geo.deliveryResults
      .filter((d) => d.source?.delivery_zone)
      .map((d) => {
        const zone = d.source.delivery_zone as { coordinates: number[][][] }
        return {
          id: d.store_id,
          name: d.store_name || d.store_id,
          coordinates: zone.coordinates,
        }
      })
  }, [searchMode, geo.deliveryResults])

  // Loading state
  const isLoading =
    geo.nearbyLoading ||
    geo.boundingBoxLoading ||
    geo.aggregationLoading ||
    geo.deliveryLoading

  // Error state
  const error =
    geo.nearbyError ||
    geo.boundingBoxError ||
    geo.aggregationError ||
    geo.deliveryError

  // Result count
  const totalResults = searchMode === 'nearby'
    ? geo.nearbyTotal
    : searchMode === 'heatmap'
      ? geo.aggregationBuckets.length
      : searchMode === 'delivery-zones'
        ? geo.deliveryResults.length
        : geo.boundingBoxTotal

  // Response format label
  const responseFormat = searchMode === 'vector-tiles' ? 'Protobuf (MVT)' : 'JSON'

  // Map props shared between implementations
  const sharedMapProps = {
    markers: searchMode !== 'heatmap' && searchMode !== 'vector-tiles' ? markers : [],
    onBoundsChange: handleBoundsChange,
    onMapClick: handleMapClick,
    onMarkerClick: handleMarkerClick,
    heatmapBuckets: searchMode === 'heatmap' ? geo.aggregationBuckets : [],
    deliveryZones,
    height: '450px',
  }

  return (
    <>
      <AppHeader />
      <EuiPageTemplate
        panelled={false}
        restrictWidth={false}
        paddingSize="m"
      >
        {/* Title bar */}
        <EuiFlexGroup alignItems="center" gutterSize="m">
          <EuiFlexItem grow={false}>
            <EuiText><h2>Geo Search</h2></EuiText>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiBadge color={mapLibrary === 'mapbox' ? 'primary' : 'success'}>
              {mapLibrary === 'mapbox' ? 'Mapbox GL (Vector Tiles)' : 'Leaflet (JSON API)'}
            </EuiBadge>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiBadge color="hollow">
              {searchMode.replace('-', ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
            </EuiBadge>
          </EuiFlexItem>
          {isLoading && (
            <EuiFlexItem grow={false}>
              <EuiLoadingSpinner size="m" />
            </EuiFlexItem>
          )}
          {!isLoading && totalResults > 0 && (
            <EuiFlexItem grow={false}>
              <EuiText size="s" color="subdued">{totalResults} results</EuiText>
            </EuiFlexItem>
          )}
        </EuiFlexGroup>

        <EuiSpacer size="m" />

        {error && (
          <>
            <EuiCallOut title="Search Error" color="danger" iconType="alert">
              <p>{error}</p>
            </EuiCallOut>
            <EuiSpacer size="m" />
          </>
        )}

        {/* Main layout: sidebar + map + results */}
        <EuiFlexGroup gutterSize="m">
          {/* Sidebar controls */}
          <EuiFlexItem grow={false} style={{ width: 260 }}>
            <MapControls
              searchMode={searchMode}
              onSearchModeChange={setSearchMode}
              radius={radius}
              onRadiusChange={setRadius}
              onSearch={handleSearch}
              loading={isLoading}
              storeTypes={STORE_TYPES}
              selectedStoreTypes={selectedStoreTypes}
              onStoreTypesChange={setSelectedStoreTypes}
              features={FEATURES}
              selectedFeatures={selectedFeatures}
              onFeaturesChange={setSelectedFeatures}
              autoZoom={autoZoom}
              onAutoZoomChange={setAutoZoom}
              onFitBounds={handleFitBounds}
              hasFitData={markers.length > 0}
            />
          </EuiFlexItem>

          {/* Map + Results */}
          <EuiFlexItem>
            {/* Map */}
            <EuiPanel hasBorder paddingSize="none" style={{ overflow: 'hidden', borderRadius: 6 }}>
              {mapLibrary === 'mapbox' ? (
                <MapboxMap
                  {...sharedMapProps}
                  showVectorTiles={searchMode === 'vector-tiles'}
                />
              ) : (
                <>
                  {searchMode === 'vector-tiles' && (
                    <EuiCallOut
                      title="Vector tiles require Mapbox GL"
                      color="warning"
                      iconType="alert"
                      size="s"
                    >
                      <p>Switch to Mapbox GL to demo vector tile rendering from the ES _mvt API.</p>
                    </EuiCallOut>
                  )}
                  <LeafletMap {...sharedMapProps} />
                </>
              )}
            </EuiPanel>

            <EuiSpacer size="m" />

            {/* Results list */}
            {markers.length > 0 && searchMode !== 'heatmap' && searchMode !== 'vector-tiles' && (
              <EuiPanel hasBorder paddingSize="m">
                <EuiText size="xs" color="subdued">
                  <strong>{markers.length} stores</strong> in view
                </EuiText>
                <EuiSpacer size="s" />
                <div style={{ maxHeight: 300, overflowY: 'auto' }}>
                  {markers.map((m) => (
                    <EuiPanel
                      key={m.id}
                      hasBorder
                      paddingSize="s"
                      style={{ marginBottom: 4, cursor: 'pointer' }}
                      onClick={() => handleMarkerClick(m)}
                    >
                      <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
                        <EuiFlexItem>
                          <EuiText size="s"><strong>{m.name}</strong></EuiText>
                          {m.address && (
                            <EuiText size="xs" color="subdued">{m.address}</EuiText>
                          )}
                        </EuiFlexItem>
                        {m.type && (
                          <EuiFlexItem grow={false}>
                            <EuiBadge color="hollow">{m.type}</EuiBadge>
                          </EuiFlexItem>
                        )}
                        {m.distance !== undefined && m.distance !== null && (
                          <EuiFlexItem grow={false}>
                            <EuiText size="xs" color="subdued">
                              {typeof m.distance === 'number'
                                ? `${m.distance.toFixed(1)} mi`
                                : m.distance}
                            </EuiText>
                          </EuiFlexItem>
                        )}
                        {m.rating !== undefined && (
                          <EuiFlexItem grow={false}>
                            <EuiText size="xs">{m.rating?.toFixed(1)}</EuiText>
                          </EuiFlexItem>
                        )}
                      </EuiFlexGroup>
                    </EuiPanel>
                  ))}
                </div>
              </EuiPanel>
            )}

            {/* Empty state */}
            {!isLoading && markers.length === 0 && searchMode !== 'heatmap' && searchMode !== 'vector-tiles' && (
              <EuiEmptyPrompt
                iconType="mapMarker"
                title={<h3>No stores found</h3>}
                body={
                  <p>
                    {searchMode === 'nearby'
                      ? 'Try increasing the search radius or clicking a different location on the map.'
                      : searchMode === 'delivery-zones'
                        ? 'Click on the map to check delivery zone coverage.'
                        : 'Pan or zoom the map to search for stores.'}
                  </p>
                }
              />
            )}
          </EuiFlexItem>
        </EuiFlexGroup>

        <EuiSpacer size="m" />

        {/* Query Inspector */}
        <FormatComparisonPanel
          queryBody={lastQuery}
          responseBody={lastResponse}
          responseFormat={responseFormat}
          totalHits={totalResults}
        />
      </EuiPageTemplate>

      {/* Store detail flyout */}
      <StoreDetailPanel store={selectedStore} onClose={() => setSelectedStore(null)} />
    </>
  )
}

// ---------------------------------------------------------------------------
// Exported page (wraps in MapProvider)
// ---------------------------------------------------------------------------

export function GeoSearchPage() {
  return (
    <MapProvider>
      <GeoSearchContent />
    </MapProvider>
  )
}

export default GeoSearchPage
