/**
 * AgentSelector Component
 * 
 * Allows users to select which Agent Builder agents are available
 * for the coordinator LLM to call. Fetches agents from backend and
 * provides a multi-select interface.
 */

import { useState, useEffect } from 'react'
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiSelectable,
  EuiText,
  EuiSpacer,
  EuiIcon,
  EuiLoadingSpinner,
  EuiCallOut,
  EuiSwitch,
  EuiPanel,
  EuiAccordion,
  EuiBadge,
  EuiCode,
} from '@elastic/eui'
import { fetchAgents } from '../../services/llmProxyApi'


export interface Agent {
  id: string
  name: string
  description: string
  skills: Array<{
    id: string
    name: string
    description: string
  }>
}

export interface AgentSelectorProps {
  /** Selected agent IDs */
  selectedAgentIds: string[]
  /** Callback when selection changes */
  onSelectionChange: (agentIds: string[]) => void
  /** Whether to show agent descriptions inline */
  showDescriptions?: boolean
}

export function AgentSelector({
  selectedAgentIds,
  onSelectionChange,
  showDescriptions = false,
}: AgentSelectorProps) {
  const [agents, setAgents] = useState<Agent[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showDetails, setShowDetails] = useState(false)

  // Fetch agents on mount
  useEffect(() => {
    let cancelled = false

    async function loadAgents() {
      try {
        setIsLoading(true)
        setError(null)
        const data = await fetchAgents()
        
        if (!cancelled) {
          const agentsList = data.agents || []
          setAgents(agentsList)
          setIsLoading(false)
          
          // If no selection yet, default to all agents
          if (selectedAgentIds.length === 0 && agentsList.length > 0) {
            const allIds = agentsList.map(a => a.id).filter(Boolean)
            onSelectionChange(allIds)
          }
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load agents')
          setIsLoading(false)
        }
      }
    }

    loadAgents()

    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // Only run on mount - onSelectionChange is stable from parent

  // Build selectable options
  const selectableOptions = agents
    .filter(agent => agent && agent.id && agent.name) // Filter out invalid agents
    .map(agent => ({
      label: agent.name,
      key: agent.id,
      checked: selectedAgentIds.includes(agent.id) ? ('on' as const) : undefined,
      description: showDescriptions ? agent.description : undefined,
      'data-agent-id': agent.id,
    }))

  const handleSelectionChange = (options: Array<{ key?: string; checked?: string }>) => {
    const newSelection = options
      .filter(opt => opt.checked === 'on' && opt.key)
      .map(opt => opt.key!)
    
    onSelectionChange(newSelection)
  }

  // Render loading state inside the standard structure
  if (isLoading) {
    return (
      <EuiFlexGroup alignItems="center" gutterSize="s">
        <EuiFlexItem grow={false}>
          <EuiLoadingSpinner size="s" />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiText size="s" color="subdued">Loading agents...</EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
    )
  }

  if (error) {
    return (
      <EuiCallOut
        title="Failed to load agents"
        color="danger"
        iconType="alert"
      >
        <p>{error}</p>
      </EuiCallOut>
    )
  }

  if (agents.length === 0) {
    return (
      <EuiCallOut
        title="No agents available"
        color="warning"
        iconType="help"
      >
        <p>No Agent Builder agents are currently available.</p>
      </EuiCallOut>
    )
  }

  return (
    <div>
      <EuiFlexGroup alignItems="center" gutterSize="s" justifyContent="spaceBetween">
        <EuiFlexItem grow={false}>
          <EuiFlexGroup alignItems="center" gutterSize="s">
            <EuiFlexItem grow={false}>
              <EuiIcon type="cluster" color="primary" />
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiText>
                <h4 style={{ margin: 0 }}>Available Agents</h4>
              </EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiSwitch
            label="Show details"
            checked={showDetails}
            onChange={(e) => setShowDetails(e.target.checked)}
            compressed
          />
        </EuiFlexItem>
      </EuiFlexGroup>
      
      <EuiSpacer size="s" />
      
      <EuiText size="xs" color="subdued">
        Select which agents the coordinator can call. 
        {selectedAgentIds.length === 0 && ' At least one agent must be selected.'}
      </EuiText>
      
      <EuiSpacer size="m" />
      
      
      {selectableOptions.length > 0 ? (
        <>
          <div style={{ 
            border: '1px solid var(--euiColorLightShade)', 
            borderRadius: '6px', 
            padding: '12px',
          }}>
            <EuiSelectable
              searchable
              searchProps={{
                placeholder: 'Search agents...',
              }}
              options={selectableOptions}
              onChange={handleSelectionChange}
              aria-label="Agent selection"
              singleSelection={false}
              listProps={{
                bordered: false,
              }}
            >
              {(list, search) => (
                <>
                  {search}
                  <EuiSpacer size="s" />
                  <div style={{ 
                    maxHeight: '150px', 
                    overflowY: 'auto',
                    padding: '4px 0'
                  }}>
                    {list}
                  </div>
                </>
              )}
            </EuiSelectable>
          </div>

          {/* Detailed Agent Cards */}
          {showDetails && (
            <>
              <EuiSpacer size="m" />
              <EuiText size="s" color="subdued">
                <strong>Agent Details</strong>
              </EuiText>
              <EuiSpacer size="s" />
              {agents.map((agent) => (
                <div key={agent.id} style={{ marginBottom: '12px' }}>
                  <EuiPanel paddingSize="m" hasShadow={false} hasBorder>
                    <EuiFlexGroup alignItems="center" gutterSize="s">
                      <EuiFlexItem grow={false}>
                        <EuiIcon 
                          type="compute" 
                          color={selectedAgentIds.includes(agent.id) ? 'primary' : 'subdued'} 
                        />
                      </EuiFlexItem>
                      <EuiFlexItem>
                        <EuiText size="s">
                          <strong>{agent.name}</strong>
                        </EuiText>
                      </EuiFlexItem>
                      <EuiFlexItem grow={false}>
                        {selectedAgentIds.includes(agent.id) ? (
                          <EuiBadge color="primary">Selected</EuiBadge>
                        ) : (
                          <EuiBadge color="hollow">Not Selected</EuiBadge>
                        )}
                      </EuiFlexItem>
                    </EuiFlexGroup>
                    
                    <EuiSpacer size="s" />
                    
                    <EuiText size="xs" color="subdued">
                      <p style={{ margin: 0 }}>{agent.description}</p>
                    </EuiText>
                    
                    <EuiSpacer size="xs" />
                    
                    <EuiText size="xs" color="subdued">
                      <strong>ID:</strong> <EuiCode>{agent.id}</EuiCode>
                    </EuiText>
                    
                    {agent.skills && agent.skills.length > 0 && (
                      <>
                        <EuiSpacer size="s" />
                        <EuiAccordion
                          id={`skills-${agent.id}`}
                          buttonContent={
                            <EuiFlexGroup alignItems="center" gutterSize="s">
                              <EuiFlexItem grow={false}>
                                <EuiIcon type="wrench" size="s" />
                              </EuiFlexItem>
                              <EuiFlexItem>
                                <EuiText size="xs">
                                  <strong>{agent.skills.length} Skills Available</strong>
                                </EuiText>
                              </EuiFlexItem>
                            </EuiFlexGroup>
                          }
                          paddingSize="s"
                        >
                          <div style={{ 
                            maxHeight: '200px', 
                            overflowY: 'auto',
                            padding: '8px',
                            background: 'var(--euiColorLightestShade)',
                            borderRadius: '4px',
                          }}>
                            {agent.skills.map((skill, idx) => (
                              <div 
                                key={skill.id || idx}
                                style={{ 
                                  marginBottom: idx < agent.skills.length - 1 ? '12px' : 0,
                                  paddingBottom: idx < agent.skills.length - 1 ? '12px' : 0,
                                  borderBottom: idx < agent.skills.length - 1 ? '1px solid var(--euiColorLightShade)' : 'none',
                                }}
                              >
                                <EuiFlexGroup alignItems="center" gutterSize="xs">
                                  <EuiFlexItem grow={false}>
                                    <EuiIcon type="function" size="s" color="primary" />
                                  </EuiFlexItem>
                                  <EuiFlexItem>
                                    <EuiText size="xs">
                                      <strong>{skill.name}</strong>
                                    </EuiText>
                                  </EuiFlexItem>
                                </EuiFlexGroup>
                                {skill.description && (
                                  <EuiText size="xs" color="subdued" style={{ marginTop: '4px', paddingLeft: '20px' }}>
                                    <p style={{ 
                                      margin: 0, 
                                      whiteSpace: 'pre-wrap',
                                      maxHeight: '100px',
                                      overflow: 'hidden',
                                      textOverflow: 'ellipsis',
                                    }}>
                                      {skill.description.length > 200 
                                        ? skill.description.substring(0, 200) + '...' 
                                        : skill.description
                                      }
                                    </p>
                                  </EuiText>
                                )}
                              </div>
                            ))}
                          </div>
                        </EuiAccordion>
                      </>
                    )}
                  </EuiPanel>
                </div>
              ))}
            </>
          )}
          
        </>
      ) : (
        <EuiCallOut
          title="No valid agents found"
          color="warning"
          iconType="help"
        >
          <p>Found {agents.length} agents but none have valid IDs or names.</p>
          {import.meta.env.DEV && (
            <pre style={{ fontSize: '10px', marginTop: '8px' }}>
              {JSON.stringify(agents.slice(0, 1), null, 2)}
            </pre>
          )}
        </EuiCallOut>
      )}
      
      {selectedAgentIds.length > 0 && (
        <>
          <EuiSpacer size="s" />
          <EuiText size="xs" color="subdued">
            {selectedAgentIds.length} agent{selectedAgentIds.length !== 1 ? 's' : ''} selected
          </EuiText>
        </>
      )}
    </div>
  )
}

