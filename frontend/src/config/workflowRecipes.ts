/**
 * Workflow YAML Recipes
 *
 * Pre-built workflow definitions for common automation scenarios.
 * These are example templates — customize the index names, agent IDs,
 * and step logic for your specific demo.
 *
 * Each recipe has:
 * - Metadata (name, description, tags)
 * - Input definitions for the run form
 * - Full YAML that gets deployed to Kibana Workflows
 *
 * See: hive-mind/patterns/agent-builder/WORKFLOW_INTEGRATION.md
 */

export interface WorkflowRecipe {
  id: string
  name: string
  description: string
  tags: string[]
  inputs: Array<{ name: string; type: string; required: boolean; description: string }>
  yaml: string
}

/**
 * Example workflow recipes.
 *
 * CUSTOMIZE THESE for your specific demo!
 * Replace <YOUR_INDEX>, <YOUR_AGENT_ID>, and field names
 * with your actual index and agent configuration.
 */
export const WORKFLOW_RECIPES: WorkflowRecipe[] = [
  {
    id: 'data-quality-check',
    name: 'Data Quality Check',
    description: 'Search an index for records matching a query, log the count and a sample. Useful for verifying data integrity.',
    tags: ['search', 'quality', 'example'],
    inputs: [
      { name: 'query', type: 'string', required: true, description: 'Search query to check' },
    ],
    yaml: `name: Data Quality Check
enabled: true
description: Search for records matching a query and log the results summary.
tags: ["quality", "search", "example"]
trigger:
  on_demand: true
  source:
    # Replace with your index name
    indexName: "<YOUR_INDEX>"
inputs:
  - name: query
    type: string
    required: true
steps:
  - name: search_records
    type: elasticsearch.search
    params:
      index: "{{ trigger.source.indexName }}"
      body:
        size: 5
        query:
          multi_match:
            query: "{{ inputs.query }}"
            fields: ["*"]
  - name: log_results
    type: console
    params:
      message: "Quality check for '{{ inputs.query }}' — found {{ steps.search_records.output.hits.total.value }} records"
`,
  },
  {
    id: 'ai-summary-report',
    name: 'AI Summary Report',
    description: 'Aggregate data from an index, then call an AI agent to generate a natural language summary of the findings.',
    tags: ['ai', 'report', 'agent'],
    inputs: [
      { name: 'topic', type: 'string', required: true, description: 'Topic or category to summarise' },
    ],
    yaml: `name: AI Summary Report
enabled: true
description: Aggregate index data and generate an AI-powered summary report.
tags: ["ai", "report", "agent", "example"]
trigger:
  on_demand: true
  source:
    # Replace with your index name
    indexName: "<YOUR_INDEX>"
inputs:
  - name: topic
    type: string
    required: true
steps:
  - name: aggregate_data
    type: elasticsearch.search
    params:
      index: "{{ trigger.source.indexName }}"
      body:
        size: 0
        query:
          multi_match:
            query: "{{ inputs.topic }}"
            fields: ["*"]
        aggs:
          by_category:
            terms:
              field: "category.keyword"
              size: 10
  - name: ai_analysis
    type: agent
    params:
      # Replace with your Agent Builder agent ID
      agent_id: <YOUR_AGENT_ID>
      message: "Generate a summary report about '{{ inputs.topic }}'. Data: total records={{ steps.aggregate_data.output.hits.total.value }}, categories={{ steps.aggregate_data.output.aggregations | json }}. Highlight key trends and recommendations."
  - name: log_report
    type: console
    params:
      message: "Report generated for '{{ inputs.topic }}' — {{ steps.aggregate_data.output.hits.total.value }} records analysed"
`,
  },
  // -------------------------------------------------------------------------
  // Network Telemetry Workflows
  // -------------------------------------------------------------------------
  {
    id: 'network-anomaly-triage',
    name: 'Network Anomaly Triage',
    description: 'Search NetFlow and SNMP data for traffic anomalies on a device, then use AI to triage severity and identify potential threats.',
    tags: ['network', 'security', 'anomaly', 'triage'],
    inputs: [
      { name: 'device_id', type: 'string', required: true, description: 'Device ID to analyse (e.g. site-b-rtr)' },
      { name: 'time_window', type: 'string', required: false, description: 'Time window (default: 1h). E.g. 30m, 2h, 24h' },
    ],
    yaml: `name: Network Anomaly Triage
enabled: true
description: Search network flows for traffic anomalies matching a device, then AI-triage severity and identify potential threats.
tags: ["network", "security", "anomaly", "triage"]
triggers:
  - type: manual
inputs:
  - name: device_id
    type: string
    required: true
  - name: time_window
    type: string
    required: false
steps:
  - name: search_flows
    type: elasticsearch.search
    with:
      index: network-flows
      query:
        bool:
          must:
            - match:
                device_id: "{{ inputs.device_id }}"
          filter:
            - range:
                "@timestamp":
                  gte: "now-{{ inputs.time_window | default('1h') }}"
          should:
            - range:
                bytes:
                  gte: 100000000
      size: 20
      sort:
        - bytes: desc
  - name: search_snmp_metrics
    type: elasticsearch.search
    with:
      index: network-snmp
      query:
        bool:
          must:
            - match:
                device_id: "{{ inputs.device_id }}"
          filter:
            - range:
                "@timestamp":
                  gte: "now-{{ inputs.time_window | default('1h') }}"
      size: 10
      sort:
        - "@timestamp": desc
  - name: ai_triage
    type: ai.agent
    with:
      agent_id: "{{ env.AGENT_ID }}"
      message: |
        Triage a network anomaly for device '{{ inputs.device_id }}'.
        NetFlow: {{ steps.search_flows.output.hits.total.value }} suspicious flows.
        SNMP: {{ steps.search_snmp_metrics.output.hits.hits | map(attribute='_source') | list | tojson }}
        Provide: 1) Severity, 2) Root cause, 3) Immediate actions.
  - name: log_alert
    type: console
    with:
      message: "ANOMALY TRIAGE — {{ inputs.device_id }}: {{ steps.search_flows.output.hits.total.value }} anomalous flows. AI: {{ steps.ai_triage.output }}"
`,
  },
  {
    id: 'network-root-cause-analysis',
    name: 'Network Root Cause Analysis',
    description: 'Correlate NetFlow, SNMP, and syslog for a device to identify root cause and blast radius using AI analysis.',
    tags: ['network', 'rca', 'correlation', 'incident'],
    inputs: [
      { name: 'alert_device', type: 'string', required: true, description: 'Device with the active alert (e.g. site-b-rtr)' },
      { name: 'alert_description', type: 'string', required: true, description: 'Brief description of the alert' },
    ],
    yaml: `name: Network Root Cause Analysis
enabled: true
description: Correlate NetFlow, SNMP, and syslog to identify root cause and blast radius using AI.
tags: ["network", "rca", "correlation", "incident"]
triggers:
  - type: manual
inputs:
  - name: alert_device
    type: string
    required: true
  - name: alert_description
    type: string
    required: true
steps:
  - name: search_syslog
    type: elasticsearch.search
    with:
      index: network-syslog
      query:
        bool:
          must:
            - match:
                device_id: "{{ inputs.alert_device }}"
          filter:
            - range:
                "@timestamp":
                  gte: "now-4h"
      size: 20
      sort:
        - "@timestamp": desc
  - name: search_snmp_history
    type: elasticsearch.search
    with:
      index: network-snmp
      query:
        bool:
          must:
            - match:
                device_id: "{{ inputs.alert_device }}"
          filter:
            - range:
                "@timestamp":
                  gte: "now-4h"
      size: 48
  - name: ai_rca
    type: ai.agent
    with:
      agent_id: "{{ env.AGENT_ID }}"
      message: |
        RCA for {{ inputs.alert_device }}: {{ inputs.alert_description }}
        Syslog ({{ steps.search_syslog.output.hits.total.value }} events): {{ steps.search_syslog.output.hits.hits | map(attribute='_source') | list | tojson }}
        SNMP history: {{ steps.search_snmp_history.output.hits.hits | map(attribute='_source') | list | tojson }}
        Report: timeline, root cause (with confidence), blast radius, remediation steps.
  - name: log_rca
    type: console
    with:
      message: "RCA — {{ inputs.alert_device }}: {{ steps.search_syslog.output.hits.total.value }} syslogs, {{ steps.search_snmp_history.output.hits.total.value }} SNMP samples. RCA: {{ steps.ai_rca.output }}"
`,
  },
  {
    id: 'network-incident-response',
    name: 'Network Incident Response',
    description: 'Multi-step incident response — find affected devices, pull correlated logs, and generate an AI-drafted remediation runbook.',
    tags: ['network', 'incident', 'response', 'runbook'],
    inputs: [
      { name: 'incident_device', type: 'string', required: true, description: 'Primary device in the incident (e.g. site-b-rtr)' },
      { name: 'incident_type', type: 'string', required: false, description: 'Type of incident (e.g. CPU spike, link down, security breach)' },
    ],
    yaml: `name: Network Incident Response
enabled: true
description: Multi-step incident response — find affected devices, pull logs, and generate an AI remediation runbook.
tags: ["network", "incident", "response", "runbook"]
triggers:
  - type: manual
inputs:
  - name: incident_device
    type: string
    required: true
  - name: incident_type
    type: string
    required: false
steps:
  - name: get_recent_syslog
    type: elasticsearch.search
    with:
      index: network-syslog
      query:
        bool:
          must:
            - match:
                device_id: "{{ inputs.incident_device }}"
          filter:
            - range:
                "@timestamp":
                  gte: "now-6h"
            - terms:
                severity: [0, 1, 2, 3]
      size: 25
      sort:
        - "@timestamp": desc
  - name: get_traffic_anomalies
    type: elasticsearch.search
    with:
      index: network-flows
      query:
        bool:
          must:
            - match:
                device_id: "{{ inputs.incident_device }}"
          filter:
            - range:
                "@timestamp":
                  gte: "now-2h"
            - range:
                bytes:
                  gte: 50000000
      size: 15
  - name: ai_runbook
    type: ai.agent
    with:
      agent_id: "{{ env.AGENT_ID }}"
      message: |
        Incident response for {{ inputs.incident_device }} ({{ inputs.incident_type | default('unspecified') }}).
        Critical syslogs ({{ steps.get_recent_syslog.output.hits.total.value }}): {{ steps.get_recent_syslog.output.hits.hits | map(attribute='_source') | list | tojson }}
        Traffic anomalies: {{ steps.get_traffic_anomalies.output.hits.total.value }} large flows.
        Generate runbook: 1) Incident summary, 2) Immediate actions, 3) Investigation steps, 4) Remediation with rollback, 5) Stakeholder comms.
  - name: log_incident
    type: console
    with:
      message: "INCIDENT — {{ inputs.incident_device }}: {{ steps.get_recent_syslog.output.hits.total.value }} critical syslogs | Runbook: {{ steps.ai_runbook.output }}"
`,
  },
  {
    id: 'network-capacity-planning',
    name: 'Network Capacity Planning',
    description: 'Analyse bandwidth trends across SNMP interfaces, identify congestion hot spots, and generate AI capacity recommendations.',
    tags: ['network', 'capacity', 'planning', 'bandwidth'],
    inputs: [
      { name: 'time_range', type: 'string', required: false, description: 'Analysis period (default: 7d). E.g. 1d, 7d, 30d' },
      { name: 'utilization_threshold', type: 'string', required: false, description: 'Congestion threshold % (default: 75)' },
    ],
    yaml: `name: Network Capacity Planning
enabled: true
description: Analyse bandwidth trends, identify congestion, and generate AI capacity recommendations.
tags: ["network", "capacity", "planning", "bandwidth"]
triggers:
  - type: manual
inputs:
  - name: time_range
    type: string
    required: false
  - name: utilization_threshold
    type: string
    required: false
steps:
  - name: find_congested_interfaces
    type: elasticsearch.search
    with:
      index: network-snmp
      query:
        bool:
          filter:
            - range:
                "@timestamp":
                  gte: "now-{{ inputs.time_range | default('7d') }}"
            - range:
                in_utilization_pct:
                  gte: "{{ inputs.utilization_threshold | default(75) }}"
      size: 50
      sort:
        - in_utilization_pct: desc
  - name: flow_volume_trends
    type: elasticsearch.search
    with:
      index: network-flows
      query:
        bool:
          filter:
            - range:
                "@timestamp":
                  gte: "now-{{ inputs.time_range | default('7d') }}"
      size: 0
      aggs:
        daily_volume:
          date_histogram:
            field: "@timestamp"
            calendar_interval: "1d"
          aggs:
            total_bytes:
              sum:
                field: bytes
  - name: ai_capacity_plan
    type: ai.agent
    with:
      agent_id: "{{ env.AGENT_ID }}"
      message: |
        Capacity planning for past {{ inputs.time_range | default('7 days') }}.
        Congested interfaces (>{{ inputs.utilization_threshold | default(75) }}%): {{ steps.find_congested_interfaces.output.hits.total.value }} found.
        Daily traffic: {{ steps.flow_volume_trends.output.aggregations.daily_volume.buckets | tojson }}
        Report: current hotspots, 30/60/90 day growth projection, upgrade recommendations, quick wins.
  - name: log_capacity
    type: console
    with:
      message: "CAPACITY PLAN — {{ steps.find_congested_interfaces.output.hits.total.value }} congested interfaces | AI: {{ steps.ai_capacity_plan.output }}"
`,
  },

  {
    id: 'escalation-workflow',
    name: 'Escalation Workflow',
    description: 'Search for a record by ID, assess it with AI, and route the escalation based on severity.',
    tags: ['escalation', 'automation', 'connector'],
    inputs: [
      { name: 'record_id', type: 'string', required: true, description: 'Record ID to escalate' },
      { name: 'severity', type: 'string', required: false, description: 'Severity level (low/medium/high/critical)' },
      { name: 'description', type: 'string', required: false, description: 'Description of the issue' },
    ],
    yaml: `name: Escalation Workflow
enabled: true
description: Search for a record, assess with AI, and route the escalation.
tags: ["escalation", "automation", "example"]
trigger:
  on_demand: true
  source:
    # Replace with your index name
    indexName: "<YOUR_INDEX>"
inputs:
  - name: record_id
    type: string
    required: true
  - name: severity
    type: string
    required: false
  - name: description
    type: string
    required: false
steps:
  - name: find_record
    type: elasticsearch.search
    params:
      index: "{{ trigger.source.indexName }}"
      body:
        size: 5
        query:
          match:
            _id: "{{ inputs.record_id }}"
  - name: ai_assessment
    type: agent
    params:
      # Replace with your Agent Builder agent ID
      agent_id: <YOUR_AGENT_ID>
      message: "Record {{ inputs.record_id }} (severity: {{ inputs.severity }}) has been escalated. Description: {{ inputs.description }}. Records found: {{ steps.find_record.output.hits.total.value }}. Please assess urgency and recommend actions."
  - name: log_escalation
    type: console
    params:
      message: "ESCALATION: {{ inputs.record_id }} — AI assessment: {{ steps.ai_assessment.output }}"
`,
  },
]
