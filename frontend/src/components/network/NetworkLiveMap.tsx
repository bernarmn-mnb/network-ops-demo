/**
 * NetworkLiveMap
 *
 * Geographic map of the network topology powered by CDP/LLDP adjacency data.
 * Devices are pinned to real locations; links are drawn from netcrawl discovery.
 * Down-links pulse red; click any marker for device details.
 */

import { useEffect } from 'react'
import { MapContainer, TileLayer, CircleMarker, Polyline, Popup, Tooltip, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import { EuiBadge, EuiText, EuiFlexGroup, EuiFlexItem, EuiHorizontalRule, EuiProgress } from '@elastic/eui'
import { statusColor, utilizationColor, type NetworkDevice, type TopologyLink } from '../../services/networkApi'
import type { CdpLink } from '../../services/networkApi'

// ---------------------------------------------------------------------------
// Geographic coordinates for each device (realistic US enterprise layout)
// ---------------------------------------------------------------------------

const DEVICE_COORDS: Record<string, [number, number]> = {
  // Internet / ISP — NYC Midtown
  'internet':    [40.7589, -73.9851],
  // DC-1, Lower Manhattan — firewall, core switch, DMZ, servers
  'fw-01':       [40.7074, -74.0119],
  'core-sw-01':  [40.7074, -74.0108],
  'dmz-sw':      [40.7070, -74.0119],
  'web-srv':     [40.7066, -74.0108],
  'app-srv':     [40.7066, -74.0122],
  // Site-A — Chicago, IL
  'site-a-rtr':  [41.8781, -87.6298],
  'acc-sw-01':   [41.8800, -87.6268],
  'acc-sw-02':   [41.8762, -87.6328],
  // Site-B — Dallas, TX (critical — rtr at 95% CPU, Gi0/2 down)
  'site-b-rtr':  [32.7767, -96.7970],
  'acc-sw-03':   [32.7800, -96.7940],
}

const SITE_LABELS: Record<string, string> = {
  'internet':    'Internet / ISP — NYC',
  'fw-01':       'HQ Data Center — New York, NY',
  'core-sw-01':  'HQ Data Center — New York, NY',
  'dmz-sw':      'HQ Data Center — New York, NY',
  'web-srv':     'HQ Data Center — New York, NY',
  'app-srv':     'HQ Data Center — New York, NY',
  'site-a-rtr':  'Site A — Chicago, IL',
  'acc-sw-01':   'Site A — Chicago, IL',
  'acc-sw-02':   'Site A — Chicago, IL',
  'site-b-rtr':  'Site B — Dallas, TX',
  'acc-sw-03':   'Site B — Dallas, TX',
}

// Device type → marker radius
const TYPE_RADIUS: Record<string, number> = {
  internet: 14, firewall: 12, router: 11, switch: 9, server: 8,
}

// ---------------------------------------------------------------------------
// Auto-fit bounds helper
// ---------------------------------------------------------------------------

function FitBounds({ coords }: { coords: Array<[number, number]> }) {
  const map = useMap()
  useEffect(() => {
    if (coords.length) {
      map.fitBounds(coords, { padding: [40, 40], maxZoom: 9 })
    }
  }, [map, coords])
  return null
}

// ---------------------------------------------------------------------------
// Pulsing circle for down links (CSS animation via Leaflet SVG)
// ---------------------------------------------------------------------------

function DownLinkMarker({ pos }: { pos: [number, number] }) {
  return (
    <CircleMarker
      center={pos}
      radius={14}
      interactive={false}
      pathOptions={{
        color: '#BD271E', fillColor: '#BD271E', fillOpacity: 0.2,
        weight: 2, dashArray: '4 3',
      }}
    />
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

interface Props {
  devices: NetworkDevice[]
  topoLinks: TopologyLink[]
  cdpLinks: CdpLink[]
  selectedId: string | null
  onSelect: (id: string | null) => void
}

export function NetworkLiveMap({ devices, topoLinks, cdpLinks, selectedId, onSelect }: Props) {

  // Build link lines from CDP/LLDP data
  const HOSTNAME_TO_ID: Record<string, string> = {
    'fw-01.corp.local': 'fw-01', 'core-sw-01.corp.local': 'core-sw-01',
    'site-a-rtr.corp.local': 'site-a-rtr', 'site-b-rtr.corp.local': 'site-b-rtr',
    'dmz-sw.corp.local': 'dmz-sw', 'acc-sw-01.corp.local': 'acc-sw-01',
    'acc-sw-02.corp.local': 'acc-sw-02', 'acc-sw-03.corp.local': 'acc-sw-03',
    'web-srv-01.corp.local': 'web-srv', 'app-srv-01.corp.local': 'app-srv',
  }

  // Deduplicate CDP/LLDP links
  const seen = new Set<string>()
  const mapLinks = cdpLinks.length > 0
    ? cdpLinks.filter(l => {
        const a = HOSTNAME_TO_ID[l.local_device] ?? l.local_device
        const b = HOSTNAME_TO_ID[l.neighbor_hostname] ?? l.neighbor_hostname
        const key = [a, b].sort().join('↔')
        if (seen.has(key)) return false
        seen.add(key)
        return true
      })
    : topoLinks.map(l => ({
        local_device: l.source, neighbor_hostname: l.target,
        link_status: l.utilization > 0.85 ? 'warning' : 'up',
        protocol: 'CDP' as const, local_interface: '', neighbor_ip: '',
        neighbor_interface: '', platform: '', utilization: l.utilization,
      } as CdpLink & { utilization: number }))

  const allCoords = Object.values(DEVICE_COORDS)

  return (
    <div style={{ position: 'relative' }}>
      <MapContainer
        center={[39.5, -87]}
        zoom={5}
        style={{ height: 520, width: '100%', borderRadius: 8, zIndex: 0 }}
        scrollWheelZoom
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://openstreetmap.org">OpenStreetMap</a>'
        />

        <FitBounds coords={allCoords} />

        {/* ── Links ── */}
        {mapLinks.map((link, i) => {
          const srcId  = typeof link.local_device === 'string' && DEVICE_COORDS[link.local_device]
            ? link.local_device
            : HOSTNAME_TO_ID[link.local_device]
          const dstId = typeof link.neighbor_hostname === 'string' && DEVICE_COORDS[link.neighbor_hostname]
            ? link.neighbor_hostname
            : HOSTNAME_TO_ID[link.neighbor_hostname]

          const srcCoord = DEVICE_COORDS[srcId]
          const dstCoord = DEVICE_COORDS[dstId]
          if (!srcCoord || !dstCoord) return null

          const isDown = 'link_status' in link && link.link_status === 'down'
          const utilization = 'utilization' in link ? (link as unknown as { utilization: number }).utilization : 0
          const color = isDown ? '#BD271E' : utilizationColor(utilization)

          return (
            <Polyline
              key={i}
              positions={[srcCoord, dstCoord]}
              interactive={false}
              pathOptions={{
                color,
                weight: isDown ? 3 : 2.5,
                dashArray: isDown ? '8 5' : undefined,
                opacity: 0.85,
              }}
            >
              <Tooltip sticky>
                {'local_interface' in link && link.local_interface
                  ? `${srcId} ${link.local_interface} → ${dstId} ${link.neighbor_interface} · ${'protocol' in link ? link.protocol : ''} · ${isDown ? '🔴 DOWN' : '🟢 UP'}`
                  : `${srcId} → ${dstId} · ${Math.round(utilization * 100)}% utilisation`
                }
              </Tooltip>
            </Polyline>
          )
        })}

        {/* ── Down-link pulse ring ── */}
        {mapLinks.filter(l => 'link_status' in l && l.link_status === 'down').map((link, i) => {
          const mid = (() => {
            const srcId = HOSTNAME_TO_ID[link.local_device] ?? link.local_device
            const dstId = HOSTNAME_TO_ID[link.neighbor_hostname] ?? link.neighbor_hostname
            const s = DEVICE_COORDS[srcId], d = DEVICE_COORDS[dstId]
            if (!s || !d) return null
            return [(s[0] + d[0]) / 2, (s[1] + d[1]) / 2] as [number, number]
          })()
          return mid ? <DownLinkMarker key={`pulse-${i}`} pos={mid} /> : null
        })}

        {/* ── Device markers ── */}
        {devices.filter(d => DEVICE_COORDS[d.id]).map(device => {
          const coord   = DEVICE_COORDS[device.id]
          const sColor  = statusColor(device.status)
          const radius  = TYPE_RADIUS[device.type] ?? 9
          const isSelected = selectedId === device.id
          const shortName  = device.hostname.split('.')[0]

          return (
            <CircleMarker
              key={device.id}
              center={coord}
              radius={isSelected ? radius + 4 : radius}
              pathOptions={{
                color: isSelected ? '#0077CC' : '#fff',
                fillColor: sColor,
                fillOpacity: 0.92,
                weight: isSelected ? 3 : 1.5,
              }}
              eventHandlers={{ click: () => onSelect(isSelected ? null : device.id) }}
            >
              <Tooltip direction="top" offset={[0, -radius]} permanent={device.status === 'critical'}>
                <span style={{ fontFamily: 'monospace', fontSize: 11 }}>
                  {device.status === 'critical' ? '🔴 ' : ''}{shortName}
                </span>
              </Tooltip>
              <Popup minWidth={260}>
                <div style={{ fontFamily: 'Inter, sans-serif', padding: 4 }}>
                  <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
                    <EuiFlexItem grow={false}>
                      <strong style={{ fontFamily: 'monospace', fontSize: 13 }}>{shortName}</strong>
                    </EuiFlexItem>
                    <EuiFlexItem grow={false}>
                      <EuiBadge
                        color={device.status === 'healthy' ? 'success' : device.status === 'warning' ? 'warning' : 'danger'}
                        style={{ fontSize: 10 }}
                      >
                        {device.status}
                      </EuiBadge>
                    </EuiFlexItem>
                  </EuiFlexGroup>
                  <EuiText size="xs" color="subdued" style={{ marginTop: 4 }}>
                    <p style={{ margin: '2px 0', fontFamily: 'monospace' }}>{device.ip}</p>
                    <p style={{ margin: '2px 0' }}>{device.vendor} {device.model}</p>
                    <p style={{ margin: '2px 0' }}>{SITE_LABELS[device.id] ?? device.location}</p>
                  </EuiText>
                  <EuiHorizontalRule margin="xs" />
                  <EuiText size="xs"><strong>CPU</strong></EuiText>
                  <EuiProgress value={device.cpu} max={100} size="xs"
                    color={device.cpu >= 90 ? 'danger' : device.cpu >= 75 ? 'warning' : 'success'} />
                  <EuiText size="xs" style={{ marginTop: 4 }}><strong>Memory</strong></EuiText>
                  <EuiProgress value={device.mem} max={100} size="xs"
                    color={device.mem >= 90 ? 'danger' : device.mem >= 75 ? 'warning' : 'success'} />
                </div>
              </Popup>
            </CircleMarker>
          )
        })}
      </MapContainer>

      {/* ── Map legend ── */}
      <div style={{
        position: 'absolute', bottom: 28, left: 12, zIndex: 1000,
        background: 'rgba(255,255,255,0.92)', borderRadius: 6,
        padding: '8px 12px', fontSize: 11, boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
      }}>
        <div style={{ fontWeight: 600, marginBottom: 6 }}>Status</div>
        {[['#00BF9A', 'Healthy'], ['#FEC514', 'Warning'], ['#BD271E', 'Critical']].map(([c, l]) => (
          <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: c }} />
            <span>{l}</span>
          </div>
        ))}
        <div style={{ fontWeight: 600, marginTop: 8, marginBottom: 6 }}>Links</div>
        {[['#00BF9A', '< 50%'], ['#FEC514', '50–75%'], ['#F0861A', '75–90%'], ['#BD271E', '> 90% / Down']].map(([c, l]) => (
          <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
            <div style={{ width: 16, height: 3, background: c, borderRadius: 2 }} />
            <span>{l}</span>
          </div>
        ))}
        <div style={{ marginTop: 6, color: '#666', fontStyle: 'italic' }}>
          {cdpLinks.length > 0 ? `${cdpLinks.length} CDP/LLDP links` : 'Topology links'}
        </div>
      </div>
    </div>
  )
}
