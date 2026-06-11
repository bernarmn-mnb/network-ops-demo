import { useState, useEffect, useCallback } from 'react'
import {
  EuiPageTemplate, EuiFlexGroup, EuiFlexItem, EuiPanel, EuiTitle,
  EuiSpacer, EuiBadge, EuiText, EuiLoadingSpinner, EuiStat,
  EuiHorizontalRule, EuiButtonGroup, EuiButton, EuiButtonEmpty,
  EuiBasicTable, EuiCallOut, type EuiBasicTableColumn,
} from '@elastic/eui'
import { API_PREFIX } from '../services/apiBase'
import { formatFlows } from '../services/networkApi'
import { FloatingChatWidget } from '../components/chat/FloatingChatWidget'

const BASE = `${API_PREFIX}/api/network/meraki`

// Kibana base URL and the 'cisco' data view (covers *cisco* — all Meraki + NetFlow)
const KB = 'https://home-depot.kb.us-central1.gcp.cloud.es.io'
const CISCO_DATA_VIEW = 'dba0a79a-eb25-4fbc-a096-5d74fb915de2'
const KB_SYSLOG_DASH  = `${KB}/app/dashboards#/view/cisco_meraki-4832a430-af22-11ec-a899-6f7e676e0fb4`
const KB_HEALTH_DASH  = `${KB}/app/dashboards#/view/cisco_meraki_metrics-d6b9863a-88e2-4e3d-a2a7-36ca1ee525b1`

/** Build a Kibana Discover URL with a pre-applied KQL filter. */
function buildDiscoverUrl(kql: string, timeRange = 'now-24h'): string {
  const g = encodeURIComponent(`(time:(from:${timeRange},to:now))`)
  const a = encodeURIComponent(
    `(dataSource:(dataViewId:'${CISCO_DATA_VIEW}',type:dataView),` +
    `query:(language:kuery,query:'${kql.replace(/'/g, "\\'")}'))`
  )
  return `${KB}/app/discover#/?_g=${g}&_a=${a}`
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface MerakiStats {
  total_events: number
  unique_src: number
  unique_devices: number
  security_count: number
  url_count: number
  airmarshal_count: number
  by_event_type: Array<{ key: string; count: number }>
  by_event_action: Array<{ key: string; count: number }>
  top_devices: Array<{ key: string; count: number }>
  top_src_ip: Array<{ key: string; count: number }>
  top_domains: Array<{ key: string; count: number }>
  top_dst_ip: Array<{ key: string; count: number }>
  timeline: Array<{ timestamp: string; count: number }>
  security_events: Array<Record<string, unknown>>
  airmarshal_events: Array<Record<string, unknown>>
  data_source: string
  index: string
}

interface MerakiDevice {
  name: string
  model: string
  product_type: string
  lan_ip: string
  mac: string
  serial: string
  firmware: string
  last_seen: string
  event_count: number
}

interface KibanaDashboard { id: string; title: string; url: string }

// ---------------------------------------------------------------------------
// Device type badge
// ---------------------------------------------------------------------------

const TYPE_COLOR: Record<string, 'primary' | 'success' | 'warning' | 'accent'> = {
  appliance: 'primary', wireless: 'success', switch: 'accent',
  camera: 'warning', other: 'primary',
}

const TYPE_ICON: Record<string, string> = {
  appliance: '🔥', wireless: '📶', switch: '🔀', camera: '📷',
}

// ---------------------------------------------------------------------------
// Mini charts
// ---------------------------------------------------------------------------

function TimelineChart({ data, height = 100 }: { data: Array<{ timestamp: string; count: number }>; height?: number }) {
  if (!data.length) return null
  const pad = { t: 6, r: 8, b: 20, l: 40 }
  const W = 560 - pad.l - pad.r
  const H = height - pad.t - pad.b
  const max = Math.max(...data.map(d => d.count), 1)
  const pts = data.map((d, i) => [
    (i / Math.max(data.length - 1, 1)) * W,
    H - (d.count / max) * H,
  ])
  const area = `M${pts.map(p => p.join(',')).join(' L')} L${pts[pts.length - 1][0]},${H} L0,${H} Z`
  const line = `M${pts.map(p => p.join(',')).join(' L')}`
  const labels = [0, Math.floor(data.length / 2), data.length - 1]
  return (
    <svg viewBox={`0 0 ${560} ${height}`} style={{ width: '100%', height }}>
      <g transform={`translate(${pad.l},${pad.t})`}>
        {[0, 0.5, 1].map(f => (
          <line key={f} x1={0} y1={H * (1 - f)} x2={W} y2={H * (1 - f)}
            stroke="#E0E6F0" strokeWidth={0.5} />
        ))}
        <path d={area} fill="#00BF9A" opacity={0.15} />
        <path d={line} fill="none" stroke="#00BF9A" strokeWidth={1.5} />
        {[0, 0.5, 1].map(f => (
          <text key={f} x={-4} y={H * (1 - f) + 4} textAnchor="end" fontSize={9} fill="#69707D">
            {formatFlows(Math.round(max * f))}
          </text>
        ))}
        {labels.map(i => (
          <text key={i} x={(i / Math.max(data.length - 1, 1)) * W} y={H + 14}
            textAnchor="middle" fontSize={9} fill="#69707D">
            {new Date(data[i].timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </text>
        ))}
      </g>
    </svg>
  )
}

function HorizBars({ data, max, color = '#00BF9A', truncate = 22, onRowClick }: {
  data: Array<{ key: string; count: number }>
  max: number
  color?: string
  truncate?: number
  onRowClick?: (key: string) => void
}) {
  return (
    <div>
      {data.slice(0, 8).map(({ key, count }) => {
        const pct   = max > 0 ? (count / max) * 100 : 0
        const label = key.length > truncate ? key.slice(0, truncate - 1) + '…' : key
        const clickable = !!onRowClick
        return (
          <div
            key={key}
            style={{ marginBottom: 5, cursor: clickable ? 'pointer' : 'default',
                     borderRadius: 4, padding: '2px 4px',
                     transition: 'background 0.1s' }}
            onClick={clickable ? () => onRowClick(key) : undefined}
            title={clickable ? `Open "${key}" in Kibana Discover` : key}
            onMouseEnter={e => { if (clickable) (e.currentTarget as HTMLDivElement).style.background = '#F0F4F8' }}
            onMouseLeave={e => { if (clickable) (e.currentTarget as HTMLDivElement).style.background = '' }}
          >
            <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
              <EuiFlexItem style={{ minWidth: 130, maxWidth: 160 }}>
                <EuiText size="xs"
                  style={{ fontFamily: 'monospace', fontSize: 11,
                           color: clickable ? '#0077CC' : undefined,
                           textDecoration: clickable ? 'underline' : undefined }}
                  title={key}>
                  {label}
                </EuiText>
              </EuiFlexItem>
              <EuiFlexItem>
                <div style={{ background: '#F5F7FA', borderRadius: 3, height: 8 }}>
                  <div style={{ width: `${pct}%`, background: color, height: '100%', borderRadius: 3, minWidth: 2 }} />
                </div>
              </EuiFlexItem>
              <EuiFlexItem grow={false} style={{ minWidth: 55, textAlign: 'right' }}>
                <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
                  <EuiFlexItem grow={false}>
                    <EuiText size="xs" color="subdued">{formatFlows(count)}</EuiText>
                  </EuiFlexItem>
                  {clickable && (
                    <EuiFlexItem grow={false}>
                      <span style={{ fontSize: 10, color: '#0077CC' }}>↗</span>
                    </EuiFlexItem>
                  )}
                </EuiFlexGroup>
              </EuiFlexItem>
            </EuiFlexGroup>
          </div>
        )
      })}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Device table
// ---------------------------------------------------------------------------

const DEVICE_COLS: Array<EuiBasicTableColumn<MerakiDevice>> = [
  {
    field: 'product_type', name: '', width: '28px',
    render: (t: string) => <span title={t}>{TYPE_ICON[t] ?? '📦'}</span>,
  },
  {
    field: 'name', name: 'Device',
    render: (n: string) => <strong style={{ fontFamily: 'monospace', fontSize: 12 }}>{n}</strong>,
  },
  {
    field: 'model', name: 'Model',
    render: (m: string) => <EuiBadge color="hollow">{m}</EuiBadge>,
  },
  {
    field: 'product_type', name: 'Type',
    render: (t: string) => (
      <EuiBadge color={TYPE_COLOR[t] ?? 'primary'} style={{ textTransform: 'capitalize' }}>{t}</EuiBadge>
    ),
  },
  {
    field: 'lan_ip', name: 'LAN IP',
    render: (ip: string) => <span style={{ fontFamily: 'monospace', fontSize: 12 }}>{ip}</span>,
  },
  { field: 'mac',     name: 'MAC',      render: (m: string) => <span style={{ fontFamily: 'monospace', fontSize: 11, color: '#69707D' }}>{m}</span> },
  { field: 'serial',  name: 'Serial',   render: (s: string) => <EuiText size="xs">{s}</EuiText> },
  { field: 'firmware',name: 'Firmware', render: (f: string) => <EuiText size="xs" color="subdued">{f}</EuiText> },
  {
    field: 'event_count', name: 'Events',
    render: (c: number) => <strong>{formatFlows(c)}</strong>,
  },
]

// ---------------------------------------------------------------------------
// Kibana links bar
// ---------------------------------------------------------------------------

function KibanaDashboardBar({ dashboards }: { dashboards: KibanaDashboard[] }) {
  return (
    <EuiPanel paddingSize="s" hasBorder hasShadow={false} color="subdued">
      <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false} wrap>
        <EuiFlexItem grow={false}>
          <EuiText size="xs" color="subdued"><strong>Open in Kibana:</strong></EuiText>
        </EuiFlexItem>
        {dashboards.map(d => (
          <EuiFlexItem key={d.id} grow={false}>
            <EuiButtonEmpty size="xs" iconType="dashboardApp"
              href={d.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11 }}>
              {d.title.replace('[Logs Cisco Meraki] ', '').replace('[Metrics Cisco Meraki] ', '')}
            </EuiButtonEmpty>
          </EuiFlexItem>
        ))}
      </EuiFlexGroup>
    </EuiPanel>
  )
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

const TIME_OPTIONS = [
  { id: '1h',  label: '1h'  },
  { id: '6h',  label: '6h'  },
  { id: '24h', label: '24h' },
  { id: '7d',  label: '7d'  },
]

export function MerakiAnalysisPage() {
  const [stats,      setStats]      = useState<MerakiStats | null>(null)
  const [devices,    setDevices]    = useState<MerakiDevice[]>([])
  const [dashboards, setDashboards] = useState<KibanaDashboard[]>([])
  const [loading,    setLoading]    = useState(true)
  const [timeRange,  setTimeRange]  = useState('24h')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [s, d, db] = await Promise.all([
        fetch(`${BASE}/stats?time_range=${timeRange}`).then(r => r.json()),
        fetch(`${BASE}/devices`).then(r => r.json()),
        fetch(`${BASE}/dashboards`).then(r => r.json()),
      ])
      setStats(s)
      setDevices(d.devices ?? [])
      setDashboards(Array.isArray(db) ? db : [])
    } catch { /* fallback */ }
    finally { setLoading(false) }
  }, [timeRange])

  useEffect(() => { load() }, [load])

  const maxDevice  = Math.max(...(stats?.top_devices  ?? []).map(d => d.count), 1)
  const maxSrc     = Math.max(...(stats?.top_src_ip   ?? []).map(d => d.count), 1)
  const maxDomain  = Math.max(...(stats?.top_domains  ?? []).map(d => d.count), 1)
  const maxEvType  = Math.max(...(stats?.by_event_type ?? []).map(d => d.count), 1)

  const syslogDash = dashboards.find(d => d.id === 'syslog_overview')

  return (
    <>
      <EuiSpacer size="xxl" />
      <EuiSpacer size="l" />

      <EuiPageTemplate panelled={false} grow restrictWidth={1400}>
        <EuiPageTemplate.Header
          pageTitle="Meraki Analysis"
          description={`Cisco Meraki event logs, URL filtering, security events, and device inventory · ${stats?.data_source === 'real' ? 'Live data' : 'Demo data'}`}
          rightSideItems={[
            syslogDash && (
              <EuiButton key="kibana" iconType="popout" size="s"
                href={syslogDash.url} target="_blank" rel="noopener noreferrer">
                Open in Kibana
              </EuiButton>
            ),
            <EuiButtonGroup key="time" legend="Time range" options={TIME_OPTIONS}
              idSelected={timeRange} onChange={setTimeRange} buttonSize="compressed" />,
          ].filter(Boolean)}
        />

        <EuiPageTemplate.Section>
          {dashboards.length > 0 && <KibanaDashboardBar dashboards={dashboards} />}
          <EuiSpacer size="m" />

          {loading ? (
            <EuiFlexGroup justifyContent="center" style={{ padding: 80 }}>
              <EuiLoadingSpinner size="xl" />
            </EuiFlexGroup>
          ) : !stats ? null : (
            <>
              {/* ── KPI row — each card links to the relevant Kibana dashboard ── */}
              <EuiFlexGroup gutterSize="m" responsive={false} wrap>
                {[
                  { title: formatFlows(stats.total_events),   desc: 'Total Events',       color: 'primary', href: KB_SYSLOG_DASH },
                  { title: formatFlows(stats.url_count),      desc: 'URL Events',         color: 'primary', href: buildDiscoverUrl('cisco_meraki.event_type : "urls"') },
                  { title: String(stats.unique_src),          desc: 'Unique Clients',     color: 'success', href: buildDiscoverUrl('source.ip : *') },
                  { title: String(stats.unique_devices),      desc: 'Active Devices',     color: 'success', href: KB_HEALTH_DASH },
                  { title: String(stats.security_count),      desc: 'Security Alerts',
                    color: stats.security_count > 0 ? 'danger' : 'success',
                    href: buildDiscoverUrl('cisco_meraki.event_type : "ids_alerted" or cisco_meraki.event_type : "security_event"') },
                  { title: String(stats.airmarshal_count),    desc: 'Air Marshal Events',
                    color: stats.airmarshal_count > 0 ? 'warning' : 'success',
                    href: buildDiscoverUrl('cisco_meraki.event_type : "airmarshal_events"') },
                ].map(({ title, desc, color, href }) => (
                  <EuiFlexItem key={desc}>
                    <EuiPanel
                      paddingSize="m" hasBorder hasShadow={false}
                      style={{ cursor: 'pointer', transition: 'box-shadow 0.15s' }}
                      onClick={() => window.open(href, '_blank', 'noopener,noreferrer')}
                      title={`Open "${desc}" in Kibana`}
                    >
                      <EuiStat title={title} description={desc}
                        titleColor={color as 'primary'} titleSize="m" />
                      <EuiText size="xs" color="subdued" style={{ marginTop: 4 }}>
                        ↗ Open in Kibana
                      </EuiText>
                    </EuiPanel>
                  </EuiFlexItem>
                ))}
              </EuiFlexGroup>

              {/* Security alert callout */}
              {stats.security_count > 0 && (
                <>
                  <EuiSpacer size="m" />
                  <EuiCallOut title={`${stats.security_count} security events detected`}
                    color="danger" iconType="alert">
                    <EuiText size="s">IDS alerts, security events, or Air Marshal detections in the selected period.</EuiText>
                  </EuiCallOut>
                </>
              )}

              <EuiSpacer size="l" />

              {/* ── Timeline + Event types ── */}
              <EuiFlexGroup gutterSize="m" alignItems="flexStart" responsive={false}>
                <EuiFlexItem grow={6}>
                  <EuiPanel paddingSize="m" hasBorder hasShadow={false}>
                    <EuiTitle size="xs"><h3>Events Over Time</h3></EuiTitle>
                    <EuiText size="xs" color="subdued">Events per hour</EuiText>
                    <EuiSpacer size="s" />
                    <TimelineChart data={stats.timeline} height={110} />
                  </EuiPanel>
                </EuiFlexItem>
                <EuiFlexItem grow={3}>
                  <EuiPanel paddingSize="m" hasBorder hasShadow={false} style={{ height: '100%' }}>
                    <EuiTitle size="xs"><h3>By Event Type</h3></EuiTitle>
                    <EuiSpacer size="s" />
                    <HorizBars data={stats.by_event_type} max={maxEvType} color="#00BF9A"
                      onRowClick={k => window.open(buildDiscoverUrl(`cisco_meraki.event_type : "${k}"`), '_blank', 'noopener,noreferrer')} />
                  </EuiPanel>
                </EuiFlexItem>
                <EuiFlexItem grow={3}>
                  <EuiPanel paddingSize="m" hasBorder hasShadow={false} style={{ height: '100%' }}>
                    <EuiTitle size="xs"><h3>Top Active Devices</h3></EuiTitle>
                    <EuiSpacer size="s" />
                    <HorizBars data={stats.top_devices} max={maxDevice} color="#7B61FF"
                      onRowClick={k => window.open(buildDiscoverUrl(`observer.hostname : "${k}"`), '_blank', 'noopener,noreferrer')} />
                  </EuiPanel>
                </EuiFlexItem>
              </EuiFlexGroup>

              <EuiSpacer size="l" />

              {/* ── Top sources + Top domains ── */}
              <EuiFlexGroup gutterSize="m" alignItems="flexStart" responsive={false}>
                <EuiFlexItem>
                  <EuiPanel paddingSize="m" hasBorder hasShadow={false}>
                    <EuiTitle size="xs"><h3>Top Source IPs (Clients)</h3></EuiTitle>
                    <EuiSpacer size="s" />
                    <HorizBars data={stats.top_src_ip} max={maxSrc} color="#0077CC"
                      onRowClick={k => window.open(buildDiscoverUrl(`source.ip : "${k}"`), '_blank', 'noopener,noreferrer')} />
                  </EuiPanel>
                </EuiFlexItem>
                <EuiFlexItem grow={2}>
                  <EuiPanel paddingSize="m" hasBorder hasShadow={false}>
                    <EuiTitle size="xs"><h3>Top Domains (URL Filtering)</h3></EuiTitle>
                    <EuiSpacer size="s" />
                    <HorizBars data={stats.top_domains} max={maxDomain} color="#F5A700" truncate={40}
                      onRowClick={k => window.open(buildDiscoverUrl(`url.domain : "${k}"`), '_blank', 'noopener,noreferrer')} />
                  </EuiPanel>
                </EuiFlexItem>
              </EuiFlexGroup>

              <EuiSpacer size="l" />

              {/* ── Device inventory ── */}
              <EuiPanel paddingSize="m" hasBorder hasShadow={false}>
                <EuiFlexGroup alignItems="center" justifyContent="spaceBetween" responsive={false}>
                  <EuiFlexItem grow={false}>
                    <EuiTitle size="xs"><h3>Meraki Device Inventory</h3></EuiTitle>
                    <EuiText size="xs" color="subdued">
                      Switches · Appliances · Access Points · Cameras
                    </EuiText>
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    {dashboards.find(d => d.id === 'device_health') && (
                      <EuiButtonEmpty size="xs" iconType="popout"
                        href={dashboards.find(d => d.id === 'device_health')!.url}
                        target="_blank" rel="noopener noreferrer">
                        Device Health in Kibana
                      </EuiButtonEmpty>
                    )}
                  </EuiFlexItem>
                </EuiFlexGroup>
                <EuiHorizontalRule margin="xs" />
                {devices.length > 0 ? (
                  <EuiBasicTable
                    items={devices}
                    columns={DEVICE_COLS}
                    tableLayout="auto"
                    rowProps={(d) => ({
                      style: {
                        cursor: 'pointer',
                        background: d.firmware?.toLowerCase().includes('not running')
                          ? 'rgba(254,197,20,0.06)' : undefined,
                      },
                      onClick: () => window.open(
                        buildDiscoverUrl(`observer.hostname : "${d.name}"`),
                        '_blank', 'noopener,noreferrer'
                      ),
                      title: `Open events for ${d.name} in Kibana Discover`,
                    })}
                  />
                ) : (
                  <EuiText size="s" color="subdued" style={{ padding: 20, textAlign: 'center' }}>
                    No device health data available for the selected period.
                  </EuiText>
                )}
              </EuiPanel>

              {/* Air Marshal events */}
              {stats.airmarshal_events.length > 0 && (
                <>
                  <EuiSpacer size="l" />
                  <EuiPanel paddingSize="m" hasBorder hasShadow={false}>
                    <EuiTitle size="xs"><h3>Air Marshal Events (Rogue AP Detection)</h3></EuiTitle>
                    <EuiSpacer size="s" />
                    {stats.airmarshal_events.map((e, i) => (
                      <div key={i}>
                        <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
                          <EuiFlexItem grow={false}>
                            <EuiBadge color="warning" iconType="alert">Air Marshal</EuiBadge>
                          </EuiFlexItem>
                          <EuiFlexItem grow={false}>
                            <EuiText size="xs" style={{ fontFamily: 'monospace' }}>
                              {String((e as Record<string, unknown>)['observer.hostname'] ?? '')}
                            </EuiText>
                          </EuiFlexItem>
                          <EuiFlexItem>
                            <EuiText size="xs">{String((e as Record<string, unknown>)['message'] ?? '')}</EuiText>
                          </EuiFlexItem>
                        </EuiFlexGroup>
                        {i < stats.airmarshal_events.length - 1 && <EuiHorizontalRule margin="xs" />}
                      </div>
                    ))}
                  </EuiPanel>
                </>
              )}

              <EuiSpacer size="s" />
              <EuiText size="xs" color="subdued">
                Data source: <strong>{stats.index}</strong> ·
                {stats.data_source === 'real'
                  ? ' Real Cisco Meraki event logs'
                  : ' Synthetic demo data'}
              </EuiText>
            </>
          )}
        </EuiPageTemplate.Section>
      </EuiPageTemplate>

      <FloatingChatWidget
        title="NOC Assistant"
        greeting="I can help you analyse Meraki events, investigate security alerts, identify active clients, or review device health."
        placeholder="Ask about Meraki events, top clients, or security alerts…"
        position="bottom-right"
      />
    </>
  )
}
