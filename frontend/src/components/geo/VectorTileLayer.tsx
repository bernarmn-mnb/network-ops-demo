/**
 * VectorTileLayer - Info panel for Mapbox vector tile layer.
 *
 * The actual vector tile source/layer is rendered inside MapboxMap
 * when showVectorTiles=true. This component provides an informational
 * badge and description for the UI.
 */

import {
  EuiBadge,
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
} from '@elastic/eui'

interface VectorTileLayerInfoProps {
  /** Whether vector tiles are currently active */
  active: boolean
  /** Tile endpoint URL pattern */
  tileUrl?: string
}

export function VectorTileLayerInfo({
  active,
  tileUrl = '/api/geo/vector-tiles/{z}/{x}/{y}',
}: VectorTileLayerInfoProps) {
  return (
    <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
      <EuiFlexItem grow={false}>
        <EuiBadge color={active ? 'success' : 'default'}>
          Vector Tiles {active ? 'ON' : 'OFF'}
        </EuiBadge>
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiText size="xs" color="subdued">
          Mapbox GL renders protobuf vector tiles from <code>{tileUrl}</code>.
          This is the most efficient format for large datasets.
        </EuiText>
      </EuiFlexItem>
    </EuiFlexGroup>
  )
}

export default VectorTileLayerInfo
