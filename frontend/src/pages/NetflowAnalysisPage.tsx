import { useState, useEffect, useCallback } from 'react'
import {
  EuiPageTemplate, EuiFlexGroup, EuiFlexItem, EuiPanel, EuiTitle,
  EuiSpacer, EuiBadge, EuiText, EuiLoadingSpinner, EuiStat,
  EuiHorizontalRule, EuiButtonGroup, EuiButton, EuiButtonEmpty,
  EuiBasicTable, type EuiBasicTableColumn,
} from '@elastic/eui'
import { API_PREFIX } from '../services/apiBase'
import { formatBytes, formatFlows } from '../services/networkApi'
import { FloatingChatWidget } from '../components/chat/FloatingChatWidget'

const BASE = `${API_PREFIX}/api/network/netflow`
// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface NetflowStats {
  total_flows: number
  total_bytes: number
  total_packets: number
  unique_src: number
  unique_dst: number
  by_protocol: Array<{ key: string; count: number }>
  by_direction: Array<{ key: string; count: number }>
  top_src: Array<{ key: string; count: number }>
  top_dst: Array<{ key: string; count: number }>
  top_dst_port: Array<{ key: string; count: number }>
  timeline: Array<{ timestamp: string; bytes: number; flows: number }>
  top_pairs: Array<{ src_ip: string; dst_ip: string; protocol: string; bytes: number; flows: number }>
  index: string
  data_source: string
}

interface KibanaDashboard { id: string; title: string; url: string }

const PORT_NAMES: Record<string, string> = {
  '80': 'HTTP', '443': 'HTTPS', '53': 'DNS', '22': 'SSH',
  '25': 'SMTP', '110': 'POP3', '143': 'IMAP', '3389': 'RDP',
  '3306': 'MySQL', '5432': 'Postgres', '8080': 'HTTP-alt', '8443': 'HTTPS-alt',
  '993': 'IMAPS', '587': 'SMTP', '8883': 'MQTT', '1883': 'MQTT',
}

const PROTO_COLOR: Record<string, string> = {
  tcp: '#0077CC', TCP: '#0077CC',
  udp: '#00BF9A', UDP: '#00BF9A',
  icmp: '#F5A700', ICMP: '#F5A700',
}

// ---------------------------------------------------------------------------
// Mini SVG charts
// ---------------------------------------------------------------------------

function AreaChart({ data, width = 600, height = 120 }: {
  data: Array<{ timestamp: string; bytes: number; flows: number }>
  width?: number
  height?: number
}) {
  if (!data.length) return null
  const pad = { t: 8, r: 8, b: 24, l: 44 }
  const W = width - pad.l - pad.r
  const H = height - pad.t - pad.b
  const maxB = Math.max(...data.map(d => d.bytes), 1)
  const pts = data.map((d, i) => [
    (i / (data.length - 1)) * W,
    H - (d.bytes / maxB) * H,
  ])
  const area = `M${pts.map(p => p.join(',')).join(' L')} L${pts[pts.length-1][0]},${H} L0,${H} Z`
  const line = `M${pts.map(p => p.join(',')).join(' L')}`
  // X labels (first, mid, last)
  const labels = [0, Math.floor(data.length / 2), data.length - 1]

  return (
    <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height: height }}>
      <g transform={`translate(${pad.l},${pad.t})`}>
        {/* Grid lines */}
        {[0, 0.5, 1].map(f => (
          <line key={f} x1={0} y1={H * (1 - f)} x2={W} y2={H * (1 - f)}
            stroke="#E0E6F0" strokeWidth={0.5} />
        ))}
        {/* Area */}
        <path d={area} fill="#0077CC" opacity={0.15} />
        {/* Line */}
        <path d={line} fill="none" stroke="#0077CC" strokeWidth={1.5} />
        {/* Y axis labels */}
        {[0, 0.5, 1].map(f => (
          <text key={f} x={-4} y={H * (1 - f) + 4} textAnchor="end"
            fontSize={9} fill="#69707D">
            {formatBytes(maxB * f)}
          </text>
        ))}
        {/* X axis labels */}
        {labels.map(i => (
          <text key={i} x={(i / (data.length - 1)) * W} y={H + 14}
            textAnchor="middle" fontSize={9} fill="#69707D">
            {new Date(data[i].timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </text>
        ))}
      </g>
    </svg>
  )
}

function HorizBars({ data, max, color = '#0077CC', labelFn }: {
  data: Array<{ key: string; count: number }>
  max: number
  color?: string
  labelFn?: (k: string) => string
}) {
  return (
    <div>
      {data.slice(0, 8).map(({ key, count }) => {
        const pct = max > 0 ? (count / max) * 100 : 0
        const label = labelFn ? labelFn(key) : key
        return (
          <div key={key} style={{ marginBottom: 5 }}>
            <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
              <EuiFlexItem style={{ minWidth: 120, maxWidth: 140 }}>
                <EuiText size="xs" style={{ fontFamily: 'monospace', fontSize: 11 }}
                  title={key}>{label.length > 16 ? label.slice(0, 15) + '…' : label}</EuiText>
              </EuiFlexItem>
              <EuiFlexItem>
                <div style={{ background: '#F5F7FA', borderRadius: 3, height: 8 }}>
                  <div style={{ width: `${pct}%`, background: color, height: '100%', borderRadius: 3, minWidth: 2 }} />
                </div>
              </EuiFlexItem>
              <EuiFlexItem grow={false} style={{ minWidth: 60, textAlign: 'right' }}>
                <EuiText size="xs" color="subdued">{formatFlows(count)}</EuiText>
              </EuiFlexItem>
            </EuiFlexGroup>
          </div>
        )
      })}
    </div>
  )
}

function DonutChart({ data, size = 140 }: { data: Array<{ key: string; count: number }>; size?: number }) {
  const total = data.reduce((s, d) => s + d.count, 0) || 1
  const cx = size / 2, cy = size / 2, r = size / 2 - 12, inner = r * 0.55
  let angle = -Math.PI / 2
  const slices = data.slice(0, 6).map(d => {
    const sweep = (d.count / total) * 2 * Math.PI
    const start = angle
    angle += sweep
    return { ...d, start, sweep, end: angle }
  })
  const COLORS = ['#0077CC', '#00BF9A', '#F5A700', '#7B61FF', '#F0861A', '#BD271E']
  const arcPath = (s: number, e: number) => {
    const x1 = cx + r * Math.cos(s), y1 = cy + r * Math.sin(s)
    const x2 = cx + r * Math.cos(e), y2 = cy + r * Math.sin(e)
    const ix1 = cx + inner * Math.cos(e), iy1 = cy + inner * Math.sin(e)
    const ix2 = cx + inner * Math.cos(s), iy2 = cy + inner * Math.sin(s)
    const large = e - s > Math.PI ? 1 : 0
    return `M${x1},${y1} A${r},${r} 0 ${large},1 ${x2},${y2} L${ix1},${iy1} A${inner},${inner} 0 ${large},0 ${ix2},${iy2} Z`
  }
  return (
    <EuiFlexGroup gutterSize="m" alignItems="center" responsive={false}>
      <EuiFlexItem grow={false}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          {slices.map((s, i) => (
            <path key={s.key} d={arcPath(s.start, s.end)}
              fill={PROTO_COLOR[s.key] ?? COLORS[i % COLORS.length]} opacity={0.9} />
          ))}
        </svg>
      </EuiFlexItem>
      <EuiFlexItem>
        {slices.map((s, i) => (
          <EuiFlexGroup key={s.key} gutterSize="xs" alignItems="center" responsive={false} style={{ marginBottom: 4 }}>
            <EuiFlexItem grow={false}>
              <div style={{ width: 10, height: 10, borderRadius: 2,
                background: PROTO_COLOR[s.key] ?? COLORS[i % COLORS.length] }} />
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiText size="xs"><strong style={{ textTransform: 'uppercase' }}>{s.key}</strong></EuiText>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiText size="xs" color="subdued">{Math.round((s.count / total) * 100)}%</EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
        ))}
      </EuiFlexItem>
    </EuiFlexGroup>
  )
}

// ---------------------------------------------------------------------------
// Kibana links bar
// ---------------------------------------------------------------------------

function KibanaDashboardBar({ dashboards }: { dashboards: KibanaDashboard[] }) {
  const ICON: Record<string, string> = {
    overview: 'dashboardApp', flow_records: 'tableDensityExpanded',
    top_n: 'visBarVerticalStacked', geo: 'mapMarker',
    traffic: 'visLine', exporters: 'exportAction',
    autonomous: 'globe', conversations: 'discuss',
  }
  return (
    <EuiPanel paddingSize="s" hasBorder hasShadow={false} color="subdued">
      <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false} wrap>
        <EuiFlexItem grow={false}>
          <EuiText size="xs" color="subdued"><strong>Open in Kibana:</strong></EuiText>
        </EuiFlexItem>
        {dashboards.map(d => (
          <EuiFlexItem key={d.id} grow={false}>
            <EuiButtonEmpty
              size="xs"
              iconType={ICON[d.id] ?? 'dashboardApp'}
              href={d.url}
              target="_blank"
              rel="noopener noreferrer"
              style={{ fontSize: 11 }}
            >
              {d.title.replace('[Logs Netflow] ', '').replace('NetFlow ', '')}
            </EuiButtonEmpty>
          </EuiFlexItem>
        ))}
      </EuiFlexGroup>
    </EuiPanel>
  )
}

// ---------------------------------------------------------------------------
// Top Pairs table
// ---------------------------------------------------------------------------

const PAIRS_COLS: Array<EuiBasicTableColumn<{ src_ip: string; dst_ip: string; protocol: string; bytes: number; flows: number }>> = [
  { field: 'src_ip',   name: 'Source IP',   render: (v: string) => <span style={{ fontFamily: 'monospace', fontSize: 12 }}>{v}</span> },
  { field: 'dst_ip',   name: 'Destination', render: (v: string) => <span style={{ fontFamily: 'monospace', fontSize: 12 }}>{v}</span> },
  { field: 'protocol', name: 'Protocol',    width: '80px',
    render: (p: string) => <EuiBadge style={{ background: PROTO_COLOR[p] ?? '#69707D', color: '#fff', textTransform: 'uppercase' }}>{p}</EuiBadge> },
  { field: 'bytes',    name: 'Bytes',    render: (b: number) => <strong>{formatBytes(b)}</strong> },
  { field: 'flows',    name: 'Flows',    render: (f: number) => formatFlows(f) },
]

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

const TIME_OPTIONS = [
  { id: '1h',  label: '1h' },
  { id: '6h',  label: '6h' },
  { id: '24h', label: '24h' },
  { id: '7d',  label: '7d' },
]

export function NetflowAnalysisPage() {
  const [stats, setStats]       = useState<NetflowStats | null>(null)
  const [dashboards, setDashboards] = useState<KibanaDashboard[]>([])
  const [loading, setLoading]   = useState(true)
  const [timeRange, setTimeRange] = useState('24h')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [s, d] = await Promise.all([
        fetch(`${BASE}/stats?time_range=${timeRange}`).then(r => r.json()),
        fetch(`${BASE}/dashboards`).then(r => r.json()),
      ])
      setStats(s)
      setDashboards(Array.isArray(d) ? d : [])
    } catch { /* fallback demo data */ }
    finally { setLoading(false) }
  }, [timeRange])

  useEffect(() => { load() }, [load])

  const maxSrc  = Math.max(...(stats?.top_src  ?? []).map(d => d.count), 1)
  const maxDst  = Math.max(...(stats?.top_dst  ?? []).map(d => d.count), 1)
  const maxPort = Math.max(...(stats?.top_dst_port ?? []).map(d => d.count), 1)
  const maxDir  = Math.max(...(stats?.by_direction ?? []).map(d => d.count), 1)

  const kbOverview = dashboards.find(d => d.id === 'overview')

  return (
    <>
      <EuiSpacer size="xxl" />
      <EuiSpacer size="l" />

      <EuiPageTemplate panelled={false} grow restrictWidth={1400}>
        <EuiPageTemplate.Header
          pageTitle="NetFlow Analysis"
          description={`Traffic flow analysis · ${stats?.index ?? 'network-flows'} · ${stats?.data_source === 'real' ? 'Live data' : 'Demo data'}`}
          rightSideItems={[
            kbOverview && (
              <EuiButton
                key="kibana"
                iconType="popout"
                size="s"
                href={kbOverview.url}
                target="_blank"
                rel="noopener noreferrer"
              >
                Open in Kibana
              </EuiButton>
            ),
            <EuiButtonGroup
              key="time"
              legend="Time range"
              options={TIME_OPTIONS}
              idSelected={timeRange}
              onChange={setTimeRange}
              buttonSize="compressed"
            />,
          ].filter(Boolean)}
        />

        <EuiPageTemplate.Section>
          {/* Kibana dashboard links */}
          {dashboards.length > 0 && <KibanaDashboardBar dashboards={dashboards} />}
          <EuiSpacer size="m" />

          {loading ? (
            <EuiFlexGroup justifyContent="center" style={{ padding: 80 }}>
              <EuiLoadingSpinner size="xl" />
            </EuiFlexGroup>
          ) : !stats ? null : (
            <>
              {/* ── KPI row ── */}
              <EuiFlexGroup gutterSize="m" responsive={false} wrap>
                {[
                  { title: formatFlows(stats.total_flows),   desc: 'Total Flows',       color: 'primary' },
                  { title: formatBytes(stats.total_bytes),   desc: 'Total Bytes',       color: 'primary' },
                  { title: formatFlows(stats.total_packets), desc: 'Total Packets',     color: 'default' },
                  { title: String(stats.unique_src),         desc: 'Unique Sources',    color: 'success' },
                  { title: String(stats.unique_dst),         desc: 'Unique Destinations', color: 'success' },
                ].map(({ title, desc, color }) => (
                  <EuiFlexItem key={desc}>
                    <EuiPanel paddingSize="m" hasBorder hasShadow={false}>
                      <EuiStat title={title} description={desc}
                        titleColor={color as 'primary'} titleSize="m" />
                    </EuiPanel>
                  </EuiFlexItem>
                ))}
              </EuiFlexGroup>

              <EuiSpacer size="l" />

              {/* ── Traffic timeline + Protocol donut ── */}
              <EuiFlexGroup gutterSize="m" alignItems="flexStart" responsive={false}>
                <EuiFlexItem grow={6}>
                  <EuiPanel paddingSize="m" hasBorder hasShadow={false}>
                    <EuiTitle size="xs"><h3>Traffic Volume Over Time</h3></EuiTitle>
                    <EuiText size="xs" color="subdued">Bytes per hour</EuiText>
                    <EuiSpacer size="s" />
                    <AreaChart data={stats.timeline} height={130} />
                  </EuiPanel>
                </EuiFlexItem>
                <EuiFlexItem grow={3}>
                  <EuiPanel paddingSize="m" hasBorder hasShadow={false} style={{ height: '100%' }}>
                    <EuiTitle size="xs"><h3>By Protocol</h3></EuiTitle>
                    <EuiSpacer size="s" />
                    <DonutChart data={stats.by_protocol} />
                  </EuiPanel>
                </EuiFlexItem>
                <EuiFlexItem grow={3}>
                  <EuiPanel paddingSize="m" hasBorder hasShadow={false} style={{ height: '100%' }}>
                    <EuiTitle size="xs"><h3>Flow Direction</h3></EuiTitle>
                    <EuiSpacer size="s" />
                    <HorizBars data={stats.by_direction} max={maxDir} color="#7B61FF" />
                  </EuiPanel>
                </EuiFlexItem>
              </EuiFlexGroup>

              <EuiSpacer size="l" />

              {/* ── Top Sources + Top Destinations + Top Ports ── */}
              <EuiFlexGroup gutterSize="m" alignItems="flexStart" responsive={false}>
                <EuiFlexItem>
                  <EuiPanel paddingSize="m" hasBorder hasShadow={false}>
                    <EuiTitle size="xs"><h3>Top Source IPs</h3></EuiTitle>
                    <EuiSpacer size="s" />
                    <HorizBars data={stats.top_src} max={maxSrc} color="#0077CC" />
                  </EuiPanel>
                </EuiFlexItem>
                <EuiFlexItem>
                  <EuiPanel paddingSize="m" hasBorder hasShadow={false}>
                    <EuiTitle size="xs"><h3>Top Destination IPs</h3></EuiTitle>
                    <EuiSpacer size="s" />
                    <HorizBars data={stats.top_dst} max={maxDst} color="#00BF9A" />
                  </EuiPanel>
                </EuiFlexItem>
                <EuiFlexItem>
                  <EuiPanel paddingSize="m" hasBorder hasShadow={false}>
                    <EuiTitle size="xs"><h3>Top Destination Ports</h3></EuiTitle>
                    <EuiSpacer size="s" />
                    <HorizBars
                      data={stats.top_dst_port} max={maxPort} color="#F5A700"
                      labelFn={k => PORT_NAMES[k] ? `${k} (${PORT_NAMES[k]})` : k}
                    />
                  </EuiPanel>
                </EuiFlexItem>
              </EuiFlexGroup>

              <EuiSpacer size="l" />

              {/* ── Top Conversation Pairs ── */}
              <EuiPanel paddingSize="m" hasBorder hasShadow={false}>
                <EuiFlexGroup alignItems="center" justifyContent="spaceBetween" responsive={false}>
                  <EuiFlexItem grow={false}>
                    <EuiTitle size="xs"><h3>Top Conversation Partners</h3></EuiTitle>
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    {dashboards.find(d => d.id === 'conversations') && (
                      <EuiButtonEmpty size="xs" iconType="popout"
                        href={dashboards.find(d => d.id === 'conversations')!.url}
                        target="_blank" rel="noopener noreferrer">
                        Full view in Kibana
                      </EuiButtonEmpty>
                    )}
                  </EuiFlexItem>
                </EuiFlexGroup>
                <EuiHorizontalRule margin="xs" />
                <EuiBasicTable items={stats.top_pairs} columns={PAIRS_COLS} tableLayout="auto" />
              </EuiPanel>

              <EuiSpacer size="s" />
              <EuiText size="xs" color="subdued">
                Data source: <strong>{stats.index}</strong> ·
                {stats.data_source === 'real' ? ' Real NetFlow v9 from Meraki MX' : ' Synthetic demo data'}
              </EuiText>
            </>
          )}
        </EuiPageTemplate.Section>
      </EuiPageTemplate>

      <FloatingChatWidget
        title="NOC Assistant"
        greeting="I can help you analyse NetFlow patterns, investigate top talkers, or correlate traffic with security events."
        placeholder="Ask about traffic patterns, top sources, or unusual flows…"
        position="bottom-right"
      />
    </>
  )
}
