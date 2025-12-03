/**
 * ConversationList Component
 * 
 * Displays a filterable list of conversations for selection.
 * Shows agent filter dropdown, conversation titles, and timestamps.
 */

import {
  EuiBasicTable,
  EuiBasicTableColumn,
  EuiEmptyPrompt,
  EuiLoadingSpinner,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSelect,
  EuiButtonIcon,
  EuiTitle,
  EuiSpacer,
  EuiBadge,
} from '@elastic/eui'
import { ConversationSummary } from '../../services/auditApi'
import { formatShortDate } from '../../utils/dateUtils'

interface ConversationListProps {
  conversations: ConversationSummary[]
  isLoading: boolean
  selectedId?: string
  onSelectConversation: (id: string) => void
  agentFilter: string
  onAgentFilterChange: (agentId: string) => void
  onRefresh: () => void
  agents: string[]
}

export function ConversationList({
  conversations,
  isLoading,
  selectedId,
  onSelectConversation,
  agentFilter,
  onAgentFilterChange,
  onRefresh,
  agents,
}: ConversationListProps) {
  // Agent filter options
  const agentOptions = [
    { value: '', text: 'All Agents' },
    ...agents.map(agent => ({ value: agent, text: agent })),
  ]

  // Table columns
  const columns: EuiBasicTableColumn<ConversationSummary>[] = [
    {
      field: 'title',
      name: 'Conversation',
      truncateText: true,
      render: (title: string, item: ConversationSummary) => (
        <span style={{ fontWeight: item.id === selectedId ? 600 : 400 }}>
          {title || 'Untitled conversation'}
        </span>
      ),
    },
    {
      field: 'agent_id',
      name: 'Agent',
      width: '120px',
      render: (agentId: string) => (
        <EuiBadge color="hollow">{agentId}</EuiBadge>
      ),
    },
    {
      field: 'created_at',
      name: 'Date',
      width: '120px',
      render: (date: string) => formatShortDate(date),
    },
  ]

  // Loading state
  if (isLoading && conversations.length === 0) {
    return (
      <EuiFlexGroup justifyContent="center" alignItems="center" style={{ minHeight: 200 }}>
        <EuiFlexItem grow={false}>
          <EuiLoadingSpinner size="l" />
        </EuiFlexItem>
      </EuiFlexGroup>
    )
  }

  return (
    <div>
      {/* Header with filter and refresh */}
      <EuiFlexGroup alignItems="center" gutterSize="m">
        <EuiFlexItem>
          <EuiTitle size="xs">
            <h3>Conversations</h3>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButtonIcon
            iconType="refresh"
            aria-label="Refresh conversations"
            onClick={onRefresh}
            isLoading={isLoading}
          />
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiSpacer size="s" />

      {/* Agent filter */}
      <EuiSelect
        prepend="Agent"
        options={agentOptions}
        value={agentFilter}
        onChange={(e) => onAgentFilterChange(e.target.value)}
        compressed
        fullWidth
      />

      <EuiSpacer size="m" />

      {/* Conversation table */}
      {conversations.length === 0 ? (
        <EuiEmptyPrompt
          iconType="inspect"
          title={<h3>No conversations</h3>}
          body={
            <p>
              {agentFilter
                ? `No conversations found for agent "${agentFilter}".`
                : 'No conversations have been recorded yet.'}
            </p>
          }
        />
      ) : (
        <EuiBasicTable
          items={conversations}
          columns={columns}
          rowProps={(item) => ({
            onClick: () => onSelectConversation(item.id),
            style: {
              cursor: 'pointer',
              backgroundColor: item.id === selectedId ? 'var(--euiColorLightShade)' : undefined,
            },
          })}
          loading={isLoading}
        />
      )}
    </div>
  )
}
