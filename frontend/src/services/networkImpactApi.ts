import { API_PREFIX } from './apiBase'

const BASE = `${API_PREFIX}/api/network/impact`

export interface ImpactEvent {
  event_id: string
  event_type: 'flap' | 'outage'
  trigger_device: string
  trigger_interface: string
  trigger_description: string
  flap_count: number
  first_detected: string
  duration_minutes: number
  site: string
  affected_count: number
  departments: string[]
  status: string
  flap_timeline?: Array<{ type: string; at: string }>
}

export interface AffectedDevice {
  mac_address: string
  ip_address: string
  hostname: string
  fqdn: string
  device_type: string
  user_name: string
  user_email?: string
  department: string
  vlan_id: number
  switch_device: string
  switch_port: string
  event_type: 'flap' | 'outage'
  trigger_device: string
  trigger_interface: string
  building: string
  floor: string
  status: string
  duration_minutes?: number
}

export interface ImpactSummary {
  total_devices: number
  departments_affected?: number
  by_department: Array<{ department: string; count: number }>
  by_device_type: Array<{ type: string; count: number }>
  by_event_type?: Array<{ event_type: string; count: number }>
  source: string
}

export async function fetchImpactEvents(): Promise<{ events: ImpactEvent[]; source: string }> {
  const r = await fetch(`${BASE}/events`)
  if (!r.ok) throw new Error(`impact/events: ${r.status}`)
  return r.json()
}

export async function fetchAffectedDevices(
  eventType?: string,
  department?: string,
): Promise<{ devices: AffectedDevice[]; total: number; source: string }> {
  const params = new URLSearchParams()
  if (eventType) params.set('event_type', eventType)
  if (department) params.set('department', department)
  const r = await fetch(`${BASE}/devices${params.size ? `?${params}` : ''}`)
  if (!r.ok) throw new Error(`impact/devices: ${r.status}`)
  return r.json()
}

export async function fetchImpactSummary(): Promise<ImpactSummary> {
  const r = await fetch(`${BASE}/summary`)
  if (!r.ok) throw new Error(`impact/summary: ${r.status}`)
  return r.json()
}

export const DEPT_COLOR: Record<string, string> = {
  Finance:    '#006BB4',
  Trading:    '#BD271E',
  HR:         '#017D73',
  NOC:        '#7B61FF',
  IT:         '#F5A700',
  Operations: '#00BF9A',
  Security:   '#E07E6C',
}

export const TYPE_LABEL: Record<string, string> = {
  workstation: 'Workstation',
  server:      'Server',
  voip_phone:  'VoIP Phone',
  voip_gateway:'VoIP GW',
  printer:     'Printer',
  switch:      'Switch',
}

export const EVENT_COLOR: Record<string, 'danger' | 'warning'> = {
  flap:   'warning',
  outage: 'danger',
}
