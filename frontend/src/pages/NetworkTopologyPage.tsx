import { useState, useEffect, useCallback } from 'react'
import {
  EuiPageTemplate,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiTitle,
  EuiSpacer,
  EuiBadge,
  EuiText,
  EuiLoadingSpinner,
  EuiStat,
  EuiHorizontalRule,
  EuiIcon,
  EuiProgress,
  EuiButtonGroup,
  EuiButton,
} from '@elastic/eui'
import {
  fetchTopology,
  fetchAlerts,
  fetchCdpTopology,
  triggerCdpCrawl,
  abbreviateInterface,
  statusColor,
  type CdpLink,
  type CdpTopology,
  utilizationColor,
  type NetworkDevice,
  type Topology,
  type NetworkAlert,
} from '../services/networkApi'
import { FloatingChatWidget } from '../components/chat/FloatingChatWidget'

// ---------------------------------------------------------------------------
// Fixed topology layout positions (900 × 570 viewport)
// ---------------------------------------------------------------------------

const NODE_POS: Record<string, { x: number; y: number }> = {
  internet:   { x: 450, y: 55 },
  'fw-01':    { x: 450, y: 160 },
  'core-sw-01': { x: 450, y: 285 },
  'site-a-rtr': { x: 200, y: 395 },
  'site-b-rtr': { x: 450, y: 395 },
  'dmz-sw':   { x: 700, y: 395 },
  'acc-sw-01': { x: 100, y: 510 },
  'acc-sw-02': { x: 300, y: 510 },
  'acc-sw-03': { x: 450, y: 510 },
  'web-srv':  { x: 625, y: 510 },
  'app-srv':  { x: 790, y: 510 },
}

const TYPE_FILL: Record<string, string> = {
  internet: '#1BA9F5',
  firewall: '#F5A700',
  router:   '#7B61FF',
  switch:   '#0077CC',
  server:   '#00BF9A',
}

// ---------------------------------------------------------------------------
// Cisco topology icons — official draw.io stencil paths (cisco/routers.xml,
// switches.xml, security.xml, servers.xml). Each is centered at (0,0) via
// scale + translate so they render correctly at every node position.
// ---------------------------------------------------------------------------

// Router — draw.io cisco/routers.xml "Router" (w=49.33 h=33.33)
// Vertical cylinder drum viewed from above (classic Cisco router symbol)
function CiscoRouterIcon({ fill }: { fill: string }) {
  return (
    <g transform="scale(0.82) translate(-24.66,-16.67)">
      {/* cylinder body */}
      <path
        d="M49.33,9.67 C49.33,15 38.33,19.33 24.66,19.33 C11,19.33 0,15 0,9.67 L0,23.67 C0,29 11,33.33 24.66,33.33 C38.33,33.33 49.33,29 49.33,23.67 Z"
        fill={fill}
      />
      {/* near (top) ellipse face */}
      <path
        d="M24.66,19.33 C38.33,19.33 49.33,15 49.33,9.67 C49.33,4.33 38.33,0 24.66,0 C11,0 0,4.33 0,9.67 C0,15 11,19.33 24.66,19.33 Z"
        fill={fill}
      />
      {/* routing arrows on the near face */}
      <g transform="translate(24.66,9.67)" fill="white" stroke="none">
        <polygon points="-14,0 -8,-4 -8,4" />
        <polygon points="14,0 8,-4 8,4" />
        <rect x="-8" y="-1.5" width="16" height="3" />
      </g>
    </g>
  )
}

// Switch — draw.io cisco/switches.xml "WorkgroupSwitch" (w=63.67 h=31.66)
// 3D isometric box — classic Cisco Layer-2 switch symbol
function CiscoSwitchIcon({ fill }: { fill: string }) {
  return (
    <g transform="scale(0.66) translate(-31.84,-15.83)">
      {/* front face */}
      <path d="M48,31.66 L48,15.66 L0,15.66 L0,31.66 Z" fill={fill} />
      {/* top face */}
      <path d="M0,15.66 L19.33,0 L63.67,0 L47.67,15.66 Z" fill={fill} opacity="0.75" />
      {/* right side face */}
      <path d="M48,31.66 L63.67,14.33 L63.67,0 L48,15.66 Z" fill={fill} opacity="0.55" />
      {/* port lines on front face */}
      <g stroke="white" strokeWidth="1.2" opacity="0.7">
        <line x1="8"  y1="15.66" x2="8"  y2="31.66" />
        <line x1="16" y1="15.66" x2="16" y2="31.66" />
        <line x1="24" y1="15.66" x2="24" y2="31.66" />
        <line x1="32" y1="15.66" x2="32" y2="31.66" />
        <line x1="40" y1="15.66" x2="40" y2="31.66" />
      </g>
    </g>
  )
}

// Firewall — draw.io cisco/security.xml "Firewall" (w=18.67 h=42.67)
// Tall narrow 3D box — standard Cisco ASA/firewall appliance symbol
function CiscoFirewallIcon({ fill }: { fill: string }) {
  return (
    <g transform="scale(0.82) translate(-9.335,-21.335)">
      {/* front face */}
      <path d="M0,42.67 L0,7.34 L10.67,7.34 L10.67,42.67 Z" fill={fill} />
      {/* top face */}
      <path d="M10.67,7.34 L0,7.34 L9.67,0 L18.67,0 Z" fill={fill} opacity="0.75" />
      {/* right side face */}
      <path d="M18.67,0 L18.67,33.67 L10.67,42.67 L10.67,7.34 Z" fill={fill} opacity="0.55" />
      {/* diagonal stripes on front — standard Cisco firewall marking */}
      <g stroke="white" strokeWidth="1" opacity="0.5" strokeLinecap="round">
        <line x1="2"  y1="15" x2="8"  y2="9" />
        <line x1="2"  y1="22" x2="8"  y2="16" />
        <line x1="2"  y1="29" x2="8"  y2="23" />
        <line x1="2"  y1="36" x2="8"  y2="30" />
      </g>
    </g>
  )
}

// Server — draw.io cisco/servers.xml "Server" (w=34.34 h=42.33)
// 3D isometric box — Cisco server/host symbol
function CiscoServerIcon({ fill }: { fill: string }) {
  return (
    <g transform="scale(0.80) translate(-17.17,-21.17)">
      {/* front face */}
      <path d="M21.34,42.33 L21.34,4.67 L0,4.67 L0,42.33 Z" fill={fill} />
      {/* top face */}
      <path d="M0,4.67 L7.34,0 L28,0 L21.34,4.67 Z" fill={fill} opacity="0.75" />
      {/* right side face */}
      <path d="M21.34,42.33 L28,37 L28,0 L21.34,4.67 Z" fill={fill} opacity="0.55" />
      {/* rack unit lines on front face */}
      <g stroke="white" strokeWidth="1" opacity="0.6">
        <line x1="0" y1="14" x2="21.34" y2="14" />
        <line x1="0" y1="24" x2="21.34" y2="24" />
        <line x1="0" y1="34" x2="21.34" y2="34" />
      </g>
      {/* LED indicators */}
      <g fill="white" opacity="0.9">
        <circle cx="17" cy="9"  r="1.5" />
        <circle cx="17" cy="19" r="1.5" />
        <circle cx="17" cy="29" r="1.5" />
      </g>
    </g>
  )
}

// Internet/Cloud — custom cubic bezier cloud centered at (0,0)
// Matches the visual style of standard network topology cloud icons
function CiscoCloudIcon({ fill }: { fill: string }) {
  return (
    <g>
      <path
        d="M-14,8 C-20,8 -22,2 -20,-2 C-24,-12 -14,-14 -10,-10 C-8,-18 0,-20 6,-14 C10,-18 18,-16 18,-8 C22,-6 22,4 16,8 Z"
        fill={fill}
      />
      {/* downlink connection stubs */}
      <g stroke={fill} strokeWidth="2" strokeLinecap="round">
        <line x1="-6" y1="8"  x2="-6" y2="14" />
        <line x1="2"  y1="8"  x2="2"  y2="14" />
        <line x1="10" y1="8"  x2="10" y2="14" />
      </g>
    </g>
  )
}

// Icon label Y offsets — distance below icon center to place the hostname
const ICON_LABEL_Y: Record<string, number> = {
  internet:  22,
  firewall:  24,
  router:    20,
  switch:    18,
  server:    24,
}

function DeviceIcon({ type, fill }: { type: string; fill: string }) {
  switch (type) {
    case 'internet':  return <CiscoCloudIcon fill={fill} />
    case 'firewall':  return <CiscoFirewallIcon fill={fill} />
    case 'router':    return <CiscoRouterIcon fill={fill} />
    case 'switch':    return <CiscoSwitchIcon fill={fill} />
    case 'server':    return <CiscoServerIcon fill={fill} />
    default:          return <CiscoSwitchIcon fill={fill} />
  }
}

// ---------------------------------------------------------------------------
// Topology SVG
// ---------------------------------------------------------------------------

interface SvgProps {
  topology: Topology
  selectedId: string | null
  onSelect: (device: NetworkDevice | null) => void
}

function TopologySvg({ topology, selectedId, onSelect }: SvgProps) {
  return (
    <svg
      viewBox="0 0 900 570"
      style={{ width: '100%', height: 'auto', maxHeight: 520 }}
    >
      <defs>
        <marker id="arrow" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
          <path d="M0,0 L0,6 L6,3 z" fill="#69707D" opacity="0.5" />
        </marker>
      </defs>

      {/* Links */}
      {topology.links.map((link) => {
        const src = NODE_POS[link.source]
        const dst = NODE_POS[link.target]
        if (!src || !dst) return null
        const color = utilizationColor(link.utilization)
        const strokeW = link.bandwidth_mbps >= 10000 ? 3.5 : 2
        const linkId = `link-${link.source}-${link.target}`
        const pct = Math.round(link.utilization * 100)
        // midpoint for label
        const mx = (src.x + dst.x) / 2
        const my = (src.y + dst.y) / 2

        return (
          <g key={linkId}>
            <path
              id={linkId}
              d={`M${src.x},${src.y} L${dst.x},${dst.y}`}
              stroke={color}
              strokeWidth={strokeW}
              fill="none"
              opacity={0.75}
            />
            {/* bandwidth label */}
            <text
              x={mx}
              y={my - 6}
              textAnchor="middle"
              fontSize="9"
              fill={color}
              opacity={0.9}
              fontFamily="monospace"
            >
              {pct}%
            </text>
            {/* animated traffic particles */}
            {[0, 1.2, 2.4].map((offset) => (
              <circle key={offset} r="2.5" fill="white" opacity="0.7">
                <animateMotion
                  dur={`${3 - link.utilization * 1.5}s`}
                  repeatCount="indefinite"
                  begin={`${offset}s`}
                >
                  <mpath href={`#${linkId}`} />
                </animateMotion>
              </circle>
            ))}
          </g>
        )
      })}

      {/* Nodes */}
      {topology.nodes.map((node) => {
        const pos = NODE_POS[node.id]
        if (!pos) return null
        const isSelected = selectedId === node.id
        const fill = TYPE_FILL[node.type] ?? '#69707D'
        const sColor = statusColor(node.status)
        const shortName = node.hostname.split('.')[0]
        const labelY = ICON_LABEL_Y[node.type] ?? 22

        return (
          <g
            key={node.id}
            transform={`translate(${pos.x},${pos.y})`}
            style={{ cursor: 'pointer' }}
            onClick={() => onSelect(isSelected ? null : node)}
          >
            {/* transparent hit area */}
            <ellipse rx="30" ry="24" fill="transparent" />

            {/* selection highlight */}
            {isSelected && (
              <ellipse rx="34" ry="28" fill="none" stroke="#0077CC" strokeWidth="2"
                strokeDasharray="5,3" opacity="0.85">
                <animate attributeName="rx" values="31;36;31" dur="2s" repeatCount="indefinite" />
              </ellipse>
            )}

            {/* Cisco device icon — standalone, no circle background */}
            <DeviceIcon type={node.type} fill={fill} />

            {/* status dot */}
            <circle cx="22" cy="-20" r="5" fill={sColor} stroke="white" strokeWidth="1.5" />

            {/* hostname label */}
            <text
              y={labelY}
              textAnchor="middle"
              fontSize="10"
              fill="var(--euiTextColor, #343741)"
              fontFamily="sans-serif"
            >
              {shortName}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

// ---------------------------------------------------------------------------
// Device detail panel
// ---------------------------------------------------------------------------

function DevicePanel({ device, onClose }: { device: NetworkDevice; onClose: () => void }) {
  return (
    <div>
      <EuiFlexGroup alignItems="center" justifyContent="spaceBetween" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiTitle size="xs"><h3>{device.hostname.split('.')[0]}</h3></EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiBadge
            color={device.status === 'healthy' ? 'success' : device.status === 'warning' ? 'warning' : 'danger'}
            style={{ textTransform: 'capitalize' }}
          >
            {device.status}
          </EuiBadge>
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiSpacer size="s" />
      <EuiText size="xs" color="subdued">
        <p style={{ fontFamily: 'monospace' }}>{device.ip}</p>
        <p>{device.vendor} {device.model}</p>
        <p>{device.location}</p>
        {device.uptime_days !== undefined && (
          <p>Uptime: {device.uptime_days} days</p>
        )}
      </EuiText>

      <EuiHorizontalRule margin="s" />

      <EuiText size="xs"><strong>CPU Utilisation</strong></EuiText>
      <EuiSpacer size="xs" />
      <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
        <EuiFlexItem>
          <EuiProgress
            value={device.cpu}
            max={100}
            size="s"
            color={device.cpu >= 90 ? 'danger' : device.cpu >= 75 ? 'warning' : 'success'}
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiText size="xs"><strong style={{ color: device.cpu >= 90 ? '#BD271E' : undefined }}>{device.cpu}%</strong></EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiSpacer size="s" />
      <EuiText size="xs"><strong>Memory Utilisation</strong></EuiText>
      <EuiSpacer size="xs" />
      <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
        <EuiFlexItem>
          <EuiProgress
            value={device.mem}
            max={100}
            size="s"
            color={device.mem >= 90 ? 'danger' : device.mem >= 75 ? 'warning' : 'success'}
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiText size="xs"><strong style={{ color: device.mem >= 90 ? '#BD271E' : undefined }}>{device.mem}%</strong></EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>

      {device.interfaces !== undefined && (
        <>
          <EuiSpacer size="s" />
          <EuiText size="xs" color="subdued">Interfaces: {device.interfaces}</EuiText>
        </>
      )}

      <EuiSpacer size="m" />
      <EuiText
        size="xs"
        style={{ cursor: 'pointer', color: '#0077CC' }}
        onClick={onClose}
      >
        ← Back to alerts
      </EuiText>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Alerts feed
// ---------------------------------------------------------------------------

const SEVERITY_COLOR: Record<string, 'danger' | 'warning' | 'primary'> = {
  critical: 'danger',
  warning: 'warning',
  info: 'primary',
}

const SEVERITY_ICON: Record<string, string> = {
  critical: 'alert',
  warning: 'warning',
  info: 'iInCircle',
}

function AlertsFeed({ alerts }: { alerts: NetworkAlert[] }) {
  return (
    <div>
      <EuiTitle size="xs"><h3>Recent Alerts</h3></EuiTitle>
      <EuiSpacer size="s" />
      {alerts.slice(0, 8).map((alert, i) => (
        <div key={i} style={{ marginBottom: 12 }}>
          <EuiFlexGroup gutterSize="xs" alignItems="flexStart" responsive={false}>
            <EuiFlexItem grow={false} style={{ paddingTop: 2 }}>
              <EuiIcon
                type={SEVERITY_ICON[alert.severity] ?? 'iInCircle'}
                color={SEVERITY_COLOR[alert.severity] ?? 'primary'}
                size="s"
              />
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiText size="xs">
                <strong style={{ fontFamily: 'monospace' }}>{alert.device}</strong>
                <br />
                {alert.message}
              </EuiText>
              <EuiText size="xs" color="subdued">
                {new Date(alert.timestamp).toLocaleTimeString()} · {alert.category}
              </EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
          {i < alerts.slice(0, 8).length - 1 && <EuiHorizontalRule margin="xs" />}
        </div>
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------------
// KPI cards row
// ---------------------------------------------------------------------------

function KpiCards({ topology, alerts }: { topology: Topology | null; alerts: NetworkAlert[] }) {
  const devices = topology?.nodes.filter((n) => n.type !== 'internet') ?? []
  const healthy = devices.filter((d) => d.status === 'healthy').length
  const warning = devices.filter((d) => d.status === 'warning').length
  const critical = devices.filter((d) => d.status === 'critical').length
  const criticalAlerts = alerts.filter((a) => a.severity === 'critical').length

  return (
    <EuiFlexGroup gutterSize="m" responsive={false} wrap>
      <EuiFlexItem>
        <EuiPanel paddingSize="m" hasShadow={false} hasBorder>
          <EuiStat
            title={String(devices.length)}
            description="Total Devices"
            titleColor="default"
            titleSize="m"
          />
        </EuiPanel>
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiPanel paddingSize="m" hasShadow={false} hasBorder>
          <EuiStat
            title={String(healthy)}
            description="Healthy"
            titleColor="success"
            titleSize="m"
          />
        </EuiPanel>
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiPanel paddingSize="m" hasShadow={false} hasBorder>
          <EuiStat
            title={String(warning)}
            description="Warning"
            titleColor="warning"
            titleSize="m"
          />
        </EuiPanel>
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiPanel paddingSize="m" hasShadow={false} hasBorder>
          <EuiStat
            title={String(critical)}
            description="Critical"
            titleColor="danger"
            titleSize="m"
          />
        </EuiPanel>
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiPanel paddingSize="m" hasShadow={false} hasBorder>
          <EuiStat
            title={String(criticalAlerts)}
            description="Open Alerts"
            titleColor={criticalAlerts > 0 ? 'danger' : 'success'}
            titleSize="m"
          />
        </EuiPanel>
      </EuiFlexItem>
    </EuiFlexGroup>
  )
}

// ---------------------------------------------------------------------------
// CDP/LLDP topology — hostname → node position key
// ---------------------------------------------------------------------------

const HOSTNAME_TO_ID: Record<string, string> = {
  'fw-01.corp.local':      'fw-01',
  'core-sw-01.corp.local': 'core-sw-01',
  'site-a-rtr.corp.local': 'site-a-rtr',
  'site-b-rtr.corp.local': 'site-b-rtr',
  'dmz-sw.corp.local':     'dmz-sw',
  'acc-sw-01.corp.local':  'acc-sw-01',
  'acc-sw-02.corp.local':  'acc-sw-02',
  'acc-sw-03.corp.local':  'acc-sw-03',
  'web-srv-01.corp.local': 'web-srv',
  'app-srv-01.corp.local': 'app-srv',
  'internet-edge':         'internet',
}

// Deduplicate bidirectional CDP/LLDP pairs — keep one canonical direction
function deduplicateCdpLinks(links: CdpLink[]): CdpLink[] {
  const seen = new Set<string>()
  return links.filter((link) => {
    const a = HOSTNAME_TO_ID[link.local_device] ?? link.local_device
    const b = HOSTNAME_TO_ID[link.neighbor_hostname] ?? link.neighbor_hostname
    const key = [a, b].sort().join('↔')
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

// ---------------------------------------------------------------------------
// CDP/LLDP SVG topology
// ---------------------------------------------------------------------------

interface CdpSvgProps {
  cdpTopology: CdpTopology
  topology: { nodes: { id: string; type: string }[] } | null
  selectedId: string | null
  onSelect: (id: string | null) => void
}

function CdpTopologySvg({ cdpTopology, topology, selectedId, onSelect }: CdpSvgProps) {
  const links = deduplicateCdpLinks(cdpTopology.links)
  const downLinks = new Set(
    cdpTopology.links.filter((l) => l.link_status === 'down').map(
      (l) => [HOSTNAME_TO_ID[l.local_device], HOSTNAME_TO_ID[l.neighbor_hostname]].sort().join('↔')
    )
  )
  const deviceTypes = Object.fromEntries(
    (topology?.nodes ?? []).map((n) => [n.id, n.type])
  )

  // All unique node IDs that appear in the CDP/LLDP data
  const nodeIds = new Set<string>()
  cdpTopology.links.forEach((l) => {
    const a = HOSTNAME_TO_ID[l.local_device]
    const b = HOSTNAME_TO_ID[l.neighbor_hostname]
    if (a) nodeIds.add(a)
    if (b) nodeIds.add(b)
  })

  return (
    <svg viewBox="0 0 900 570" style={{ width: '100%', height: 'auto', maxHeight: 520 }}>
      {/* Links */}
      {links.map((link, i) => {
        const srcId = HOSTNAME_TO_ID[link.local_device]
        const dstId = HOSTNAME_TO_ID[link.neighbor_hostname]
        const src = NODE_POS[srcId]
        const dst = NODE_POS[dstId]
        if (!src || !dst) return null

        const key = [srcId, dstId].sort().join('↔')
        const isDown = downLinks.has(key)
        const mx = (src.x + dst.x) / 2
        const my = (src.y + dst.y) / 2
        const stroke = isDown ? '#BD271E' : link.protocol === 'CDP' ? '#0077CC' : '#00BF9A'
        const linkId = `cdp-${i}`

        // Interface label positions: 25% and 75% along the line
        const lx1 = src.x + (dst.x - src.x) * 0.25
        const ly1 = src.y + (dst.y - src.y) * 0.25
        const lx2 = src.x + (dst.x - src.x) * 0.75
        const ly2 = src.y + (dst.y - src.y) * 0.75

        return (
          <g key={linkId}>
            <path
              id={linkId}
              d={`M${src.x},${src.y} L${dst.x},${dst.y}`}
              stroke={stroke}
              strokeWidth={isDown ? 2.5 : 2}
              strokeDasharray={isDown ? '8,5' : undefined}
              fill="none"
              opacity={0.8}
            />
            {/* Local interface label */}
            <text x={lx1} y={ly1 - 5} textAnchor="middle" fontSize="8"
              fill={stroke} fontFamily="monospace" opacity={0.85}>
              {abbreviateInterface(link.local_interface)}
            </text>
            {/* Remote interface label */}
            <text x={lx2} y={ly2 - 5} textAnchor="middle" fontSize="8"
              fill={stroke} fontFamily="monospace" opacity={0.85}>
              {abbreviateInterface(link.neighbor_interface)}
            </text>
            {/* Protocol badge at midpoint */}
            {!isDown ? (
              <g transform={`translate(${mx},${my})`}>
                <rect x="-13" y="-8" width="26" height="14" rx="3" fill={stroke} opacity={0.9} />
                <text textAnchor="middle" dominantBaseline="middle" fontSize="7"
                  fill="white" fontWeight="bold" fontFamily="monospace">
                  {link.protocol}
                </text>
              </g>
            ) : (
              /* Down indicator */
              <g transform={`translate(${mx},${my})`}>
                <circle r="10" fill="#BD271E" opacity={0.95} />
                <text textAnchor="middle" dominantBaseline="middle" fontSize="12" fill="white">✕</text>
                {/* Pulse animation on down links */}
                <circle r="10" fill="none" stroke="#BD271E" strokeWidth="2" opacity="0.6">
                  <animate attributeName="r" values="10;18;10" dur="2s" repeatCount="indefinite" />
                  <animate attributeName="opacity" values="0.6;0;0.6" dur="2s" repeatCount="indefinite" />
                </circle>
              </g>
            )}
            {/* Animated flow particles on up links */}
            {!isDown && [0, 1.5].map((offset) => (
              <circle key={offset} r="2.5" fill="white" opacity="0.6">
                <animateMotion dur="3s" repeatCount="indefinite" begin={`${offset}s`}>
                  <mpath href={`#${linkId}`} />
                </animateMotion>
              </circle>
            ))}
          </g>
        )
      })}

      {/* Nodes */}
      {Array.from(nodeIds).map((nodeId) => {
        const pos = NODE_POS[nodeId]
        if (!pos) return null
        const isSelected = selectedId === nodeId
        const type = deviceTypes[nodeId] ?? 'switch'
        const fill = TYPE_FILL[type] ?? '#69707D'
        const sColor = statusColor(
          downLinks.size > 0 && Array.from(downLinks).some((k) => k.includes(nodeId)) ? 'warning' : 'healthy'
        )
        const shortName = nodeId

        return (
          <g key={nodeId} transform={`translate(${pos.x},${pos.y})`}
            style={{ cursor: 'pointer' }}
            onClick={() => onSelect(isSelected ? null : nodeId)}>
            <ellipse rx="30" ry="24" fill="transparent" />
            {isSelected && (
              <ellipse rx="36" ry="30" fill="none" stroke="#0077CC" strokeWidth="2"
                strokeDasharray="5,3" opacity={0.85}>
                <animate attributeName="rx" values="33;38;33" dur="2s" repeatCount="indefinite" />
              </ellipse>
            )}
            <DeviceIcon type={type} fill={fill} />
            <circle cx="22" cy="-20" r="5" fill={sColor} stroke="white" strokeWidth="1.5" />
            <text y="32" textAnchor="middle" fontSize="10"
              fill="var(--euiTextColor, #343741)" fontFamily="sans-serif">
              {shortName}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

// ---------------------------------------------------------------------------
// CDP/LLDP device side panel
// ---------------------------------------------------------------------------

function CdpDevicePanel({
  deviceId,
  cdpLinks,
  onClose,
  onCrawl,
  crawling,
}: {
  deviceId: string
  cdpLinks: CdpLink[]
  onClose: () => void
  onCrawl: (deviceId: string, iface: string) => void
  crawling: boolean
}) {
  const myLinks = cdpLinks.filter(
    (l) => HOSTNAME_TO_ID[l.local_device] === deviceId || HOSTNAME_TO_ID[l.neighbor_hostname] === deviceId
  )
  const normalised = myLinks.map((l) => {
    if (HOSTNAME_TO_ID[l.local_device] === deviceId) return l
    // Flip the bidirectional entry so local_device is always our device
    return {
      ...l,
      local_device: l.neighbor_hostname,
      local_interface: l.neighbor_interface,
      neighbor_hostname: l.local_device,
      neighbor_interface: l.local_interface,
    }
  })
  // Deduplicate
  const seen = new Set<string>()
  const dedupedInterfaces = normalised.filter((l) => {
    const k = l.local_interface + l.neighbor_hostname
    if (seen.has(k)) return false
    seen.add(k)
    return true
  })
  const hasDown = dedupedInterfaces.some((l) => l.link_status === 'down')

  return (
    <div>
      <EuiFlexGroup alignItems="center" justifyContent="spaceBetween" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiTitle size="xs"><h3>{deviceId}</h3></EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiBadge color="hollow">{dedupedInterfaces.length} interfaces</EuiBadge>
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiSpacer size="s" />
      <EuiText size="xs" color="subdued">CDP/LLDP discovered neighbours</EuiText>
      <EuiSpacer size="s" />
      <EuiHorizontalRule margin="xs" />

      {dedupedInterfaces.map((l, i) => (
        <div key={i}>
          <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false} style={{ padding: '4px 0' }}>
            <EuiFlexItem grow={false} style={{ minWidth: 52 }}>
              <EuiText size="xs" style={{ fontFamily: 'monospace', fontSize: 10 }}>
                {abbreviateInterface(l.local_interface)}
              </EuiText>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiBadge color={l.protocol === 'CDP' ? 'primary' : 'accent'} style={{ fontSize: 9 }}>
                {l.protocol}
              </EuiBadge>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiText size="xs" style={{ fontFamily: 'monospace', fontSize: 10 }}>
                {l.neighbor_hostname.split('.')[0]}
                <span style={{ color: 'var(--euiColorSubduedText)' }}>
                  {' '}→ {abbreviateInterface(l.neighbor_interface)}
                </span>
              </EuiText>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiBadge color={l.link_status === 'up' ? 'success' : 'danger'}>
                {l.link_status}
              </EuiBadge>
            </EuiFlexItem>
          </EuiFlexGroup>
          {i < dedupedInterfaces.length - 1 && <EuiHorizontalRule margin="xs" />}
        </div>
      ))}

      {dedupedInterfaces.length === 0 && (
        <EuiText size="xs" color="subdued">No CDP/LLDP neighbours found for this device.</EuiText>
      )}

      {hasDown && (
        <>
          <EuiSpacer size="m" />
          <EuiButton
            size="s"
            color="danger"
            iconType="refresh"
            isLoading={crawling}
            onClick={() => {
              const downLink = dedupedInterfaces.find((l) => l.link_status === 'down')
              if (downLink) onCrawl(deviceId, downLink.local_interface)
            }}
          >
            Re-crawl topology
          </EuiButton>
        </>
      )}

      <EuiSpacer size="m" />
      <EuiText size="xs" style={{ cursor: 'pointer', color: '#0077CC' }} onClick={onClose}>
        ← Back
      </EuiText>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Legend
// ---------------------------------------------------------------------------

function Legend() {
  return (
    <EuiFlexGroup gutterSize="l" responsive={false} wrap alignItems="center">
      <EuiFlexItem grow={false}>
        <EuiText size="xs" color="subdued"><strong>Device type:</strong></EuiText>
      </EuiFlexItem>
      {Object.entries(TYPE_FILL).map(([type, color]) => (
        <EuiFlexItem key={type} grow={false}>
          <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
            <EuiFlexItem grow={false}>
              <svg width="18" height="14" viewBox="-9 -7 18 14">
                <DeviceIcon type={type} fill={color} />
              </svg>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiText size="xs" style={{ textTransform: 'capitalize' }}>{type}</EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      ))}
      <EuiFlexItem grow={false}>
        <EuiText size="xs" color="subdued" style={{ marginLeft: 16 }}><strong>Link load:</strong></EuiText>
      </EuiFlexItem>
      {[['<50%', '#00BF9A'], ['50-75%', '#FEC514'], ['75-90%', '#F0861A'], ['>90%', '#BD271E']].map(([label, color]) => (
        <EuiFlexItem key={label} grow={false}>
          <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
            <EuiFlexItem grow={false}>
              <div style={{ width: 16, height: 3, background: color, borderRadius: 2 }} />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiText size="xs">{label}</EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      ))}
    </EuiFlexGroup>
  )
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

const VIEW_OPTIONS = [
  { id: 'topology', label: 'NOC Topology' },
  { id: 'cdp-lldp', label: 'CDP/LLDP Map' },
]

export function NetworkTopologyPage() {
  const [topology, setTopology] = useState<Topology | null>(null)
  const [alerts, setAlerts] = useState<NetworkAlert[]>([])
  const [selectedDevice, setSelectedDevice] = useState<NetworkDevice | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string>()

  // CDP/LLDP view state
  const [viewMode, setViewMode] = useState<'topology' | 'cdp-lldp'>('topology')
  const [cdpTopology, setCdpTopology] = useState<CdpTopology | null>(null)
  const [cdpLoading, setCdpLoading] = useState(false)
  const [cdpSelectedId, setCdpSelectedId] = useState<string | null>(null)
  const [crawling, setCrawling] = useState(false)

  const load = useCallback(async () => {
    try {
      const [topo, alertData] = await Promise.all([fetchTopology(), fetchAlerts()])
      setTopology(topo)
      setAlerts(alertData.alerts)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load topology')
    } finally {
      setLoading(false)
    }
  }, [])

  const loadCdp = useCallback(async () => {
    setCdpLoading(true)
    try {
      const data = await fetchCdpTopology()
      setCdpTopology(data)
    } catch {
      // falls back to demo data from API
    } finally {
      setCdpLoading(false)
    }
  }, [])

  const handleCrawl = useCallback(async (deviceId: string, iface: string) => {
    setCrawling(true)
    try {
      await triggerCdpCrawl(deviceId, iface)
      await loadCdp()
    } finally {
      setCrawling(false)
    }
  }, [loadCdp])

  useEffect(() => {
    load()
    const interval = setInterval(load, 30_000)
    return () => clearInterval(interval)
  }, [load])

  useEffect(() => {
    if (viewMode === 'cdp-lldp') loadCdp()
  }, [viewMode, loadCdp])

  return (
    <>
      <EuiSpacer size="xxl" />
      <EuiSpacer size="l" />

      <EuiPageTemplate panelled={false} grow restrictWidth={1300}>
        <EuiPageTemplate.Header
          pageTitle="Network Operations Center"
          description={
            viewMode === 'cdp-lldp'
              ? 'CDP/LLDP discovered topology — real adjacency data from netcrawl. Down links pulse red.'
              : 'Live topology — click a device to inspect health metrics. Link colour indicates utilisation.'
          }
          rightSideItems={[
            <EuiButtonGroup
              key="view"
              legend="View mode"
              options={VIEW_OPTIONS}
              idSelected={viewMode}
              onChange={(id) => {
                setViewMode(id as 'topology' | 'cdp-lldp')
                setCdpSelectedId(null)
                setSelectedDevice(null)
              }}
              buttonSize="compressed"
            />,
            <EuiBadge key="live" color="success" iconType="dot">Live</EuiBadge>,
          ]}
        />

        <EuiPageTemplate.Section>
          {error && (
            <>
              <EuiBadge color="danger">{error}</EuiBadge>
              <EuiSpacer size="m" />
            </>
          )}

          <KpiCards topology={topology} alerts={alerts} />

          <EuiSpacer size="l" />

          <EuiFlexGroup gutterSize="m" alignItems="flexStart" responsive={false}>
            {/* Topology canvas */}
            <EuiFlexItem grow={7}>
              <EuiPanel paddingSize="m" hasBorder hasShadow={false}>
                <EuiFlexGroup alignItems="center" justifyContent="spaceBetween" responsive={false}>
                  <EuiFlexItem grow={false}>
                    <EuiTitle size="xs">
                      <h2>{viewMode === 'cdp-lldp' ? 'CDP/LLDP Discovered Topology' : 'Network Topology'}</h2>
                    </EuiTitle>
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
                      {viewMode === 'cdp-lldp' && cdpTopology && (
                        <EuiFlexItem grow={false}>
                          <EuiBadge color={cdpTopology.source === 'elasticsearch' ? 'success' : 'warning'}>
                            {cdpTopology.source === 'elasticsearch' ? 'Live ES data' : 'Demo data'}
                          </EuiBadge>
                        </EuiFlexItem>
                      )}
                      <EuiFlexItem grow={false}>
                        <EuiText size="xs" color="subdued">Click a node to inspect</EuiText>
                      </EuiFlexItem>
                    </EuiFlexGroup>
                  </EuiFlexItem>
                </EuiFlexGroup>

                <EuiSpacer size="s" />
                <EuiHorizontalRule margin="xs" />
                <EuiSpacer size="xs" />

                {viewMode === 'topology' ? (
                  loading ? (
                    <EuiFlexGroup justifyContent="center" style={{ padding: 60 }}>
                      <EuiLoadingSpinner size="xl" />
                    </EuiFlexGroup>
                  ) : topology ? (
                    <TopologySvg
                      topology={topology}
                      selectedId={selectedDevice?.id ?? null}
                      onSelect={setSelectedDevice}
                    />
                  ) : null
                ) : (
                  cdpLoading ? (
                    <EuiFlexGroup justifyContent="center" style={{ padding: 60 }}>
                      <EuiLoadingSpinner size="xl" />
                    </EuiFlexGroup>
                  ) : cdpTopology ? (
                    <CdpTopologySvg
                      cdpTopology={cdpTopology}
                      topology={topology}
                      selectedId={cdpSelectedId}
                      onSelect={setCdpSelectedId}
                    />
                  ) : null
                )}

                <EuiSpacer size="s" />
                {viewMode === 'topology' ? (
                  <Legend />
                ) : (
                  <EuiFlexGroup gutterSize="l" responsive={false} wrap alignItems="center">
                    {[['CDP', '#0077CC'], ['LLDP', '#00BF9A'], ['Down', '#BD271E']].map(([label, color]) => (
                      <EuiFlexItem key={label} grow={false}>
                        <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
                          <EuiFlexItem grow={false}>
                            <div style={{
                              width: 16, height: 3, borderRadius: 2,
                              background: label === 'Down' ? 'transparent' : color,
                              borderTop: label === 'Down' ? `3px dashed ${color}` : undefined,
                            }} />
                          </EuiFlexItem>
                          <EuiFlexItem grow={false}>
                            <EuiText size="xs">{label} link</EuiText>
                          </EuiFlexItem>
                        </EuiFlexGroup>
                      </EuiFlexItem>
                    ))}
                    <EuiFlexItem grow={false}>
                      <EuiText size="xs" color="subdued">
                        Labels show interface names · ✕ = link down
                      </EuiText>
                    </EuiFlexItem>
                  </EuiFlexGroup>
                )}
              </EuiPanel>
            </EuiFlexItem>

            {/* Side panel */}
            <EuiFlexItem grow={3}>
              <EuiPanel paddingSize="m" hasBorder hasShadow={false} style={{ minHeight: 400 }}>
                {viewMode === 'topology' ? (
                  selectedDevice ? (
                    <DevicePanel device={selectedDevice} onClose={() => setSelectedDevice(null)} />
                  ) : (
                    <AlertsFeed alerts={alerts} />
                  )
                ) : (
                  cdpSelectedId && cdpTopology ? (
                    <CdpDevicePanel
                      deviceId={cdpSelectedId}
                      cdpLinks={cdpTopology.links}
                      onClose={() => setCdpSelectedId(null)}
                      onCrawl={handleCrawl}
                      crawling={crawling}
                    />
                  ) : (
                    <div>
                      <EuiTitle size="xs"><h3>CDP/LLDP Summary</h3></EuiTitle>
                      <EuiSpacer size="s" />
                      {cdpTopology && (
                        <>
                          <EuiStat
                            title={String(new Set(cdpTopology.links.map(l => l.local_device)).size)}
                            description="Devices crawled"
                            titleSize="m"
                          />
                          <EuiSpacer size="s" />
                          <EuiStat
                            title={String(deduplicateCdpLinks(cdpTopology.links).length)}
                            description="Unique adjacencies"
                            titleSize="m"
                          />
                          <EuiSpacer size="s" />
                          <EuiStat
                            title={String(cdpTopology.links.filter(l => l.link_status === 'down').length)}
                            description="Links down"
                            titleColor={cdpTopology.links.some(l => l.link_status === 'down') ? 'danger' : 'success'}
                            titleSize="m"
                          />
                          <EuiSpacer size="m" />
                          <EuiText size="xs" color="subdued">
                            Source: {cdpTopology.source}<br />
                            Protocol mix: {[...new Set(cdpTopology.links.map(l => l.protocol))].join(' · ')}
                          </EuiText>
                        </>
                      )}
                      <EuiSpacer size="m" />
                      <EuiText size="xs" color="subdued">Click a node to see its CDP/LLDP interfaces.</EuiText>
                    </div>
                  )
                )}
              </EuiPanel>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiPageTemplate.Section>
      </EuiPageTemplate>

      <FloatingChatWidget
        title="NOC Assistant"
        greeting="I'm your Network Operations Assistant. I can analyse alerts, correlate events across NetFlow, SNMP, and syslog, and help with root cause analysis or incident response."
        placeholder="Ask about an alert, device, or network event..."
        position="bottom-right"
      />
    </>
  )
}
