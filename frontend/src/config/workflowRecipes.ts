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
          match:
            _all: "{{ inputs.topic }}"
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
