/**
 * WorkflowsPage
 *
 * Workflows management and demo page.
 * Lists deployed workflows from the API and provides a recipe library
 * for deploying pre-built YAML workflow definitions.
 */

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
  EuiButton,
  EuiButtonEmpty,
  EuiCallOut,
  EuiAccordion,
  EuiFieldText,
  EuiLoadingSpinner,
  EuiEmptyPrompt,
  EuiHorizontalRule,
  EuiIcon,
  EuiToolTip,
} from '@elastic/eui'
import { AppHeader } from '../components/layout/AppHeader'
import {
  searchWorkflows,
  createWorkflow,
  runWorkflow,
  pollExecution,
  checkWorkflowsHealth,
} from '../services/workflowsApi'
import type { Workflow, WorkflowExecution } from '../services/workflowsApi'
import { WORKFLOW_RECIPES } from '../config/workflowRecipes'
import type { WorkflowRecipe } from '../config/workflowRecipes'

// ============================================================================
// Types
// ============================================================================

interface RunFormState {
  workflowId: string
  inputs: Record<string, string>
}

// ============================================================================
// Main Component
// ============================================================================

export function WorkflowsPage() {
  const [healthStatus, setHealthStatus] = useState<'healthy' | 'unhealthy' | 'loading'>('loading')
  const [workflows, setWorkflows] = useState<Workflow[]>([])
  const [loadingWorkflows, setLoadingWorkflows] = useState(false)
  const [error, setError] = useState<string>()

  // Run form state
  const [runForm, setRunForm] = useState<RunFormState | null>(null)
  const [runningId, setRunningId] = useState<string>()
  const [execution, setExecution] = useState<WorkflowExecution | null>(null)

  // Deploy state
  const [deployingRecipeId, setDeployingRecipeId] = useState<string>()
  const [deploySuccess, setDeploySuccess] = useState<string>()

  // ------ Health check ------
  const checkHealth = useCallback(async () => {
    try {
      const res = await checkWorkflowsHealth()
      setHealthStatus(res.status)
    } catch {
      setHealthStatus('unhealthy')
    }
  }, [])

  // ------ Load workflows ------
  const loadWorkflows = useCallback(async () => {
    setLoadingWorkflows(true)
    setError(undefined)
    try {
      const res = await searchWorkflows({ limit: 50 })
      setWorkflows(res.results)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load workflows')
    } finally {
      setLoadingWorkflows(false)
    }
  }, [])

  // Initial load
  useEffect(() => {
    checkHealth()
    loadWorkflows()
  }, [checkHealth, loadWorkflows])

  // ------ Run workflow ------
  const handleOpenRunForm = useCallback((wf: Workflow) => {
    // Find a matching recipe to get input definitions
    const recipe = WORKFLOW_RECIPES.find(
      (r) => wf.name.toLowerCase().includes(r.name.toLowerCase().split(' ')[0])
    )
    const defaultInputs: Record<string, string> = {}
    if (recipe) {
      recipe.inputs.forEach((inp) => { defaultInputs[inp.name] = '' })
    }
    setRunForm({ workflowId: wf.id, inputs: defaultInputs })
    setExecution(null)
  }, [])

  const handleRunWorkflow = useCallback(async () => {
    if (!runForm) return
    setRunningId(runForm.workflowId)
    setExecution(null)
    setError(undefined)

    try {
      // Filter out empty inputs
      const inputs: Record<string, unknown> = {}
      Object.entries(runForm.inputs).forEach(([k, v]) => {
        if (v.trim()) inputs[k] = v.trim()
      })

      const { workflowExecutionId } = await runWorkflow(runForm.workflowId, inputs)

      // Poll for completion
      const result = await pollExecution(workflowExecutionId, 1500, 40, (update) => {
        setExecution({ ...update })
      })
      setExecution(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Workflow run failed')
    } finally {
      setRunningId(undefined)
    }
  }, [runForm])

  // ------ Deploy recipe ------
  const handleDeploy = useCallback(async (recipe: WorkflowRecipe) => {
    setDeployingRecipeId(recipe.id)
    setDeploySuccess(undefined)
    setError(undefined)

    try {
      await createWorkflow(recipe.yaml)
      setDeploySuccess(`Deployed "${recipe.name}" successfully`)
      // Refresh the workflow list
      await loadWorkflows()
    } catch (err) {
      setError(err instanceof Error ? err.message : `Deploy failed for ${recipe.name}`)
    } finally {
      setDeployingRecipeId(undefined)
    }
  }, [loadWorkflows])

  // ------ Render ------
  return (
    <>
      <AppHeader />
      <EuiSpacer size="xxl" />
      <EuiSpacer size="l" />

      <EuiPageTemplate panelled={false} grow={true} restrictWidth={1100}>
        {/* Page Header */}
        <EuiPageTemplate.Header
          pageTitle={
            <EuiFlexGroup alignItems="center" gutterSize="m">
              <EuiFlexItem grow={false}>
                <EuiTitle size="l">
                  <h1 style={{ color: 'var(--brand-text-primary, inherit)' }}>Workflows</h1>
                </EuiTitle>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <HealthBadge status={healthStatus} />
              </EuiFlexItem>
            </EuiFlexGroup>
          }
          description="Deploy, manage, and run automated workflows powered by Kibana Workflows."
          rightSideItems={[
            <EuiButton
              key="refresh"
              iconType="refresh"
              size="s"
              onClick={() => { loadWorkflows(); checkHealth() }}
              isLoading={loadingWorkflows}
            >
              Refresh
            </EuiButton>,
          ]}
        />

        <EuiPageTemplate.Section>
          {/* Error callout */}
          {error && (
            <>
              <EuiCallOut title="Error" color="danger" iconType="error">
                {error}
              </EuiCallOut>
              <EuiSpacer size="m" />
            </>
          )}

          {/* Deploy success callout */}
          {deploySuccess && (
            <>
              <EuiCallOut title={deploySuccess} color="success" iconType="check" />
              <EuiSpacer size="m" />
            </>
          )}

          {/* ====== Available Workflows ====== */}
          <EuiPanel paddingSize="l">
            <EuiFlexGroup alignItems="center" justifyContent="spaceBetween">
              <EuiFlexItem grow={false}>
                <EuiTitle size="s">
                  <h2>Available Workflows</h2>
                </EuiTitle>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiBadge color="hollow">{workflows.length} deployed</EuiBadge>
              </EuiFlexItem>
            </EuiFlexGroup>
            <EuiSpacer size="m" />

            {loadingWorkflows && (
              <EuiFlexGroup justifyContent="center" style={{ padding: 40 }}>
                <EuiLoadingSpinner size="l" />
              </EuiFlexGroup>
            )}

            {!loadingWorkflows && workflows.length === 0 && (
              <EuiEmptyPrompt
                iconType="indexManagementApp"
                title={<h3>No workflows deployed</h3>}
                body="Deploy a recipe from the library below to get started."
              />
            )}

            {!loadingWorkflows && workflows.map((wf) => (
              <div key={wf.id}>
                <WorkflowRow
                  workflow={wf}
                  isRunning={runningId === wf.id}
                  onRun={() => handleOpenRunForm(wf)}
                />
                {/* Inline run form */}
                {runForm?.workflowId === wf.id && (
                  <RunFormPanel
                    runForm={runForm}
                    setRunForm={setRunForm}
                    onRun={handleRunWorkflow}
                    onCancel={() => { setRunForm(null); setExecution(null) }}
                    isRunning={runningId === wf.id}
                    execution={execution}
                  />
                )}
                <EuiHorizontalRule margin="s" />
              </div>
            ))}
          </EuiPanel>

          <EuiSpacer size="l" />

          {/* ====== Recipe Library ====== */}
          <EuiPanel paddingSize="l">
            <EuiTitle size="s">
              <h2>Recipe Library</h2>
            </EuiTitle>
            <EuiSpacer size="s" />
            <EuiText size="s" color="subdued">
              Pre-built YAML workflow definitions for common automation scenarios.
              Deploy a recipe to create it on the cluster.
            </EuiText>
            <EuiSpacer size="m" />

            {WORKFLOW_RECIPES.map((recipe) => (
              <RecipeCard
                key={recipe.id}
                recipe={recipe}
                isDeploying={deployingRecipeId === recipe.id}
                onDeploy={() => handleDeploy(recipe)}
              />
            ))}
          </EuiPanel>
        </EuiPageTemplate.Section>
      </EuiPageTemplate>
    </>
  )
}

// ============================================================================
// Sub-components
// ============================================================================

function HealthBadge({ status }: { status: 'healthy' | 'unhealthy' | 'loading' }) {
  if (status === 'loading') return <EuiBadge color="hollow">Checking...</EuiBadge>
  return (
    <EuiBadge color={status === 'healthy' ? 'success' : 'danger'}>
      {status === 'healthy' ? 'Healthy' : 'Unhealthy'}
    </EuiBadge>
  )
}

function WorkflowRow({
  workflow,
  isRunning,
  onRun,
}: {
  workflow: Workflow
  isRunning: boolean
  onRun: () => void
}) {
  return (
    <EuiFlexGroup alignItems="center" gutterSize="m" responsive={false}>
      <EuiFlexItem>
        <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiText size="s"><strong>{workflow.name}</strong></EuiText>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiBadge color={workflow.enabled ? 'success' : 'default'}>
              {workflow.enabled ? 'Enabled' : 'Disabled'}
            </EuiBadge>
          </EuiFlexItem>
          {workflow.tags?.map((tag) => (
            <EuiFlexItem key={tag} grow={false}>
              <EuiBadge color="hollow">{tag}</EuiBadge>
            </EuiFlexItem>
          ))}
        </EuiFlexGroup>
        {workflow.description && (
          <>
            <EuiSpacer size="xs" />
            <EuiText size="xs" color="subdued">{workflow.description}</EuiText>
          </>
        )}
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiButton
          size="s"
          onClick={onRun}
          isLoading={isRunning}
          iconType="playFilled"
          style={{
            backgroundColor: 'var(--brand-primary, #0077CC)',
            borderColor: 'var(--brand-primary, #0077CC)',
            color: '#fff',
          }}
        >
          Run
        </EuiButton>
      </EuiFlexItem>
    </EuiFlexGroup>
  )
}

function RunFormPanel({
  runForm,
  setRunForm,
  onRun,
  onCancel,
  isRunning,
  execution,
}: {
  runForm: RunFormState
  setRunForm: (f: RunFormState | null) => void
  onRun: () => void
  onCancel: () => void
  isRunning: boolean
  execution: WorkflowExecution | null
}) {
  const inputKeys = Object.keys(runForm.inputs)

  return (
    <EuiPanel color="subdued" paddingSize="m" style={{ marginTop: 8, marginBottom: 8 }}>
      {inputKeys.length > 0 ? (
        <>
          <EuiText size="xs"><strong>Inputs</strong></EuiText>
          <EuiSpacer size="s" />
          {inputKeys.map((key) => (
            <div key={key} style={{ marginBottom: 8 }}>
              <EuiFieldText
                placeholder={key}
                prepend={<EuiText size="xs"><span style={{ padding: '0 4px' }}>{key}</span></EuiText>}
                value={runForm.inputs[key]}
                onChange={(e) =>
                  setRunForm({
                    ...runForm,
                    inputs: { ...runForm.inputs, [key]: e.target.value },
                  })
                }
                fullWidth
                compressed
                disabled={isRunning}
              />
            </div>
          ))}
        </>
      ) : (
        <EuiText size="xs" color="subdued">No inputs defined. The workflow will run with defaults.</EuiText>
      )}

      <EuiSpacer size="s" />
      <EuiFlexGroup gutterSize="s" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiButton
            size="s"
            fill
            onClick={onRun}
            isLoading={isRunning}
            style={{
              backgroundColor: 'var(--brand-primary, #0077CC)',
              borderColor: 'var(--brand-primary, #0077CC)',
            }}
          >
            {isRunning ? 'Running...' : 'Execute'}
          </EuiButton>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty size="s" onClick={onCancel} disabled={isRunning}>
            Cancel
          </EuiButtonEmpty>
        </EuiFlexItem>
      </EuiFlexGroup>

      {/* Execution status */}
      {execution && (
        <>
          <EuiSpacer size="s" />
          <ExecutionStatus execution={execution} />
        </>
      )}
    </EuiPanel>
  )
}

function ExecutionStatus({ execution }: { execution: WorkflowExecution }) {
  const statusColor = {
    pending: 'hollow' as const,
    running: 'primary' as const,
    completed: 'success' as const,
    failed: 'danger' as const,
    cancelled: 'warning' as const,
  }

  return (
    <EuiPanel paddingSize="s" color="transparent">
      <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
        <EuiFlexItem grow={false}>
          {(execution.status === 'pending' || execution.status === 'running') && (
            <EuiLoadingSpinner size="s" />
          )}
          {execution.status === 'completed' && <EuiIcon type="checkInCircleFilled" color="success" />}
          {execution.status === 'failed' && <EuiIcon type="error" color="danger" />}
          {execution.status === 'cancelled' && <EuiIcon type="minusInCircle" color="warning" />}
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiBadge color={statusColor[execution.status]}>
            {execution.status}
          </EuiBadge>
        </EuiFlexItem>
        {execution.duration !== undefined && (
          <EuiFlexItem grow={false}>
            <EuiText size="xs" color="subdued">{(execution.duration / 1000).toFixed(1)}s</EuiText>
          </EuiFlexItem>
        )}
      </EuiFlexGroup>

      {/* Step results */}
      {execution.steps && execution.steps.length > 0 && (
        <>
          <EuiSpacer size="xs" />
          {execution.steps.map((step, i) => (
            <EuiFlexGroup key={i} gutterSize="xs" alignItems="center" responsive={false} style={{ paddingLeft: 16 }}>
              <EuiFlexItem grow={false}>
                <EuiText size="xs" color="subdued">{step.name}</EuiText>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiBadge color={statusColor[step.status] || 'hollow'}>
                  {step.status}
                </EuiBadge>
              </EuiFlexItem>
            </EuiFlexGroup>
          ))}
        </>
      )}

      {execution.error && (
        <>
          <EuiSpacer size="xs" />
          <EuiCallOut title="Execution error" color="danger" size="s">
            {execution.error}
          </EuiCallOut>
        </>
      )}
    </EuiPanel>
  )
}

function RecipeCard({
  recipe,
  isDeploying,
  onDeploy,
}: {
  recipe: WorkflowRecipe
  isDeploying: boolean
  onDeploy: () => void
}) {
  return (
    <>
      <EuiFlexGroup alignItems="center" gutterSize="m" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiToolTip content={recipe.triggerType}>
            <EuiIcon type={recipe.icon} size="l" color={recipe.color} />
          </EuiToolTip>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiText size="s"><strong>{recipe.name}</strong></EuiText>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiBadge color={recipe.color}>{recipe.triggerType}</EuiBadge>
            </EuiFlexItem>
          </EuiFlexGroup>
          <EuiSpacer size="xs" />
          <EuiText size="xs" color="subdued">{recipe.description}</EuiText>
          {recipe.inputs.length > 0 && (
            <>
              <EuiSpacer size="xs" />
              <EuiText size="xs" color="subdued">
                Inputs: {recipe.inputs.map((inp) => inp.name).join(', ')}
              </EuiText>
            </>
          )}
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiAccordion
            id={`recipe-yaml-${recipe.id}`}
            buttonContent={<EuiText size="xs">YAML</EuiText>}
            paddingSize="s"
          >
            <pre style={{ fontSize: 11, maxHeight: 200, overflow: 'auto', whiteSpace: 'pre-wrap' }}>
              {recipe.yaml}
            </pre>
          </EuiAccordion>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButton
            size="s"
            fill
            onClick={onDeploy}
            isLoading={isDeploying}
            iconType="importAction"
            style={{
              backgroundColor: 'var(--brand-primary, #0077CC)',
              borderColor: 'var(--brand-primary, #0077CC)',
            }}
          >
            Deploy
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiHorizontalRule margin="s" />
    </>
  )
}

