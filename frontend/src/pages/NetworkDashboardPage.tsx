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
  EuiBasicTable,
  EuiButtonGroup,
  type EuiBasicTableColumn,
} from '@elastic/eui'
import {
  fetchSummary,
  fetchAlerts,
  fetchDevices,
  formatBytes,
  formatFlows,
  type NetworkSummary,
  type NetworkAlert,
  type NetworkDevice,
  type TopTalker,
} from '../services/networkApi'
import { FloatingChatWidget } from '../components/chat/FloatingChatWidget'

// ---------------------------------------------------------------------------
// KPI cards
// ---------------------------------------------------------------------------

function KpiRow({ summary }: { summary: NetworkSummary | null }) {
  if (!summary) return null
  return (
    <EuiFlexGroup gutterSize="m" responsive={false} wrap>
      <EuiFlexItem>
        <EuiPanel paddingSize="m" hasShadow={false} hasBorder>
          <EuiStat
            title={formatFlows(summary.total_flows_24h)}
            description="NetFlows (24h)"
            titleColor="default"
            titleSize="m"
          />
        </EuiPanel>
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiPanel paddingSize="m" hasShadow={false} hasBorder>
          <EuiStat
            title={`${summary.bandwidth_in_mbps.toFixed(0)} Mbps`}
            description="Ingress Bandwidth"
            titleColor="primary"
            titleSize="m"
          />
        </EuiPanel>
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiPanel paddingSize="m" hasShadow={false} hasBorder>
          <EuiStat
            title={`${summary.bandwidth_out_mbps.toFixed(0)} Mbps`}
            description="Egress Bandwidth"
            titleColor="accent"
            titleSize="m"
          />
        </EuiPanel>
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiPanel paddingSize="m" hasShadow={false} hasBorder>
          <EuiStat
            title={String(summary.critical)}
            description="Critical Devices"
            titleColor={summary.critical > 0 ? 'danger' : 'success'}
            titleSize="m"
          />
        </EuiPanel>
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiPanel paddingSize="m" hasShadow={false} hasBorder>
          <EuiStat
            title={`${summary.healthy}/${summary.total_devices}`}
            description="Devices Healthy"
            titleColor={summary.healthy === summary.total_devices ? 'success' : 'warning'}
            titleSize="m"
          />
        </EuiPanel>
      </EuiFlexItem>
    </EuiFlexGroup>
  )
}

// ---------------------------------------------------------------------------
// Top talkers table
// ---------------------------------------------------------------------------

const TOP_TALKER_COLS: Array<EuiBasicTableColumn<TopTalker>> = [
  {
    field: 'src_ip',
    name: 'Source',
    render: (ip: string) => <span style={{ fontFamily: 'monospace', fontSize: 12 }}>{ip}</span>,
  },
  {
    field: 'dst_ip',
    name: 'Destination',
    render: (ip: string) => <span style={{ fontFamily: 'monospace', fontSize: 12 }}>{ip}</span>,
  },
  {
    field: 'protocol',
    name: 'Proto',
    width: '60px',
    render: (p: string) => <EuiBadge color="hollow">{p}</EuiBadge>,
  },
  {
    field: 'port',
    name: 'Port',
    width: '60px',
    render: (port: number) => <span style={{ fontFamily: 'monospace', fontSize: 12 }}>{port || '—'}</span>,
  },
  {
    field: 'bytes',
    name: 'Volume',
    render: (bytes: number) => <strong>{formatBytes(bytes)}</strong>,
  },
  {
    field: 'flows',
    name: 'Flows',
    render: (flows: number) => formatFlows(flows),
  },
  {
    field: 'pct',
    name: '% Traffic',
    render: (pct: number) => (
      <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
        <EuiFlexItem>
          <EuiProgress value={pct} max={100} size="xs" color={pct > 25 ? 'warning' : 'primary'} />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiText size="xs">{pct}%</EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
    ),
  },
]

// ---------------------------------------------------------------------------
// Alerts list
// ---------------------------------------------------------------------------

const SEV_COLOR: Record<string, string> = { critical: 'danger', warning: 'warning', info: 'primary' }
const SEV_ICON: Record<string, string> = { critical: 'alert', warning: 'warning', info: 'iInCircle' }

function AlertsList({ alerts }: { alerts: NetworkAlert[] }) {
  return (
    <div style={{ maxHeight: 380, overflowY: 'auto' }}>
      {alerts.map((a, i) => (
        <div key={i}>
          <EuiFlexGroup gutterSize="s" alignItems="flexStart" responsive={false}>
            <EuiFlexItem grow={false} style={{ paddingTop: 2 }}>
              <EuiIcon
                type={SEV_ICON[a.severity] ?? 'iInCircle'}
                color={SEV_COLOR[a.severity] as 'danger' | 'warning' | 'primary'}
                size="s"
              />
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
                <EuiFlexItem grow={false}>
                  <EuiBadge color={SEV_COLOR[a.severity] as 'danger' | 'warning' | 'primary'} style={{ textTransform: 'capitalize' }}>
                    {a.severity}
                  </EuiBadge>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiText size="xs" style={{ fontFamily: 'monospace' }}><strong>{a.device}</strong></EuiText>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiBadge color="hollow">{a.category}</EuiBadge>
                </EuiFlexItem>
              </EuiFlexGroup>
              <EuiText size="xs">{a.message}</EuiText>
              <EuiText size="xs" color="subdued">{new Date(a.timestamp).toLocaleString()}</EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
          {i < alerts.length - 1 && <EuiHorizontalRule margin="xs" />}
        </div>
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Device health table
// ---------------------------------------------------------------------------

const DEVICE_COLS: Array<EuiBasicTableColumn<NetworkDevice>> = [
  {
    field: 'hostname',
    name: 'Device',
    render: (h: string) => <span style={{ fontFamily: 'monospace', fontSize: 12 }}>{h.split('.')[0]}</span>,
  },
  {
    field: 'type',
    name: 'Type',
    render: (t: string) => <EuiBadge color="hollow" style={{ textTransform: 'capitalize' }}>{t}</EuiBadge>,
  },
  {
    field: 'ip',
    name: 'IP',
    render: (ip: string) => <span style={{ fontFamily: 'monospace', fontSize: 12 }}>{ip}</span>,
  },
  {
    field: 'vendor',
    name: 'Vendor',
    render: (v: string) => <EuiText size="xs">{v}</EuiText>,
  },
  {
    field: 'status',
    name: 'Status',
    render: (s: string) => (
      <EuiBadge
        color={s === 'healthy' ? 'success' : s === 'warning' ? 'warning' : 'danger'}
        style={{ textTransform: 'capitalize' }}
      >
        {s}
      </EuiBadge>
    ),
  },
  {
    field: 'cpu',
    name: 'CPU',
    render: (cpu: number) => (
      <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
        <EuiFlexItem>
          <EuiProgress value={cpu} max={100} size="xs" color={cpu >= 90 ? 'danger' : cpu >= 75 ? 'warning' : 'success'} />
        </EuiFlexItem>
        <EuiFlexItem grow={false}><EuiText size="xs">{cpu}%</EuiText></EuiFlexItem>
      </EuiFlexGroup>
    ),
  },
  {
    field: 'mem',
    name: 'Memory',
    render: (mem: number) => (
      <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
        <EuiFlexItem>
          <EuiProgress value={mem} max={100} size="xs" color={mem >= 90 ? 'danger' : mem >= 75 ? 'warning' : 'success'} />
        </EuiFlexItem>
        <EuiFlexItem grow={false}><EuiText size="xs">{mem}%</EuiText></EuiFlexItem>
      </EuiFlexGroup>
    ),
  },
  {
    field: 'location',
    name: 'Location',
    render: (l: string) => <EuiText size="xs" color="subdued">{l}</EuiText>,
  },
]

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

const TIME_OPTIONS = [
  { id: '1h', label: 'Last 1h' },
  { id: '6h', label: 'Last 6h' },
  { id: '24h', label: 'Last 24h' },
  { id: '7d', label: 'Last 7d' },
]

export function NetworkDashboardPage() {
  const [summary, setSummary] = useState<NetworkSummary | null>(null)
  const [alerts, setAlerts] = useState<NetworkAlert[]>([])
  const [devices, setDevices] = useState<NetworkDevice[]>([])
  const [loading, setLoading] = useState(true)
  const [timeRange, setTimeRange] = useState('24h')

  const load = useCallback(async () => {
    try {
      const [sum, alertData, devData] = await Promise.all([
        fetchSummary(),
        fetchAlerts(),
        fetchDevices(),
      ])
      setSummary(sum)
      setAlerts(alertData.alerts)
      setDevices(devData.devices)
    } catch {
      // silent — demo data always available
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
    const interval = setInterval(load, 30_000)
    return () => clearInterval(interval)
  }, [load])

  return (
    <>
      <EuiSpacer size="xxl" />
      <EuiSpacer size="l" />

      <EuiPageTemplate panelled={false} grow restrictWidth={1400}>
        <EuiPageTemplate.Header
          pageTitle="Network Analytics Dashboard"
          description="Traffic analysis, device health, and security events across your network infrastructure."
          rightSideItems={[
            <EuiButtonGroup
              key="time"
              legend="Time range"
              options={TIME_OPTIONS}
              idSelected={timeRange}
              onChange={setTimeRange}
              buttonSize="compressed"
              isIconOnly={false}
            />,
          ]}
        />

        <EuiPageTemplate.Section>
          {loading ? (
            <EuiFlexGroup justifyContent="center" style={{ padding: 80 }}>
              <EuiLoadingSpinner size="xl" />
            </EuiFlexGroup>
          ) : (
            <>
              <KpiRow summary={summary} />

              <EuiSpacer size="l" />

              {/* Top talkers + Alerts */}
              <EuiFlexGroup gutterSize="m" alignItems="flexStart" responsive={false}>
                <EuiFlexItem grow={6}>
                  <EuiPanel paddingSize="m" hasBorder hasShadow={false}>
                    <EuiTitle size="xs"><h2>Top Talkers — Last 24h</h2></EuiTitle>
                    <EuiSpacer size="s" />
                    <EuiBasicTable
                      items={summary?.top_talkers ?? []}
                      columns={TOP_TALKER_COLS}
                      tableLayout="auto"
                    />
                  </EuiPanel>
                </EuiFlexItem>

                <EuiFlexItem grow={4}>
                  <EuiPanel paddingSize="m" hasBorder hasShadow={false}>
                    <EuiFlexGroup alignItems="center" justifyContent="spaceBetween" responsive={false}>
                      <EuiFlexItem grow={false}>
                        <EuiTitle size="xs"><h2>Recent Alerts</h2></EuiTitle>
                      </EuiFlexItem>
                      <EuiFlexItem grow={false}>
                        <EuiBadge color={alerts.some((a) => a.severity === 'critical') ? 'danger' : 'hollow'}>
                          {alerts.filter((a) => a.severity === 'critical').length} critical
                        </EuiBadge>
                      </EuiFlexItem>
                    </EuiFlexGroup>
                    <EuiSpacer size="s" />
                    <AlertsList alerts={alerts} />
                  </EuiPanel>
                </EuiFlexItem>
              </EuiFlexGroup>

              <EuiSpacer size="l" />

              {/* Device health table */}
              <EuiPanel paddingSize="m" hasBorder hasShadow={false}>
                <EuiFlexGroup alignItems="center" justifyContent="spaceBetween" responsive={false}>
                  <EuiFlexItem grow={false}>
                    <EuiTitle size="xs"><h2>Device Health</h2></EuiTitle>
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <EuiText size="xs" color="subdued">{devices.length} devices monitored</EuiText>
                  </EuiFlexItem>
                </EuiFlexGroup>
                <EuiSpacer size="s" />
                <EuiBasicTable
                  items={devices}
                  columns={DEVICE_COLS}
                  tableLayout="auto"
                  rowProps={(device) => ({
                    style: {
                      background: device.status === 'critical'
                        ? 'rgba(189,39,30,0.06)'
                        : device.status === 'warning'
                        ? 'rgba(254,197,20,0.06)'
                        : undefined,
                    },
                  })}
                />
              </EuiPanel>
            </>
          )}
        </EuiPageTemplate.Section>
      </EuiPageTemplate>

      <FloatingChatWidget
        title="NOC Assistant"
        greeting="I can help you interpret traffic patterns, investigate anomalies, or explain what's happening with any device in your network."
        placeholder="Ask about bandwidth, alerts, or device health..."
        position="bottom-right"
      />
    </>
  )
}
