/**
 * AuditPage
 * 
 * Main page for viewing conversation history and audit details.
 * Displays a list of conversations on the left and detail view on the right.
 */

import { useState, useEffect, useCallback } from 'react'
import {
  EuiPage,
  EuiPageBody,
  EuiPageHeader,
  EuiPageSection,
  EuiSpacer,
  EuiSplitPanel,
  EuiCallOut,
} from '@elastic/eui'
import { PageInfoButton, PAGE_INFO } from '../components/layout/PageInfoButton'
import { ConversationList, ConversationDetail } from '../components/audit'
import {
  listConversations,
  getConversation,
  ConversationSummary,
  ConversationDetail as ConversationDetailType,
} from '../services/auditApi'

/**
 * Audit page with master-detail layout
 */
export function AuditPage() {
  // State
  const [conversations, setConversations] = useState<ConversationSummary[]>([])
  const [selectedConversation, setSelectedConversation] = useState<ConversationDetailType | null>(null)
  const [selectedId, setSelectedId] = useState<string>()
  const [agentFilter, setAgentFilter] = useState('')
  const [isLoadingList, setIsLoadingList] = useState(true)
  const [isLoadingDetail, setIsLoadingDetail] = useState(false)
  const [error, setError] = useState<string>()
  
  // Extract unique agents from conversations
  const agents = Array.from(new Set(conversations.map(c => c.agent_id))).sort()
  
  // Load conversations list
  const loadConversations = useCallback(async () => {
    setIsLoadingList(true)
    setError(undefined)
    
    try {
      const results = await listConversations(agentFilter || undefined)
      // Sort by created_at descending (newest first)
      results.sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )
      setConversations(results)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load conversations')
    } finally {
      setIsLoadingList(false)
    }
  }, [agentFilter])
  
  // Load conversation detail
  const loadConversationDetail = useCallback(async (id: string) => {
    setIsLoadingDetail(true)
    setError(undefined)
    
    try {
      const detail = await getConversation(id)
      setSelectedConversation(detail)
      setSelectedId(id)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load conversation')
      setSelectedConversation(null)
    } finally {
      setIsLoadingDetail(false)
    }
  }, [])
  
  // Initial load
  useEffect(() => {
    loadConversations()
  }, [loadConversations])
  
  // Handle conversation selection
  const handleSelectConversation = (id: string) => {
    if (id !== selectedId) {
      loadConversationDetail(id)
    }
  }
  
  // Handle agent filter change
  const handleAgentFilterChange = (agentId: string) => {
    setAgentFilter(agentId)
    setSelectedId(undefined)
    setSelectedConversation(null)
  }
  
  return (
    <>
      <EuiSpacer size="xxl" />
      <EuiSpacer size="l" />
      
      <EuiPage paddingSize="l">
        <EuiPageBody>
          <EuiPageHeader
            pageTitle="Conversation Audit"
            iconType="inspect"
            description="Review past conversations including agent reasoning and tool usage"
            rightSideItems={[
              <PageInfoButton key="info" {...PAGE_INFO.audit} />
            ]}
          />
        
        {error && (
          <EuiCallOut title="Error" color="danger" iconType="error">
            {error}
          </EuiCallOut>
        )}
        
        <EuiPageSection>
          <EuiSplitPanel.Outer direction="row" hasBorder>
            {/* Left Panel - Conversation List */}
            <EuiSplitPanel.Inner
              paddingSize="m"
              style={{ 
                minWidth: 400, 
                maxWidth: 500,
                overflowY: 'auto',
                maxHeight: 'calc(100vh - 200px)',
              }}
            >
              <ConversationList
                conversations={conversations}
                isLoading={isLoadingList}
                selectedId={selectedId}
                onSelectConversation={handleSelectConversation}
                agentFilter={agentFilter}
                onAgentFilterChange={handleAgentFilterChange}
                onRefresh={loadConversations}
                agents={agents}
              />
            </EuiSplitPanel.Inner>
            
            {/* Right Panel - Conversation Detail */}
            <EuiSplitPanel.Inner
              paddingSize="m"
              style={{ 
                flex: 1,
                overflowY: 'auto',
                maxHeight: 'calc(100vh - 200px)',
              }}
            >
              <ConversationDetail
                conversation={selectedConversation}
                isLoading={isLoadingDetail}
              />
            </EuiSplitPanel.Inner>
          </EuiSplitPanel.Outer>
        </EuiPageSection>
      </EuiPageBody>
    </EuiPage>
    </>
  )
}

export default AuditPage

