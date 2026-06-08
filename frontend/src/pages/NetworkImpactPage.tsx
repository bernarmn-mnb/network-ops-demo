import { useState, useEffect, useCallback } from 'react'
import {
  EuiPageTemplate, EuiFlexGroup, EuiFlexItem, EuiPanel, EuiTitle,
  EuiSpacer, EuiBadge, EuiText, EuiLoadingSpinner, EuiStat,
  EuiHorizontalRule, EuiIcon, EuiCallOut, EuiButtonGroup,
  EuiBasicTable, EuiToolTip, type EuiBasicTableColumn,
} from '@elastic/eui'
import {
  fetchImpactEvents, fetchAffectedDevices, fetchImpactSummary,
  DEPT_COLOR, TYPE_LABEL, EVENT_COLOR,
  type ImpactEvent, type AffectedDevice, type ImpactSummary,
} from '../services/networkImpactApi'
import { FloatingChatWidget } from '../components/chat/FloatingChatWidget'

// ---------------------------------------------------------------------------
// Alert banner
// ---------------------------------------------------------------------------

function EventBanner({ event }: { event: ImpactEvent }) {
  const color = EVENT_COLOR[event.event_type] ?? 'warning'
  const icon  = event.event_type === 'flap' ? 'bolt' : 'alert'
  return (
    <EuiCallOut
      color={color}
      iconType={icon}
      title={
        <EuiFlexGroup alignItems="center" gutterSize="m" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiBadge color={color} style={{ textTransform: 'uppercase', fontSize: 10 }}>
              {event.event_type === 'flap' ? `Flap ×${event.flap_count}` : 'Outage'}
            </EuiBadge>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <strong>{event.trigger_device}</strong> / {event.trigger_interface}
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiText size="s">{event.trigger_description}</EuiText>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiText size="xs" color="subdued">
              {event.site} · {event.duration_minutes} min · {event.affected_count} devices
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      }
    >
      {event.event_type === 'flap' && event.flap_timeline && (
        <EuiFlexGroup gutterSize="xs" wrap responsive={false} style={{ marginTop: 4 }}>
          {event.flap_timeline.map((b, i) => (
            <EuiFlexItem key={i} grow={false}>
              <EuiBadge color={b.type === 'down' ? 'danger' : 'success'} style={{ fontSize: 9 }}>
                {b.type.toUpperCase()} {new Date(b.at).toLocaleTimeString()}
              </EuiBadge>
            </EuiFlexItem>
          ))}
        </EuiFlexGroup>
      )}
    </EuiCallOut>
  )
}

// ---------------------------------------------------------------------------
// Department bar chart (SVG)
// ---------------------------------------------------------------------------

function DeptChart({ data }: { data: Array<{ department: string; count: number }> }) {
  const max = Math.max(...data.map(d => d.count), 1)
  return (
    <EuiFlexGroup gutterSize="s" wrap responsive={false}>
      {data.map(({ department, count }) => {
        const color = DEPT_COLOR[department] ?? '#69707D'
        const pct   = Math.round((count / max) * 100)
        return (
          <EuiFlexItem key={department} style={{ minWidth: 90 }}>
            <EuiText size="xs" color="subdued">{department}</EuiText>
            <div style={{ background: '#f5f5f5', borderRadius: 3, overflow: 'hidden', height: 8, marginTop: 2 }}>
              <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 3 }} />
            </div>
            <EuiText size="xs"><strong style={{ color }}>{count}</strong></EuiText>
          </EuiFlexItem>
        )
      })}
    </EuiFlexGroup>
  )
}

// ---------------------------------------------------------------------------
// Device type mini-bar
// ---------------------------------------------------------------------------

function TypeBreakdown({ data }: { data: Array<{ type: string; count: number }> }) {
  void data.reduce((s, d) => s + d.count, 0) // used for future pct bars
  return (
    <EuiFlexGroup gutterSize="m" wrap responsive={false} alignItems="center">
      {data.map(({ type, count }) => (
        <EuiFlexItem key={type} grow={false}>
          <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiIcon type={
                type === 'workstation' ? 'desktop' :
                type === 'server'      ? 'storage' :
                type === 'voip_phone'  ? 'bell'    :
                type === 'printer'     ? 'print'   : 'dot'
              } size="s" color="subdued" />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiText size="xs">{TYPE_LABEL[type] ?? type}</EuiText>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiBadge color="hollow">{count}</EuiBadge>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      ))}
    </EuiFlexGroup>
  )
}

// ---------------------------------------------------------------------------
// Affected devices table
// ---------------------------------------------------------------------------

const DEVICE_COLS: Array<EuiBasicTableColumn<AffectedDevice>> = [
  {
    field: 'status',
    name: '',
    width: '32px',
    render: (s: string) => (
      <EuiIcon type="dot" color={s === 'offline' ? 'danger' : 'success'} size="m" />
    ),
  },
  {
    field: 'hostname',
    name: 'Hostname',
    render: (h: string, d: AffectedDevice) => (
      <div>
        <EuiText size="xs"><strong style={{ fontFamily: 'monospace' }}>{h}</strong></EuiText>
        <EuiText size="xs" color="subdued">{d.fqdn}</EuiText>
      </div>
    ),
  },
  {
    field: 'ip_address',
    name: 'IP Address',
    render: (ip: string) => <span style={{ fontFamily: 'monospace', fontSize: 12 }}>{ip}</span>,
  },
  {
    field: 'mac_address',
    name: 'MAC Address',
    render: (mac: string) => <span style={{ fontFamily: 'monospace', fontSize: 11, color: '#69707D' }}>{mac}</span>,
  },
  {
    field: 'vlan_id',
    name: 'VLAN',
    width: '60px',
    render: (v: number) => <EuiBadge color="hollow">{v}</EuiBadge>,
  },
  {
    field: 'device_type',
    name: 'Type',
    render: (t: string) => <EuiText size="xs">{TYPE_LABEL[t] ?? t}</EuiText>,
  },
  {
    field: 'user_name',
    name: 'User',
    render: (u: string) => u
      ? <EuiText size="xs">{u}</EuiText>
      : <EuiText size="xs" color="subdued">—</EuiText>,
  },
  {
    field: 'department',
    name: 'Department',
    render: (dept: string) => (
      <EuiBadge style={{ background: DEPT_COLOR[dept] ?? '#69707D', color: '#fff' }}>{dept}</EuiBadge>
    ),
  },
  {
    field: 'switch_port',
    name: 'Port',
    render: (p: string, d: AffectedDevice) => (
      <EuiToolTip content={`${d.switch_device} / ${p}`}>
        <span style={{ fontFamily: 'monospace', fontSize: 11 }}>{p}</span>
      </EuiToolTip>
    ),
  },
  {
    field: 'event_type',
    name: 'Event',
    render: (t: string) => (
      <EuiBadge color={EVENT_COLOR[t] ?? 'warning'} style={{ textTransform: 'capitalize' }}>{t}</EuiBadge>
    ),
  },
]

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

const FILTER_OPTIONS = [
  { id: 'all',    label: 'All events' },
  { id: 'flap',   label: 'Flaps only' },
  { id: 'outage', label: 'Outages only' },
]

export function NetworkImpactPage() {
  const [events,   setEvents]   = useState<ImpactEvent[]>([])
  const [devices,  setDevices]  = useState<AffectedDevice[]>([])
  const [summary,  setSummary]  = useState<ImpactSummary | null>(null)
  const [loading,  setLoading]  = useState(true)
  const [filter,   setFilter]   = useState('all')
  const [deptFilter, setDeptFilter] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const [evData, sumData] = await Promise.all([fetchImpactEvents(), fetchImpactSummary()])
      setEvents(evData.events)
      setSummary(sumData)
    } catch { /* falls back to demo */ }
    finally { setLoading(false) }
  }, [])

  const loadDevices = useCallback(async () => {
    try {
      const et = filter === 'all' ? undefined : filter
      const { devices: devs } = await fetchAffectedDevices(et, deptFilter ?? undefined)
      setDevices(devs)
    } catch { setDevices([]) }
  }, [filter, deptFilter])

  useEffect(() => { load() }, [load])
  useEffect(() => { loadDevices() }, [loadDevices])

  const allDepts = Array.from(new Set(devices.map(d => d.department))).sort()

  return (
    <>
      <EuiSpacer size="xxl" />
      <EuiSpacer size="l" />

      <EuiPageTemplate panelled={false} grow restrictWidth={1400}>
        <EuiPageTemplate.Header
          pageTitle="Network Impact Analysis"
          description="Interface flap and outage impact — MAC→IP→hostname chain for all affected devices"
          rightSideItems={[
            <EuiButtonGroup
              key="filter"
              legend="Event filter"
              options={FILTER_OPTIONS}
              idSelected={filter}
              onChange={setFilter}
              buttonSize="compressed"
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
              {/* Active event banners */}
              {events
                .filter(e => filter === 'all' || e.event_type === filter)
                .map(event => (
                  <div key={event.event_id} style={{ marginBottom: 12 }}>
                    <EventBanner event={event} />
                  </div>
                ))
              }

              <EuiSpacer size="l" />

              {/* KPI row */}
              <EuiFlexGroup gutterSize="m" responsive={false} wrap>
                <EuiFlexItem>
                  <EuiPanel paddingSize="m" hasBorder hasShadow={false}>
                    <EuiStat
                      title={String(summary?.total_devices ?? devices.length)}
                      description="Total Affected"
                      titleColor="danger"
                      titleSize="m"
                    />
                  </EuiPanel>
                </EuiFlexItem>
                <EuiFlexItem>
                  <EuiPanel paddingSize="m" hasBorder hasShadow={false}>
                    <EuiStat
                      title={String(summary?.by_department?.length ?? new Set(devices.map(d=>d.department)).size)}
                      description="Departments"
                      titleColor="warning"
                      titleSize="m"
                    />
                  </EuiPanel>
                </EuiFlexItem>
                <EuiFlexItem>
                  <EuiPanel paddingSize="m" hasBorder hasShadow={false}>
                    <EuiStat
                      title={String(events.filter(e => e.event_type === 'flap').length)}
                      description="Flap Events"
                      titleColor="warning"
                      titleSize="m"
                    />
                  </EuiPanel>
                </EuiFlexItem>
                <EuiFlexItem>
                  <EuiPanel paddingSize="m" hasBorder hasShadow={false}>
                    <EuiStat
                      title={String(events.filter(e => e.event_type === 'outage').length)}
                      description="Outage Events"
                      titleColor="danger"
                      titleSize="m"
                    />
                  </EuiPanel>
                </EuiFlexItem>
              </EuiFlexGroup>

              <EuiSpacer size="l" />

              {/* Department + type breakdown */}
              {summary && (
                <EuiPanel paddingSize="m" hasBorder hasShadow={false}>
                  <EuiFlexGroup gutterSize="xl" alignItems="flexStart" responsive={false} wrap>
                    <EuiFlexItem grow={3}>
                      <EuiTitle size="xs"><h3>By Department</h3></EuiTitle>
                      <EuiSpacer size="s" />
                      <DeptChart data={summary.by_department} />
                    </EuiFlexItem>
                    <EuiFlexItem grow={2}>
                      <EuiTitle size="xs"><h3>By Device Type</h3></EuiTitle>
                      <EuiSpacer size="s" />
                      <TypeBreakdown data={summary.by_device_type} />
                    </EuiFlexItem>
                  </EuiFlexGroup>
                </EuiPanel>
              )}

              <EuiSpacer size="l" />

              {/* Device table */}
              <EuiPanel paddingSize="m" hasBorder hasShadow={false}>
                <EuiFlexGroup alignItems="center" justifyContent="spaceBetween" responsive={false}>
                  <EuiFlexItem grow={false}>
                    <EuiTitle size="xs"><h2>Affected Devices — MAC→IP→Hostname Chain</h2></EuiTitle>
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    {/* Department filter pills */}
                    <EuiFlexGroup gutterSize="xs" responsive={false} wrap>
                      <EuiFlexItem grow={false}>
                        <button
                          onClick={() => setDeptFilter(null)}
                          style={{
                            padding: '2px 8px', borderRadius: 12, border: 'none', cursor: 'pointer', fontSize: 12,
                            background: !deptFilter ? '#0077CC' : '#e9edf3', color: !deptFilter ? '#fff' : '#343741',
                          }}
                        >All</button>
                      </EuiFlexItem>
                      {allDepts.map(dept => (
                        <EuiFlexItem key={dept} grow={false}>
                          <button
                            onClick={() => setDeptFilter(deptFilter === dept ? null : dept)}
                            style={{
                              padding: '2px 8px', borderRadius: 12, border: 'none', cursor: 'pointer', fontSize: 12,
                              background: deptFilter === dept ? (DEPT_COLOR[dept] ?? '#69707D') : '#e9edf3',
                              color: deptFilter === dept ? '#fff' : '#343741',
                            }}
                          >
                            {dept}
                          </button>
                        </EuiFlexItem>
                      ))}
                    </EuiFlexGroup>
                  </EuiFlexItem>
                </EuiFlexGroup>

                <EuiSpacer size="s" />
                <EuiHorizontalRule margin="xs" />

                <EuiBasicTable
                  items={devices}
                  columns={DEVICE_COLS}
                  tableLayout="auto"
                  rowProps={(d) => ({
                    style: {
                      background: d.event_type === 'outage'
                        ? 'rgba(189,39,30,0.04)'
                        : 'rgba(254,197,20,0.04)',
                    },
                  })}
                />

                {devices.length === 0 && (
                  <EuiText color="subdued" textAlign="center" style={{ padding: 40 }}>
                    No affected devices match the current filter.
                  </EuiText>
                )}

                <EuiSpacer size="s" />
                <EuiText size="xs" color="subdued">
                  {devices.length} device{devices.length !== 1 ? 's' : ''} shown ·
                  Chain: Switch MAC table → Router ARP table → DNS/DHCP records
                </EuiText>
              </EuiPanel>
            </>
          )}
        </EuiPageTemplate.Section>
      </EuiPageTemplate>

      <FloatingChatWidget
        title="NOC Assistant"
        greeting="I can help you analyse the impact of this interface flap or outage — ask me about affected users, departments, or the root cause."
        placeholder="Who is affected by the acc-sw-03 flap?"
        position="bottom-right"
      />
    </>
  )
}
