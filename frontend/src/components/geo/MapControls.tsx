/**
 * MapControls - Sidebar control panel for the geo search page.
 *
 * Provides:
 * - Map library toggle (Mapbox / Leaflet)
 * - Search mode selector (Nearby, Viewport, Heatmap, Vector Tiles, Delivery Zones)
 * - Radius slider for nearby search
 * - "Use My Location" button
 * - Store type and feature filters
 */

import { useState } from 'react'
import {
  EuiPanel,
  EuiTitle,
  EuiSpacer,
  EuiButtonGroup,
  EuiRange,
  EuiButton,
  EuiButtonEmpty,
  EuiText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiCheckboxGroup,
  EuiAccordion,
  EuiFieldText,
  EuiFormRow,
  EuiRadioGroup,
  EuiSwitch,
  EuiHorizontalRule,
} from '@elastic/eui'
import { useMap } from './MapProvider'
import type { MapLibrary } from './MapProvider'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type SearchMode = 'nearby' | 'viewport' | 'heatmap' | 'vector-tiles' | 'delivery-zones'

interface MapControlsProps {
  searchMode: SearchMode
  onSearchModeChange: (mode: SearchMode) => void
  radius: string
  onRadiusChange: (radius: string) => void
  onSearch: () => void
  loading?: boolean
  /** Available store types for filtering */
  storeTypes?: string[]
  selectedStoreTypes?: string[]
  onStoreTypesChange?: (types: string[]) => void
  /** Available features for filtering */
  features?: string[]
  selectedFeatures?: string[]
  onFeaturesChange?: (features: string[]) => void
  /** Auto-zoom toggle */
  autoZoom?: boolean
  onAutoZoomChange?: (enabled: boolean) => void
  /** Fit to data callback */
  onFitBounds?: () => void
  /** Whether fit-to-data is available (has markers) */
  hasFitData?: boolean
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const LIBRARY_OPTIONS = [
  { id: 'leaflet' as const, label: 'Leaflet' },
  { id: 'mapbox' as const, label: 'Mapbox' },
]

const SEARCH_MODE_OPTIONS = [
  { id: 'nearby', label: 'Nearby Search' },
  { id: 'viewport', label: 'Map Viewport' },
  { id: 'heatmap', label: 'Heatmap Clusters' },
  { id: 'vector-tiles', label: 'Vector Tiles (Mapbox)' },
  { id: 'delivery-zones', label: 'Delivery Zones' },
]

const RADIUS_OPTIONS = [
  { value: '1mi', label: '1 mi' },
  { value: '5mi', label: '5 mi' },
  { value: '10mi', label: '10 mi' },
  { value: '25mi', label: '25 mi' },
  { value: '50mi', label: '50 mi' },
  { value: '100mi', label: '100 mi' },
]

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function MapControls({
  searchMode,
  onSearchModeChange,
  radius,
  onRadiusChange,
  onSearch,
  loading = false,
  storeTypes = [],
  selectedStoreTypes = [],
  onStoreTypesChange,
  features = [],
  selectedFeatures = [],
  onFeaturesChange,
  autoZoom = false,
  onAutoZoomChange,
  onFitBounds,
  hasFitData = false,
}: MapControlsProps) {
  const {
    mapLibrary,
    setMapLibrary,
    userLocation,
    requestUserLocation,
    locationLoading,
    locationError,
  } = useMap()

  const [locationInput, setLocationInput] = useState('')

  // Radius as slider index
  const radiusIndex = RADIUS_OPTIONS.findIndex((r) => r.value === radius)

  const storeTypeCheckboxes = storeTypes.map((t) => ({
    id: t,
    label: t,
  }))

  const featureCheckboxes = features.map((f) => ({
    id: f,
    label: f,
  }))

  return (
    <EuiPanel paddingSize="m" hasBorder>
      {/* Map Library Toggle */}
      <EuiTitle size="xxs"><h3>Map Library</h3></EuiTitle>
      <EuiSpacer size="xs" />
      <EuiButtonGroup
        legend="Select map library"
        options={LIBRARY_OPTIONS}
        idSelected={mapLibrary}
        onChange={(id) => setMapLibrary(id as MapLibrary)}
        buttonSize="s"
        isFullWidth
      />

      <EuiSpacer size="m" />

      {/* Search Mode */}
      <EuiTitle size="xxs"><h3>Search Mode</h3></EuiTitle>
      <EuiSpacer size="xs" />
      <EuiRadioGroup
        options={SEARCH_MODE_OPTIONS}
        idSelected={searchMode}
        onChange={(id) => onSearchModeChange(id as SearchMode)}
        compressed
      />

      {/* Vector tiles note */}
      {searchMode === 'vector-tiles' && mapLibrary !== 'mapbox' && (
        <>
          <EuiSpacer size="s" />
          <EuiText size="xs" color="warning">
            Vector tiles require Mapbox GL. Switch to Mapbox to use this mode.
          </EuiText>
        </>
      )}

      <EuiSpacer size="m" />

      {/* Zoom Controls */}
      <EuiTitle size="xxs"><h3>Zoom</h3></EuiTitle>
      <EuiSpacer size="xs" />
      <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
        <EuiFlexItem>
          <EuiButtonEmpty
            iconType="crosshairs"
            size="s"
            onClick={onFitBounds}
            disabled={!hasFitData}
            flush="left"
          >
            Fit to Data
          </EuiButtonEmpty>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="xs" />
      <EuiSwitch
        label="Auto-zoom to results"
        checked={autoZoom}
        onChange={(e) => onAutoZoomChange?.(e.target.checked)}
        compressed
      />

      <EuiHorizontalRule margin="m" />


      {/* Location */}
      <EuiTitle size="xxs"><h3>Location</h3></EuiTitle>
      <EuiSpacer size="xs" />
      <EuiFlexGroup gutterSize="s" responsive={false}>
        <EuiFlexItem>
          <EuiButton
            size="s"
            iconType="mapMarker"
            onClick={requestUserLocation}
            isLoading={locationLoading}
            fullWidth
          >
            Use My Location
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>

      {userLocation && (
        <>
          <EuiSpacer size="xs" />
          <EuiText size="xs" color="subdued">
            <EuiIcon type="check" size="s" color="success" />{' '}
            {userLocation.lat.toFixed(4)}, {userLocation.lng.toFixed(4)}
          </EuiText>
        </>
      )}

      {locationError && (
        <>
          <EuiSpacer size="xs" />
          <EuiText size="xs" color="danger">{locationError}</EuiText>
        </>
      )}

      <EuiSpacer size="s" />
      <EuiFormRow label="Or enter coordinates" fullWidth>
        <EuiFieldText
          placeholder="lat, lng (e.g. 40.7128, -74.0060)"
          value={locationInput}
          onChange={(e) => setLocationInput(e.target.value)}
          fullWidth
          compressed
        />
      </EuiFormRow>

      {/* Radius (for nearby mode) */}
      {searchMode === 'nearby' && (
        <>
          <EuiSpacer size="m" />
          <EuiTitle size="xxs"><h3>Radius</h3></EuiTitle>
          <EuiSpacer size="xs" />
          <EuiRange
            min={0}
            max={RADIUS_OPTIONS.length - 1}
            step={1}
            value={radiusIndex >= 0 ? radiusIndex : 2}
            onChange={(e) => {
              const idx = Number((e as React.ChangeEvent<HTMLInputElement>).target.value)
              onRadiusChange(RADIUS_OPTIONS[idx].value)
            }}
            showTicks
            ticks={RADIUS_OPTIONS.map((r, i) => ({ label: r.label, value: i }))}
            fullWidth
          />
        </>
      )}

      <EuiSpacer size="m" />

      {/* Search Button */}
      <EuiButton
        fill
        fullWidth
        iconType="search"
        onClick={onSearch}
        isLoading={loading}
      >
        Search
      </EuiButton>

      {/* Filters (collapsible) */}
      {storeTypes.length > 0 && onStoreTypesChange && (
        <>
          <EuiSpacer size="m" />
          <EuiAccordion id="storeTypeFilters" buttonContent="Store Types">
            <EuiSpacer size="xs" />
            <EuiCheckboxGroup
              options={storeTypeCheckboxes}
              idToSelectedMap={Object.fromEntries(
                selectedStoreTypes.map((t) => [t, true]),
              )}
              onChange={(id) => {
                const next = selectedStoreTypes.includes(id)
                  ? selectedStoreTypes.filter((t) => t !== id)
                  : [...selectedStoreTypes, id]
                onStoreTypesChange(next)
              }}
            />
          </EuiAccordion>
        </>
      )}

      {features.length > 0 && onFeaturesChange && (
        <>
          <EuiSpacer size="s" />
          <EuiAccordion id="featureFilters" buttonContent="Features">
            <EuiSpacer size="xs" />
            <EuiCheckboxGroup
              options={featureCheckboxes}
              idToSelectedMap={Object.fromEntries(
                selectedFeatures.map((f) => [f, true]),
              )}
              onChange={(id) => {
                const next = selectedFeatures.includes(id)
                  ? selectedFeatures.filter((f) => f !== id)
                  : [...selectedFeatures, id]
                onFeaturesChange(next)
              }}
            />
          </EuiAccordion>
        </>
      )}
    </EuiPanel>
  )
}

export default MapControls
