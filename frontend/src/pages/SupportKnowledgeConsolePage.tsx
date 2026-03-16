import { useMemo, useRef, useState } from 'react'
import {
  EuiBadge,
  EuiButton,
  EuiButtonEmpty,
  EuiCallOut,
  EuiCard,
  EuiEmptyPrompt,
  EuiFacetButton,
  EuiFacetGroup,
  EuiFieldSearch,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiLoadingSpinner,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui'
import { AppHeader } from '../components/layout/AppHeader'
import { ChatContainer, type ChatContainerRef } from '../components/chat/ChatContainer'
import { SplitChatContentLayout } from '../components/common/SplitChatContentLayout'
import { BrandedEmptyState } from '../components/common/BrandedEmptyState'
import { TaskSwitcher, type TaskDef } from '../components/common/TaskSwitcher'
import { DemoPromptPills } from '../components/demo'
import { useSearchSimple, type SearchHit } from '../hooks/useSearchSimple'
import { searchConfig } from '../config/searchConfig'
import { DEFAULT_PERSONA, buildPersonalisedGreeting } from '../config/agentPersona'

interface FaultRecord {
  fault_id?: string
  fault_description?: string
  resolution_procedure?: string
  severity?: string
  status?: string
  equipment_type?: string
  equipment_model?: string
  factory_location?: string
  estimated_repair_hours?: number
  timestamp?: string
}

const TASKS: TaskDef[] = [
  { id: 'keyword', label: 'Exact Lookup', icon: 'search', color: '#0B62D6' },
  { id: 'semantic', label: 'Symptom Discovery', icon: 'sparkles', color: '#7B1FA2' },
]

const INSIGHTS_IMAGE =
  'https://images.unsplash.com/photo-1581092162384-8987c1d64718?w=1400&h=500&fit=crop'
const EMPTY_IMAGE =
  'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=420&h=420&fit=crop'

function toFaultRecord(hit: SearchHit): FaultRecord {
  return hit.source as FaultRecord
}

function toSentenceCase(value: string | undefined): string {
  if (!value) return 'Unknown'
  return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase()
}

export function SupportKnowledgeConsolePage() {
  const persona = DEFAULT_PERSONA
  const chatRef = useRef<ChatContainerRef>(null)
  const [activeTask, setActiveTask] = useState<TaskDef>(TASKS[0])
  const [activeTabId, setActiveTabId] = useState('incidents')
  const [searchInput, setSearchInput] = useState('')
  const [hasSearched, setHasSearched] = useState(false)
  const [selectedHit, setSelectedHit] = useState<SearchHit | null>(null)

  const {
    results,
    total,
    loading,
    error,
    filters,
    aggregations,
    setFilter,
    setQuery,
    search,
    clearFilters,
    tookMs,
  } = useSearchSimple({
    pageSize: searchConfig.pageSize ?? 12,
    searchType: activeTask.id,
  })

  const selectedRecord = selectedHit ? toFaultRecord(selectedHit) : null

  const facetViews = useMemo(() => {
    return (searchConfig.facets ?? []).map((facetConfig) => {
      const buckets = aggregations[facetConfig.field] || []
      return { facetConfig, buckets }
    })
  }, [aggregations])

  const highSeverityCount = results.reduce((count, hit) => {
    const value = toFaultRecord(hit).severity?.toLowerCase()
    return value === 'high' || value === 'critical' ? count + 1 : count
  }, 0)

  const handleSearch = () => {
    setQuery(searchInput)
    setHasSearched(true)
    search({ query: searchInput, searchType: activeTask.id })
  }

  const handleSendToCopilot = (hit: SearchHit) => {
    const record = toFaultRecord(hit)
    const prompt = [
      `Explain the recommended next steps for fault ${record.fault_id ?? 'unknown'}.`,
      `Severity: ${record.severity ?? 'unknown'}.`,
      `Equipment: ${record.equipment_type ?? 'unknown'} (${record.equipment_model ?? 'unknown model'}).`,
      `Issue summary: ${record.fault_description ?? 'No description provided.'}`,
      `Procedure context: ${record.resolution_procedure ?? 'No procedure available.'}`,
      'Respond in executive-friendly language and include immediate action, risk, and likely downtime.',
    ].join('\n')

    setSelectedHit(hit)
    setActiveTabId('case')
    chatRef.current?.sendMessage(prompt)
  }

  const renderIncidentsTab = () => {
    if (loading) {
      return (
        <EuiFlexGroup justifyContent="center" alignItems="center" style={{ minHeight: 220 }}>
          <EuiLoadingSpinner size="xl" />
        </EuiFlexGroup>
      )
    }

    if (error) {
      return (
        <EuiCallOut title="Search Error" color="danger" iconType="alert">
          {error}
        </EuiCallOut>
      )
    }

    if (!hasSearched) {
      return (
        <BrandedEmptyState
          imageUrl={EMPTY_IMAGE}
          title="Start with a support question"
          body="Search by symptom, fault ID, or part number to surface likely incidents."
          actions={
            <EuiButton fill onClick={() => {
              setSearchInput('high vibration at high RPM')
              setQuery('high vibration at high RPM')
              setHasSearched(true)
              search({ query: 'high vibration at high RPM', searchType: activeTask.id })
            }}>
              Run guided example
            </EuiButton>
          }
        />
      )
    }

    if (results.length === 0) {
      return (
        <EuiEmptyPrompt
          iconType="search"
          title={<h3>No matching incidents</h3>}
          body={<p>Try broadening the symptom wording or clear active filters.</p>}
          actions={<EuiButton onClick={clearFilters}>Clear filters</EuiButton>}
        />
      )
    }

    return (
      <>
        <EuiFlexGroup gutterSize="m" wrap>
          {results.map((hit) => {
            const source = toFaultRecord(hit)
            const isSelected = selectedHit?.id === hit.id
            return (
              <EuiFlexItem key={hit.id} grow={false} style={{ width: 320 }}>
                <EuiCard
                  title={source.fault_id || 'Fault record'}
                  textAlign="left"
                  titleSize="xs"
                  description={
                    <div>
                      <EuiText size="s" color="subdued">
                        <p>{source.fault_description || 'No description available.'}</p>
                      </EuiText>
                      <EuiSpacer size="s" />
                      <EuiFlexGroup gutterSize="xs" wrap responsive={false}>
                        <EuiFlexItem grow={false}><EuiBadge color="danger">{toSentenceCase(source.severity)}</EuiBadge></EuiFlexItem>
                        <EuiFlexItem grow={false}><EuiBadge color="hollow">{source.equipment_type || 'Unknown type'}</EuiBadge></EuiFlexItem>
                        <EuiFlexItem grow={false}><EuiBadge color="primary">{toSentenceCase(source.status)}</EuiBadge></EuiFlexItem>
                      </EuiFlexGroup>
                    </div>
                  }
                  selectable={{
                    isSelected,
                    onClick: () => {
                      setSelectedHit(hit)
                      setActiveTabId('case')
                    },
                  }}
                  footer={
                    <EuiFlexGroup gutterSize="s" responsive={false}>
                      <EuiFlexItem grow={false}>
                        <EuiButtonEmpty size="s" onClick={() => {
                          setSelectedHit(hit)
                          setActiveTabId('case')
                        }}>
                          Inspect
                        </EuiButtonEmpty>
                      </EuiFlexItem>
                      <EuiFlexItem grow={false}>
                        <EuiButton size="s" fill onClick={() => handleSendToCopilot(hit)}>
                          Send to Copilot
                        </EuiButton>
                      </EuiFlexItem>
                    </EuiFlexGroup>
                  }
                />
              </EuiFlexItem>
            )
          })}
        </EuiFlexGroup>
      </>
    )
  }

  const renderCaseTab = () => {
    if (!selectedRecord) {
      return (
        <BrandedEmptyState
          iconType="document"
          title="No case selected"
          body="Pick an incident and use Send to Copilot to generate an executive-ready summary."
        />
      )
    }

    return (
      <EuiPanel hasBorder paddingSize="l">
        <EuiTitle size="s">
          <h3>Case Brief: {selectedRecord.fault_id || 'Incident'}</h3>
        </EuiTitle>
        <EuiSpacer size="m" />
        <EuiFlexGroup gutterSize="s" wrap responsive={false}>
          <EuiFlexItem grow={false}><EuiBadge color="danger">{toSentenceCase(selectedRecord.severity)}</EuiBadge></EuiFlexItem>
          <EuiFlexItem grow={false}><EuiBadge>{selectedRecord.equipment_type || 'Unknown type'}</EuiBadge></EuiFlexItem>
          <EuiFlexItem grow={false}><EuiBadge color="hollow">{selectedRecord.factory_location || 'Unknown factory'}</EuiBadge></EuiFlexItem>
        </EuiFlexGroup>
        <EuiSpacer size="m" />
        <EuiText size="s">
          <p><strong>Issue:</strong> {selectedRecord.fault_description || 'No description available.'}</p>
          <p><strong>Resolution procedure:</strong> {selectedRecord.resolution_procedure || 'No procedure available.'}</p>
          <p><strong>Estimated repair hours:</strong> {selectedRecord.estimated_repair_hours ?? 'N/A'}</p>
        </EuiText>
        <EuiSpacer size="m" />
        <EuiCallOut title="Presenter cue" iconType="training" color="primary" size="s">
          Frame this as the decision moment: the team has context, risk, and next action without searching multiple systems.
        </EuiCallOut>
      </EuiPanel>
    )
  }

  return (
    <>
      <AppHeader />
      <SplitChatContentLayout
        topBar={
          <TaskSwitcher
            tasks={TASKS}
            activeTaskId={activeTask.id}
            onSwitch={(task) => {
              setActiveTask(task)
              if (hasSearched) {
                search({ query: searchInput, searchType: task.id })
              }
            }}
          />
        }
        chatTopSlot={
          <EuiPanel hasBorder paddingSize="s">
            <DemoPromptPills
              label="Support prompts:"
              onPromptSelect={(prompt) => chatRef.current?.sendMessage(prompt)}
            />
          </EuiPanel>
        }
        chatPanel={
          <ChatContainer
            ref={chatRef}
            title={persona.name}
            greeting={buildPersonalisedGreeting(persona, null, true)}
            placeholder="Ask for diagnosis, risk, or executive summary..."
          />
        }
        tabs={[
          { id: 'incidents', label: 'Incident Search', icon: 'search', count: total },
          { id: 'case', label: 'Case Brief', icon: 'document', hasContent: Boolean(selectedHit) },
        ]}
        activeTabId={activeTabId}
        onTabChange={setActiveTabId}
        contentPanel={
          <>
            <EuiPanel
              hasBorder={false}
              paddingSize="l"
              style={{
                backgroundImage: `linear-gradient(rgba(7, 43, 91, 0.72), rgba(7, 43, 91, 0.72)), url(${INSIGHTS_IMAGE})`,
                backgroundPosition: 'center',
                backgroundSize: 'cover',
                borderRadius: 12,
                color: '#FFFFFF',
              }}
            >
              <EuiTitle size="s"><h2 style={{ color: '#FFFFFF' }}>EE Support Knowledge Copilot</h2></EuiTitle>
              <EuiSpacer size="s" />
              <EuiText size="s" style={{ color: 'rgba(255,255,255,0.95)' }}>
                <p>Move from symptom to action in one conversation, with incident evidence and clear next steps.</p>
              </EuiText>
            </EuiPanel>
            <EuiSpacer size="m" />

            <EuiPanel hasBorder paddingSize="m">
              <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
                <EuiFlexItem>
                  <EuiFieldSearch
                    placeholder={activeTask.id === 'semantic'
                      ? 'Describe an issue in plain language'
                      : 'Search by fault ID, part number, or technician'}
                    value={searchInput}
                    onChange={(event) => setSearchInput(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        handleSearch()
                      }
                    }}
                    fullWidth
                    isClearable
                  />
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiButton fill onClick={handleSearch} isLoading={loading}>
                    Search
                  </EuiButton>
                </EuiFlexItem>
              </EuiFlexGroup>
              <EuiSpacer size="s" />
              <EuiText size="xs" color="subdued">
                <p>
                  {total.toLocaleString()} incidents
                  {tookMs !== null ? ` found in ${tookMs}ms` : ''}
                  {highSeverityCount > 0 ? ` • ${highSeverityCount} high/critical` : ''}
                </p>
              </EuiText>
            </EuiPanel>

            <EuiSpacer size="m" />
            <EuiFlexGroup gutterSize="m">
              <EuiFlexItem grow={false} style={{ width: 220 }}>
                <EuiPanel hasBorder paddingSize="m">
                  <EuiTitle size="xxs"><h5>Filters</h5></EuiTitle>
                  <EuiSpacer size="s" />
                  {(facetViews.length === 0 || !hasSearched) ? (
                    <EuiText size="xs" color="subdued">
                      <p>Search to load filter buckets.</p>
                    </EuiText>
                  ) : (
                    facetViews.map(({ facetConfig, buckets }) => (
                      <div key={facetConfig.field}>
                        <EuiText size="xs"><strong>{facetConfig.label}</strong></EuiText>
                        <EuiSpacer size="xs" />
                        <EuiFacetGroup>
                          {buckets.slice(0, 8).map((bucket) => {
                            const isSelected = filters[facetConfig.field] === bucket.key
                            return (
                              <EuiFacetButton
                                key={`${facetConfig.field}-${bucket.key}`}
                                quantity={bucket.doc_count}
                                isSelected={isSelected}
                                onClick={() => {
                                  setFilter(facetConfig.field, isSelected ? null : bucket.key)
                                  search()
                                }}
                              >
                                {bucket.key}
                              </EuiFacetButton>
                            )
                          })}
                        </EuiFacetGroup>
                        <EuiSpacer size="s" />
                        <EuiHorizontalRule margin="s" />
                      </div>
                    ))
                  )}
                  <EuiButtonEmpty size="xs" onClick={clearFilters}>Clear all</EuiButtonEmpty>
                </EuiPanel>
              </EuiFlexItem>

              <EuiFlexItem>
                {activeTabId === 'incidents' ? renderIncidentsTab() : renderCaseTab()}
              </EuiFlexItem>
            </EuiFlexGroup>
          </>
        }
      />
    </>
  )
}

export default SupportKnowledgeConsolePage
