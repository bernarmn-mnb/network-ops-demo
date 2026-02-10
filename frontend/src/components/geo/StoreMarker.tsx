/**
 * StoreMarker - Shared marker popup/tooltip content for both Mapbox and Leaflet.
 *
 * Renders store name, type badge, rating, and optional distance.
 * Used inside map popups so it outputs plain HTML-friendly React.
 */

import {
  EuiBadge,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiText,
} from '@elastic/eui'

export interface StoreMarkerData {
  id: string
  name: string
  type?: string
  rating?: number
  distance?: number | string
  address?: string
  source?: Record<string, unknown>
}

interface StoreMarkerProps {
  store: StoreMarkerData
  onClick?: (store: StoreMarkerData) => void
}

function renderStars(rating: number) {
  const full = Math.floor(rating)
  const half = rating - full >= 0.5 ? 1 : 0
  const empty = 5 - full - half
  const stars: React.ReactNode[] = []
  for (let i = 0; i < full; i++) stars.push(<EuiIcon key={`f${i}`} type="starFilled" size="s" color="warning" />)
  if (half) stars.push(<EuiIcon key="h" type="starMinusEmpty" size="s" color="warning" />)
  for (let i = 0; i < empty; i++) stars.push(<EuiIcon key={`e${i}`} type="starEmpty" size="s" color="subdued" />)
  return stars
}

export function StoreMarker({ store, onClick }: StoreMarkerProps) {
  const handleClick = () => onClick?.(store)

  return (
    <div
      style={{ minWidth: 180, cursor: onClick ? 'pointer' : 'default' }}
      onClick={handleClick}
    >
      <EuiText size="s">
        <strong>{store.name}</strong>
      </EuiText>

      <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false} wrap>
        {store.type && (
          <EuiFlexItem grow={false}>
            <EuiBadge color="hollow">{store.type}</EuiBadge>
          </EuiFlexItem>
        )}
        {store.distance !== undefined && store.distance !== null && (
          <EuiFlexItem grow={false}>
            <EuiText size="xs" color="subdued">
              {typeof store.distance === 'number'
                ? `${store.distance.toFixed(1)} mi`
                : store.distance}
            </EuiText>
          </EuiFlexItem>
        )}
      </EuiFlexGroup>

      {store.rating !== undefined && store.rating !== null && (
        <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
          <EuiFlexItem grow={false}>
            <span>{renderStars(store.rating)}</span>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiText size="xs" color="subdued">{store.rating.toFixed(1)}</EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      )}

      {store.address && (
        <EuiText size="xs" color="subdued">{store.address}</EuiText>
      )}
    </div>
  )
}

export default StoreMarker
