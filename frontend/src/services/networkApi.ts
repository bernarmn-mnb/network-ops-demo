import { API_PREFIX } from './apiBase'
const BASE = `${API_PREFIX}/api/network`

export interface NetworkDevice {
  id: string
  hostname: string
  ip: string
  type: 'internet' | 'firewall' | 'router' | 'switch' | 'server'
  vendor: string
  model: string
  status: 'healthy' | 'warning' | 'critical' | 'unknown'
  cpu: number
  mem: number
  location: string
  interfaces?: number
  uptime_days?: number
}

export interface TopologyLink {
  source: string
  target: string
  bandwidth_mbps: number
  utilization: number
}

export interface Topology {
  nodes: NetworkDevice[]
  links: TopologyLink[]
  source: string
}

export interface NetworkAlert {
  severity: 'critical' | 'warning' | 'info'
  device: string
  message: string
  timestamp: string
  category: string
}

export interface TopTalker {
  src_ip: string
  dst_ip: string
  protocol: string
  port: number
  bytes: number
  flows: number
  pct: number
}

export interface NetworkSummary {
  total_devices: number
  healthy: number
  warning: number
  critical: number
  total_flows_24h: number
  bandwidth_in_mbps: number
  bandwidth_out_mbps: number
  top_talkers: TopTalker[]
  source: string
}

export async function fetchTopology(): Promise<Topology> {
  const res = await fetch(`${BASE}/topology`)
  if (!res.ok) throw new Error(`topology: ${res.status}`)
  return res.json()
}

export async function fetchDevices(): Promise<{ devices: NetworkDevice[]; source: string }> {
  const res = await fetch(`${BASE}/devices`)
  if (!res.ok) throw new Error(`devices: ${res.status}`)
  return res.json()
}

export async function fetchSummary(): Promise<NetworkSummary> {
  const res = await fetch(`${BASE}/summary`)
  if (!res.ok) throw new Error(`summary: ${res.status}`)
  return res.json()
}

export async function fetchAlerts(): Promise<{ alerts: NetworkAlert[]; total: number; source: string }> {
  const res = await fetch(`${BASE}/alerts`)
  if (!res.ok) throw new Error(`alerts: ${res.status}`)
  return res.json()
}

export function formatBytes(bytes: number): string {
  if (bytes >= 1e12) return `${(bytes / 1e12).toFixed(1)} TB`
  if (bytes >= 1e9) return `${(bytes / 1e9).toFixed(1)} GB`
  if (bytes >= 1e6) return `${(bytes / 1e6).toFixed(1)} MB`
  if (bytes >= 1e3) return `${(bytes / 1e3).toFixed(1)} KB`
  return `${bytes} B`
}

export function formatFlows(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`
  return String(n)
}

export function utilizationColor(u: number): string {
  if (u >= 0.9) return '#BD271E'
  if (u >= 0.75) return '#F0861A'
  if (u >= 0.5) return '#FEC514'
  return '#00BF9A'
}

export interface CdpLink {
  local_device: string
  local_interface: string
  neighbor_hostname: string
  neighbor_ip: string
  neighbor_interface: string
  protocol: 'CDP' | 'LLDP'
  platform: string
  link_status: 'up' | 'down'
  crawl_id?: string
  trigger_event?: string
  trigger_device?: string
}

export interface CdpTopology {
  links: CdpLink[]
  source: string
}

export async function fetchCdpTopology(): Promise<CdpTopology> {
  const res = await fetch(`${BASE}/cdp-topology`)
  if (!res.ok) throw new Error(`cdp-topology: ${res.status}`)
  return res.json()
}

export async function triggerCdpCrawl(deviceId: string, interfaceName: string): Promise<void> {
  await fetch(`${BASE}/cdp-crawl`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ device_id: deviceId, interface_name: interfaceName, trigger: 'manual' }),
  })
}

export function abbreviateInterface(iface: string): string {
  return iface
    .replace('HundredGigabitEthernet', 'Hu')
    .replace('TenGigabitEthernet', 'Te')
    .replace('GigabitEthernet', 'Ge')
    .replace('FastEthernet', 'Fa')
}

export function statusColor(status: string | undefined): string {
  switch (status) {
    case 'healthy':  return '#00BF9A'
    case 'warning':  return '#FEC514'
    case 'critical': return '#BD271E'
    default:         return '#69707D'
  }
}
