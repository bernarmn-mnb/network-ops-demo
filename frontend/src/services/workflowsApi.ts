/**
 * Workflows API Service
 *
 * Client for the backend Workflows proxy API.
 * All requests are proxied through FastAPI to Kibana's Workflows Management API.
 *
 * See: hive-mind/patterns/agent-builder/WORKFLOW_INTEGRATION.md
 */

import { API_PREFIX } from './apiBase'
const API_BASE = `${API_PREFIX}/api/workflows`

// ============================================================================
// Types
// ============================================================================

export interface Workflow {
  id: string
  name: string
  description?: string
  enabled: boolean
  tags?: string[]
  yaml?: string
  created_at?: string
  updated_at?: string
}

export interface WorkflowSearchResponse {
  results: Workflow[]
  total: number
  page: number
  size: number
}

export interface WorkflowExecution {
  id: string
  workflowId: string
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled'
  startedAt?: string
  completedAt?: string
  duration?: number
  steps?: WorkflowStepResult[]
  error?: string
}

export interface WorkflowStepResult {
  name: string
  type: string
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped'
  output?: unknown
  error?: string
  duration?: number
}

export interface WorkflowRunResponse {
  workflowExecutionId: string
}

export interface WorkflowStats {
  workflows: { enabled: number; disabled: number }
  executions: Array<{
    date: string
    timestamp: number
    completed: number
    failed: number
    cancelled: number
  }>
}

export interface WorkflowHealthResponse {
  status: 'healthy' | 'unhealthy'
  workflows_enabled: boolean
  stats?: WorkflowStats
  message?: string
}

// ============================================================================
// API Functions
// ============================================================================

/**
 * Check if the Workflows API is available.
 */
export async function checkWorkflowsHealth(): Promise<WorkflowHealthResponse> {
  const response = await fetch(`${API_BASE}/health/check`)
  if (!response.ok) {
    return { status: 'unhealthy', workflows_enabled: false, message: 'API unreachable' }
  }
  return response.json()
}

/**
 * Search/list workflows.
 */
export async function searchWorkflows(params?: {
  limit?: number
  page?: number
  query?: string
  enabled?: boolean[]
}): Promise<WorkflowSearchResponse> {
  const response = await fetch(`${API_BASE}/search`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      limit: params?.limit ?? 50,
      page: params?.page ?? 1,
      ...(params?.query && { query: params.query }),
      ...(params?.enabled && { enabled: params.enabled }),
    }),
  })
  if (!response.ok) {
    const err = await response.json().catch(() => ({ detail: 'Search failed' }))
    throw new Error(err.detail || `Search failed: ${response.status}`)
  }
  return response.json()
}

/**
 * Get a single workflow by ID.
 */
export async function getWorkflow(id: string): Promise<Workflow> {
  const response = await fetch(`${API_BASE}/${id}`)
  if (!response.ok) {
    const err = await response.json().catch(() => ({ detail: 'Not found' }))
    throw new Error(err.detail || `Get workflow failed: ${response.status}`)
  }
  return response.json()
}

/**
 * Get workflow statistics.
 */
export async function getWorkflowStats(): Promise<WorkflowStats> {
  const response = await fetch(`${API_BASE}/stats`)
  if (!response.ok) throw new Error('Failed to fetch stats')
  return response.json()
}

/**
 * Create a workflow from YAML.
 */
export async function createWorkflow(yaml: string): Promise<Workflow> {
  const response = await fetch(API_BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ yaml }),
  })
  if (!response.ok) {
    const err = await response.json().catch(() => ({ detail: 'Create failed' }))
    throw new Error(err.detail || `Create failed: ${response.status}`)
  }
  return response.json()
}

/**
 * Run a workflow with inputs.
 */
export async function runWorkflow(
  workflowId: string,
  inputs: Record<string, unknown> = {}
): Promise<WorkflowRunResponse> {
  const response = await fetch(`${API_BASE}/${workflowId}/run`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ inputs }),
  })
  if (!response.ok) {
    const err = await response.json().catch(() => ({ detail: 'Run failed' }))
    throw new Error(err.detail || `Run failed: ${response.status}`)
  }
  return response.json()
}

/**
 * Test a workflow without saving (uses YAML directly).
 */
export async function testWorkflow(
  workflowYaml: string,
  inputs: Record<string, unknown> = {}
): Promise<WorkflowRunResponse> {
  const response = await fetch(`${API_BASE}/test`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ workflowYaml, inputs }),
  })
  if (!response.ok) {
    const err = await response.json().catch(() => ({ detail: 'Test failed' }))
    throw new Error(err.detail || `Test failed: ${response.status}`)
  }
  return response.json()
}

/**
 * Get execution details (status, steps, duration).
 */
export async function getExecution(executionId: string): Promise<WorkflowExecution> {
  const response = await fetch(`${API_BASE}/executions/${executionId}`)
  if (!response.ok) {
    const err = await response.json().catch(() => ({ detail: 'Not found' }))
    throw new Error(err.detail || `Get execution failed: ${response.status}`)
  }
  const raw = await response.json()

  // Map Kibana's response format → WorkflowExecution
  // Kibana returns stepExecutions[].stepId/stepType/status; frontend expects steps[].name/type/status
  const stepExecutions: Array<Record<string, unknown>> = (raw.stepExecutions ?? raw.steps ?? [])
  const steps: WorkflowStepResult[] = stepExecutions.map((s) => {
    // Kibana does not expose step output via REST API as of 8.x/9.x.
    // Map all candidate field names defensively so we surface output if it ever appears.
    const rawOutput =
      s.output ??
      s.result ??
      s.outputs ??
      s.message ??
      s.executionMessage ??
      s.renderedMessage ??
      undefined
    return {
      name:     String(s.stepId   ?? s.name   ?? ''),
      type:     String(s.stepType ?? s.type   ?? ''),
      status:   String(s.executionStatus ?? s.status ?? 'pending') as WorkflowStepResult['status'],
      output:   rawOutput,
      error:    s.error ? String(s.error) : undefined,
      duration: typeof s.duration === 'number' ? s.duration :
                typeof s.executionTimeMs === 'number' ? s.executionTimeMs : undefined,
    }
  })

  return {
    id:          String(raw.id ?? raw.workflowExecutionId ?? ''),
    workflowId:  String(raw.workflowId ?? ''),
    status:      String(raw.status ?? 'running') as WorkflowExecution['status'],
    startedAt:   raw.startedAt  ? String(raw.startedAt)  : undefined,
    completedAt: raw.finishedAt ? String(raw.finishedAt) : raw.completedAt ? String(raw.completedAt) : undefined,
    duration:    typeof raw.duration === 'number' ? raw.duration : undefined,
    steps:       steps.length ? steps : undefined,
    error:       raw.error
      ? (typeof raw.error === 'string' ? raw.error : JSON.stringify(raw.error))
      : undefined,
  }
}

/**
 * List executions for a workflow.
 */
export async function getExecutionsByWorkflow(
  workflowId: string,
  params?: { page?: number; perPage?: number; statuses?: string }
): Promise<{ data: WorkflowExecution[]; total: number }> {
  const searchParams = new URLSearchParams()
  if (params?.page) searchParams.set('page', String(params.page))
  if (params?.perPage) searchParams.set('perPage', String(params.perPage))
  if (params?.statuses) searchParams.set('statuses', params.statuses)

  const url = `${API_BASE}/executions/by-workflow/${workflowId}?${searchParams}`
  const response = await fetch(url)
  if (!response.ok) {
    const err = await response.json().catch(() => ({ detail: 'Failed' }))
    throw new Error(err.detail || `List executions failed: ${response.status}`)
  }
  return response.json()
}

/**
 * Cancel a running execution.
 */
export async function cancelExecution(executionId: string): Promise<void> {
  const response = await fetch(`${API_BASE}/executions/${executionId}/cancel`, {
    method: 'POST',
  })
  if (!response.ok) {
    const err = await response.json().catch(() => ({ detail: 'Cancel failed' }))
    throw new Error(err.detail || `Cancel failed: ${response.status}`)
  }
}

/**
 * Poll an execution until it completes or fails.
 * Returns the final execution state.
 */
export async function pollExecution(
  executionId: string,
  intervalMs = 1500,
  maxAttempts = 60,
  onUpdate?: (execution: WorkflowExecution) => void
): Promise<WorkflowExecution> {
  for (let i = 0; i < maxAttempts; i++) {
    const execution = await getExecution(executionId)
    onUpdate?.(execution)

    if (execution.status === 'completed' || execution.status === 'failed' || execution.status === 'cancelled') {
      return execution
    }

    await new Promise(resolve => setTimeout(resolve, intervalMs))
  }

  throw new Error(`Execution ${executionId} timed out after ${maxAttempts * intervalMs / 1000}s`)
}
