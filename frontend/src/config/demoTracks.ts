/**
 * Demo Track Configuration
 *
 * This file defines the demo guide tracks — the structured walkthrough
 * content shown on the Guide page. Each track is a themed demo flow
 * with scenarios, steps, and talking points.
 *
 * CUSTOMIZE THIS FILE for your specific demo!
 *
 * The build process fills this in during Phase 4c (Demo Polish).
 * SAs can edit talking points here without touching React code.
 *
 * Pattern: same as demoPrompts.ts — content separated from layout.
 * The DemoGuidePage.tsx renders whatever tracks are defined here.
 */

// =============================================================================
// Types
// =============================================================================

export interface DemoTrack {
  id: string
  title: string
  description: string
  color: 'primary' | 'success'
  badges: string[]
  valueProposition: {
    title: string
    icon: string
    content: string
  }
  scenarios: DemoScenario[]
  keyMessages: string[]
}

export interface DemoScenario {
  id: string
  badge?: string
  badgeColor?: 'primary' | 'accent' | 'success' | 'warning'
  title: string
  keyInsight: string
  steps?: string[]
  talkingPoints?: string[]
  demoPills?: Array<{ label: string; path: string; query?: string }>
  resources?: Array<{ label: string; href: string; type: 'docs' | 'blog' }>
}

// =============================================================================
// Resources
// =============================================================================


// =============================================================================
// Demo Tracks
// =============================================================================

/**
 * DEFINE YOUR DEMO TRACKS HERE
 *
 * Example: Two tracks for an Agent Builder demo
 * - Track A: Core chat functionality
 * - Track B: Customization & debugging
 *
 * Delete or modify these for your specific demo needs.
 */
export const DEMO_TRACKS: DemoTrack[] = [
  // =========================================================================
  // Track A — Network Visibility
  // =========================================================================
  {
    id: 'a',
    title: 'Track A: Network Visibility',
    description: 'Live topology, CDP/LLDP adjacency map, and analytics dashboard',
    color: 'primary',
    badges: ['NOC Topology', 'CDP/LLDP', 'NetFlow', 'SNMP'],
    valueProposition: {
      title: 'Single Pane of Glass for Network Operations',
      icon: 'graphApp',
      content: 'Elastic unifies NetFlow, SNMP metrics, syslog, and CDP/LLDP discovery into a single real-time view. Cisco, Juniper, and Arista devices all in the same map — no vendor lock-in, no separate tools.',
    },
    keyMessages: [
      '"Every device, every link, every protocol — one platform"',
      '"No agents required — SNMP, syslog, and NetFlow are standard protocols every device already supports"',
      '"CDP/LLDP discovery keeps the topology accurate as your network changes"',
    ],
    scenarios: [
      {
        id: 'noc-topology',
        badge: '1',
        badgeColor: 'primary',
        title: 'NOC Topology — Live Device Health',
        keyInsight: 'SNMP-driven health indicators and utilisation-coloured links give instant situational awareness.',
        steps: [
          'Navigate to NOC Topology',
          'Point out the Cisco topology icons — router (cylinder), switch (3D box), firewall (appliance), server (rack)',
          'Highlight the red status dot on site-b-rtr — CPU at 95%',
          'Show the red/orange link from core-sw-01 to site-b-rtr — near-saturated bandwidth',
          'Click site-b-rtr to open the device panel and show CPU/memory bars',
        ],
        talkingPoints: [
          'Status dots are driven by live SNMP polling — CPU, memory, interface error counters',
          'Link colours show utilisation: green < 50%, yellow 50-75%, orange 75-90%, red > 90%',
          'Click any device to drill into metrics without leaving the topology view',
          'Traffic particles show active data flows — speed is proportional to utilisation',
        ],
        demoPills: [
          { label: 'NOC Topology', path: '/network-topology' },
        ],
      },
      {
        id: 'cdp-lldp',
        badge: '2',
        badgeColor: 'primary',
        title: 'CDP/LLDP Map — Protocol-Level Discovery',
        keyInsight: 'netcrawl discovers real adjacencies via CDP/LLDP over SNMP — no agents, no hand-drawn diagrams.',
        steps: [
          'Click the CDP/LLDP Map toggle in the top-right of the topology page',
          'Point out the interface labels on each link (e.g. Ge0/2, Te0/1, xe-1/0/0)',
          'Show the blue CDP links and teal LLDP links with protocol badges',
          'Point to the red dashed line with pulsing ✕ between site-b-rtr and acc-sw-03',
          'Click site-b-rtr to see its neighbour table — identify the down interface',
          'Show the Re-crawl topology button on the down-interface device',
        ],
        talkingPoints: [
          'Every link label shows the actual interface name — not a drawing, this is discovered protocol data',
          'The pulsing red ✕ on site-b-rtr → acc-sw-03 was triggered by an interface-down syslog event',
          'netcrawl is open-source (ytti/netcrawl on GitHub) — it polls CDP/LLDP MIBs via SNMP',
          'No agents on any device — just the read-only SNMP community string that\'s already configured',
          'The Re-crawl button triggers a fresh discovery and updates the topology in seconds',
        ],
        demoPills: [
          { label: 'NOC Topology', path: '/network-topology' },
        ],
      },
      {
        id: 'network-analytics',
        badge: '3',
        badgeColor: 'primary',
        title: 'Network Analytics — Traffic & Health',
        keyInsight: '1.28M NetFlow records and 2,880 SNMP samples tell the full story of network behaviour.',
        steps: [
          'Navigate to Network Analytics',
          'Show the KPI row — total flows, bandwidth in/out, critical device count',
          'Point to the Top Talkers table — highlight 10.2.1.45 consuming 28% of traffic',
          'Cross-reference: that flow destination is app-srv-01, which is also at 91% memory',
          'Show the Recent Alerts column — fw-01 connection spike and site-b-rtr events',
          'Show the Device Health table — highlight the red/amber rows',
        ],
        talkingPoints: [
          'NetFlow tells us who is talking to whom and how much — that 28% flow is the smoking gun',
          'Correlating top talkers with the SNMP alerts shows causation, not just correlation',
          'The device health table gives a quick triage view — sort by CPU to find your hottest devices',
          'All of this data is in one index cluster — no pivot between tools, no data gaps',
        ],
        demoPills: [
          { label: 'Network Analytics', path: '/network-dashboard' },
        ],
      },
    ],
  },

  // =========================================================================
  // Track B — AI-Powered Workflows
  // =========================================================================
  {
    id: 'b',
    title: 'Track B: AI-Powered Workflows',
    description: 'Anomaly triage, root cause analysis, incident response, and capacity planning',
    color: 'success',
    badges: ['Agent Builder', 'Workflows', 'RCA', 'Runbooks'],
    valueProposition: {
      title: 'From Alert to Action in 30 Seconds',
      icon: 'pipelineApp',
      content: 'Kibana Workflows correlate NetFlow, SNMP, and syslog data and call network-agent to produce AI-grounded analysis. What takes an engineer 45-60 minutes of manual investigation now happens automatically.',
    },
    keyMessages: [
      '"45-60 minutes of manual correlation → 30 seconds with Elastic"',
      '"The AI output is grounded in your actual data — not generic advice"',
      '"Workflows run automatically when an alert fires — no human in the loop required"',
    ],
    scenarios: [
      {
        id: 'anomaly-triage',
        badge: '1',
        badgeColor: 'success',
        title: 'Network Anomaly Triage',
        keyInsight: 'NetFlow + SNMP + AI = severity assessment, root cause, and containment actions in one step.',
        steps: [
          'Open Workflows and click Run on "Network Anomaly Triage"',
          'Enter device_id: site-b-rtr',
          'Click Execute and watch the steps run in real time',
          'Show the AI output: severity, root cause hypothesis, CLI commands to run',
        ],
        talkingPoints: [
          'The workflow searches 5,000+ NetFlow records and 2,800+ SNMP samples',
          'The AI has counts and timestamps from your actual environment — not a generic template',
          'Containment recommendations include specific CLI commands for the device vendor',
          'This can fire automatically when an alert rule detects anomalous traffic patterns',
        ],
        demoPills: [
          { label: 'Workflows', path: '/workflows' },
        ],
      },
      {
        id: 'rca',
        badge: '2',
        badgeColor: 'success',
        title: 'Root Cause Analysis',
        keyInsight: 'Three data sources, one AI answer: timeline, root cause, blast radius, remediation.',
        steps: [
          'Run "Network Root Cause Analysis"',
          'Enter: alert_device = site-b-rtr, alert_description = "CPU 95%, OSPF adjacency lost, Ge0/2 down"',
          'Show the structured output: timeline of events, root cause with confidence level, blast radius',
          'Point out the blast radius section — which downstream devices are affected',
        ],
        talkingPoints: [
          'Three data types correlated in a single workflow: syslog (events), SNMP (metrics), NetFlow (traffic)',
          'The blast radius analysis tells you which services are down before your service desk gets the calls',
          'Confidence level (high/medium/low) helps the engineer know how much to trust the AI\'s hypothesis',
          'Remediation steps are ordered by priority — what to do first, second, third',
        ],
        demoPills: [
          { label: 'Workflows', path: '/workflows' },
        ],
      },
      {
        id: 'incident-response',
        badge: '3',
        badgeColor: 'success',
        title: 'Incident Response Runbook',
        keyInsight: 'A production-quality runbook generated in seconds — with rollback plan and stakeholder comms.',
        steps: [
          'Run "Network Incident Response"',
          'Enter: incident_device = site-b-rtr, incident_type = "CPU spike and interface down"',
          'Show the full runbook: immediate actions, investigation steps, remediation, comms, post-incident',
        ],
        talkingPoints: [
          'This runbook would normally take a senior engineer 20 minutes to write during an incident',
          'The rollback plan is specific to the device and incident type in the inputs',
          'Stakeholder communication template is included — copy-paste for your incident bridge',
          'Post-incident tasks capture institutional knowledge while the engineer still remembers what happened',
        ],
        demoPills: [
          { label: 'Workflows', path: '/workflows' },
        ],
      },
      {
        id: 'capacity-planning',
        badge: '⭐',
        badgeColor: 'accent',
        title: 'Capacity Planning Report',
        keyInsight: 'Bandwidth trends + AI = growth projections, bottleneck forecasts, and upgrade recommendations.',
        steps: [
          'Run "Network Capacity Planning" with no inputs (uses 7-day window, 75% threshold)',
          'Show the output: congested interface count, 30/60/90-day projections, upgrade recommendations, quick wins',
        ],
        talkingPoints: [
          'Capacity planning typically requires a dedicated tool and a quarterly review meeting',
          'The 30/60/90-day projections are based on your actual utilisation trend data',
          'Quick wins are optimisations deployable in 48 hours without hardware changes',
          '"Run this on demand before your next budget cycle" — no dedicated capacity planning tool needed',
        ],
        demoPills: [
          { label: 'Workflows', path: '/workflows' },
        ],
      },
    ],
  },

  // =========================================================================
  // Track C — Event-Driven Intelligence
  // =========================================================================
  {
    id: 'c',
    title: 'Track C: Event-Driven Intelligence',
    description: 'Interface-down syslog → automated CDP/LLDP crawl → topology update',
    color: 'primary',
    badges: ['Event-driven', 'netcrawl', 'CDP/LLDP', 'Auto-response'],
    valueProposition: {
      title: 'Closed-Loop Network Automation',
      icon: 'refresh',
      content: 'When an interface goes down, Elastic detects the syslog event, triggers a netcrawl CDP/LLDP topology discovery, and uses AI to assess the impact — all within seconds and without a human in the loop.',
    },
    keyMessages: [
      '"Alert → discovery → AI impact assessment — fully automated, triggered by a single syslog event"',
      '"The topology stays accurate because it\'s re-discovered when the network changes"',
      '"netcrawl runs over standard SNMP — no agents, no firewall rules to open"',
    ],
    scenarios: [
      {
        id: 'interface-down',
        badge: '1',
        badgeColor: 'primary',
        title: 'Interface Down — Automated CDP Crawl',
        keyInsight: 'A syslog LINEPROTO event triggers a workflow that re-crawls the topology and reports impact.',
        steps: [
          'Show the CDP/LLDP Map with the pulsing red ✕ on site-b-rtr → acc-sw-03',
          'Explain: a syslog event "%LINEPROTO-5-UPDOWN: ...GigabitEthernet0/2, changed state to down" triggered this',
          'Run "Network Interface Down — CDP/LLDP Crawl" with device_id=site-b-rtr, interface_name=GigabitEthernet0/2',
          'Show the workflow steps: query syslog → check existing adjacencies → HTTP call to cdp-crawl → AI impact',
          'After completion, refresh the CDP/LLDP map — confirm the fresh crawl timestamp',
          'Click site-b-rtr → click Re-crawl topology to show the manual trigger path',
        ],
        talkingPoints: [
          'In production, this workflow fires automatically when an alert rule detects the LINEPROTO pattern',
          'The HTTP step calls our backend which wraps netcrawl — it could call any discovery tool',
          'The AI knows topology context: which downstream devices are now isolated, which services are affected',
          'The whole loop — detect → discover → assess — runs in under 30 seconds',
          'The Re-crawl button on the topology page lets your NOC engineer manually trigger a re-discovery too',
        ],
        demoPills: [
          { label: 'NOC Topology', path: '/network-topology' },
          { label: 'Workflows', path: '/workflows' },
        ],
      },
      {
        id: 'noc-chat',
        badge: '2',
        badgeColor: 'primary',
        title: 'NOC Chat Assistant',
        keyInsight: 'Natural language queries across NetFlow, SNMP, syslog, and CDP/LLDP — no ES|QL required.',
        steps: [
          'Open the floating chat widget on the topology page (bottom-right button)',
          'Ask: "What\'s causing the CPU spike on site-b-rtr?"',
          'Ask: "Which devices are affected by the GigabitEthernet0/2 interface going down?"',
          'Ask: "What\'s the top bandwidth consumer in the last 24 hours and is it normal?"',
        ],
        talkingPoints: [
          'The NOC assistant is available on every page — topology, analytics, wherever the engineer is working',
          'It has access to all the same data as the workflows: NetFlow, SNMP, syslog, CDP/LLDP',
          'Your team can ask questions in plain English instead of writing ES|QL queries',
          'Great for on-call engineers who need answers fast at 2am — no manual log trawling',
        ],
        demoPills: [
          { label: 'NOC Topology', path: '/network-topology' },
          { label: 'Network Analytics', path: '/network-dashboard' },
        ],
      },
    ],
  },
]
