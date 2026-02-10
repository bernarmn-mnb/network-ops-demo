/**
 * StoreDetailPanel - EUI flyout showing full store details.
 *
 * Opens as a side panel when a store marker is clicked.
 * Shows name, address, phone, hours, services, features, rating, delivery zone.
 */

import {
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiTitle,
  EuiText,
  EuiSpacer,
  EuiBadge,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiDescriptionList,
} from '@elastic/eui'

export interface StoreDetail {
  id: string
  name: string
  type?: string
  address?: string
  phone?: string
  hours?: string
  rating?: number
  distance?: number | string
  services?: string[]
  features?: string[]
  delivery_zone?: boolean
  source?: Record<string, unknown>
}

interface StoreDetailPanelProps {
  store: StoreDetail | null
  onClose: () => void
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

export function StoreDetailPanel({ store, onClose }: StoreDetailPanelProps) {
  if (!store) return null

  const descriptionItems: Array<{ title: string; description: string }> = []

  if (store.address) {
    descriptionItems.push({ title: 'Address', description: store.address })
  }
  if (store.phone) {
    descriptionItems.push({ title: 'Phone', description: store.phone })
  }
  if (store.hours) {
    descriptionItems.push({ title: 'Hours', description: store.hours })
  }
  if (store.distance !== undefined && store.distance !== null) {
    descriptionItems.push({
      title: 'Distance',
      description: typeof store.distance === 'number'
        ? `${store.distance.toFixed(1)} miles`
        : store.distance,
    })
  }

  return (
    <EuiFlyout
      onClose={onClose}
      size="s"
      ownFocus
      aria-labelledby="storeDetailTitle"
    >
      <EuiFlyoutHeader hasBorder>
        <EuiFlexGroup alignItems="center" gutterSize="s">
          <EuiFlexItem grow={false}>
            <EuiIcon type="mapMarker" size="l" />
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiTitle size="s">
              <h2 id="storeDetailTitle">{store.name}</h2>
            </EuiTitle>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutHeader>

      <EuiFlyoutBody>
        {/* Type & Rating */}
        <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false} wrap>
          {store.type && (
            <EuiFlexItem grow={false}>
              <EuiBadge color="primary">{store.type}</EuiBadge>
            </EuiFlexItem>
          )}
          {store.delivery_zone && (
            <EuiFlexItem grow={false}>
              <EuiBadge color="success">Delivers here</EuiBadge>
            </EuiFlexItem>
          )}
        </EuiFlexGroup>

        {store.rating !== undefined && store.rating !== null && (
          <>
            <EuiSpacer size="s" />
            <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
              <EuiFlexItem grow={false}>
                <span>{renderStars(store.rating)}</span>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiText size="s">{store.rating.toFixed(1)}</EuiText>
              </EuiFlexItem>
            </EuiFlexGroup>
          </>
        )}

        <EuiSpacer size="m" />

        {/* Details list */}
        {descriptionItems.length > 0 && (
          <EuiDescriptionList listItems={descriptionItems} type="column" />
        )}

        {/* Services */}
        {store.services && store.services.length > 0 && (
          <>
            <EuiSpacer size="m" />
            <EuiText size="xs"><strong>Services</strong></EuiText>
            <EuiSpacer size="xs" />
            <EuiFlexGroup gutterSize="xs" wrap responsive={false}>
              {store.services.map((s) => (
                <EuiFlexItem key={s} grow={false}>
                  <EuiBadge color="hollow">{s}</EuiBadge>
                </EuiFlexItem>
              ))}
            </EuiFlexGroup>
          </>
        )}

        {/* Features */}
        {store.features && store.features.length > 0 && (
          <>
            <EuiSpacer size="m" />
            <EuiText size="xs"><strong>Features</strong></EuiText>
            <EuiSpacer size="xs" />
            <EuiFlexGroup gutterSize="xs" wrap responsive={false}>
              {store.features.map((f) => (
                <EuiFlexItem key={f} grow={false}>
                  <EuiBadge color="default">{f}</EuiBadge>
                </EuiFlexItem>
              ))}
            </EuiFlexGroup>
          </>
        )}
      </EuiFlyoutBody>
    </EuiFlyout>
  )
}

export default StoreDetailPanel
