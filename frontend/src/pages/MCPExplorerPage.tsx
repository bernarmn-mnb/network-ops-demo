/**
 * MCP Explorer Page
 * 
 * Interactive UI for exploring and testing the Elastic Agent Builder MCP server.
 * 
 * Features:
 * - Connection status display (server info, protocol version)
 * - MCP endpoint URL with copy functionality
 * - Client configuration examples for Cursor IDE and Claude Desktop
 * - Tools summary (total, built-in, custom counts)
 * - Interactive tool tester:
 *   - Browse all available tools (custom and built-in)
 *   - View tool descriptions and parameter schemas
 *   - Test tools with custom arguments
 *   - View raw JSON results
 * 
 * Backend API:
 * - GET /api/mcp/info - Server connection info and client configs
 * - GET /api/mcp/tools - List all available tools
 * - POST /api/mcp/tools/call - Execute a tool with arguments
 * 
 * @see hive-mind/patterns/agent-builder/MCP_SERVER_INTEGRATION.md for protocol details
 */

import { useState, useEffect, useCallback } from 'react'
import {
  EuiPage,
  EuiPageBody,
  EuiPageHeader,
  EuiPanel,
  EuiFlexGroup,
  EuiFlexItem,
  EuiTitle,
  EuiText,
  EuiSpacer,
  EuiCallOut,
  EuiCode,
  EuiCodeBlock,
  EuiButton,
  EuiButtonEmpty,
  EuiLoadingSpinner,
  EuiBadge,
  EuiDescriptionList,
  EuiFieldText,
  EuiFormRow,
  EuiTabs,
  EuiTab,
  EuiIcon,
  EuiCopy,
  EuiToolTip,
  EuiHorizontalRule,
  EuiTextArea,
} from '@elastic/eui'
import { AppHeader } from '../components/layout/AppHeader'
import { PageInfoButton, PAGE_INFO } from '../components/layout/PageInfoButton'

// Types
interface ServerInfo {
  name: string
  version: string
}

interface MCPInfo {
  connected: boolean
  error: string | null
  mcp_url: string
  kibana_url: string
  server_info: ServerInfo
  protocol_version: string
  capabilities: Record<string, unknown>
  configuration_examples: {
    cursor: { path: string; config: unknown }
    claude_desktop: { path: string; config: unknown }
  }
}

interface ToolSchema {
  type: string
  properties?: Record<string, { type: string; description?: string }>
  required?: string[]
}

interface Tool {
  name: string
  description: string
  inputSchema: ToolSchema
}

interface ToolsResponse {
  total: number
  builtin_count: number
  custom_count: number
  builtin_tools: Tool[]
  custom_tools: Tool[]
  error?: string
}

interface ToolResult {
  success: boolean
  tool_name: string
  parsed_results: unknown[] | null
  result_count: number
  raw_result: unknown
}

// Use relative URL - Vite proxy handles routing to backend
const API_BASE = ''

export function MCPExplorerPage() {
  const [mcpInfo, setMcpInfo] = useState<MCPInfo | null>(null)
  const [tools, setTools] = useState<ToolsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [toolsLoading, setToolsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Tool testing state
  const [selectedTool, setSelectedTool] = useState<Tool | null>(null)
  const [toolArgs, setToolArgs] = useState<Record<string, string>>({})
  const [testResult, setTestResult] = useState<ToolResult | null>(null)
  const [testing, setTesting] = useState(false)
  
  // Config tab
  const [configTab, setConfigTab] = useState<'cursor' | 'claude'>('cursor')
  

  // Fetch MCP info
  const fetchMCPInfo = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch(`${API_BASE}/api/mcp/info`)
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      const data = await response.json()
      setMcpInfo(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch MCP info')
    } finally {
      setLoading(false)
    }
  }, [])

  // Fetch tools
  const fetchTools = useCallback(async () => {
    setToolsLoading(true)
    try {
      const response = await fetch(`${API_BASE}/api/mcp/tools`)
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      const data = await response.json()
      setTools(data)
    } catch (err) {
      console.error('Failed to fetch tools:', err)
    } finally {
      setToolsLoading(false)
    }
  }, [])

  // Test a tool
  const testTool = useCallback(async () => {
    if (!selectedTool) return
    
    setTesting(true)
    setTestResult(null)
    
    try {
      // Convert string args to proper types based on schema
      const convertedArgs: Record<string, unknown> = {}
      for (const [key, value] of Object.entries(toolArgs)) {
        const propSchema = selectedTool.inputSchema.properties?.[key]
        if (propSchema?.type === 'number') {
          convertedArgs[key] = parseFloat(value)
        } else if (propSchema?.type === 'boolean') {
          convertedArgs[key] = value.toLowerCase() === 'true'
        } else if (propSchema?.type === 'array') {
          try {
            convertedArgs[key] = JSON.parse(value)
          } catch {
            convertedArgs[key] = value.split(',').map(s => s.trim())
          }
        } else {
          convertedArgs[key] = value
        }
      }
      
      const response = await fetch(`${API_BASE}/api/mcp/tools/call`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tool_name: selectedTool.name,
          arguments: convertedArgs
        })
      })
      
      if (!response.ok) {
        const err = await response.json()
        throw new Error(err.detail || `HTTP ${response.status}`)
      }
      
      const data = await response.json()
      setTestResult(data)
    } catch (err) {
      setTestResult({
        success: false,
        tool_name: selectedTool.name,
        parsed_results: null,
        result_count: 0,
        raw_result: { error: err instanceof Error ? err.message : 'Unknown error' }
      })
    } finally {
      setTesting(false)
    }
  }, [selectedTool, toolArgs])

  // Initial fetch
  useEffect(() => {
    fetchMCPInfo()
    fetchTools()
  }, [fetchMCPInfo, fetchTools])

  // Reset args when tool changes
  useEffect(() => {
    if (selectedTool) {
      const initialArgs: Record<string, string> = {}
      const props = selectedTool.inputSchema.properties || {}
      for (const key of Object.keys(props)) {
        initialArgs[key] = ''
      }
      setToolArgs(initialArgs)
      setTestResult(null)
    }
  }, [selectedTool])

  if (loading) {
    return (
      <div style={{ paddingTop: '48px', minHeight: '100vh' }}>
        <AppHeader />
        <EuiPage paddingSize="l">
          <EuiPageBody>
            <EuiFlexGroup justifyContent="center" alignItems="center" style={{ minHeight: '50vh' }}>
              <EuiFlexItem grow={false}>
                <EuiLoadingSpinner size="xl" />
                <EuiSpacer size="m" />
                <EuiText textAlign="center">Connecting to MCP server...</EuiText>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiPageBody>
        </EuiPage>
      </div>
    )
  }

  return (
    <div style={{ paddingTop: '48px', minHeight: '100vh' }}>
      <AppHeader />
      <EuiPage paddingSize="l">
        <EuiPageBody>
          <EuiPageHeader
            pageTitle={
              <EuiFlexGroup alignItems="center" gutterSize="m">
                <EuiFlexItem grow={false}>
                  <EuiIcon type="plugs" size="xl" />
                </EuiFlexItem>
                <EuiFlexItem>MCP Explorer</EuiFlexItem>
              </EuiFlexGroup>
            }
            description="Explore and test the Elastic Agent Builder MCP server"
            rightSideItems={[
              <PageInfoButton key="info" {...PAGE_INFO.mcp} />,
              <EuiButton
                key="refresh"
                iconType="refresh"
                onClick={() => { fetchMCPInfo(); fetchTools() }}
                isLoading={loading || toolsLoading}
              >
                Refresh
              </EuiButton>
            ]}
          />

          <EuiSpacer size="l" />

          {error && (
            <>
              <EuiCallOut title="Connection Error" color="danger" iconType="error">
                <p>{error}</p>
              </EuiCallOut>
              <EuiSpacer size="l" />
            </>
          )}

          <EuiFlexGroup>
            {/* Left Column - Server Info & Config */}
            <EuiFlexItem grow={1}>
              {/* Connection Status */}
              <EuiPanel paddingSize="l">
                <EuiTitle size="s">
                  <h3>
                    <EuiIcon type="check" style={{ marginRight: 8 }} />
                    Connection Status
                  </h3>
                </EuiTitle>
                <EuiSpacer size="m" />
                
                <EuiFlexGroup alignItems="center" gutterSize="s">
                  <EuiFlexItem grow={false}>
                    {mcpInfo?.connected ? (
                      <EuiBadge color="success">Connected</EuiBadge>
                    ) : (
                      <EuiBadge color="danger">Disconnected</EuiBadge>
                    )}
                  </EuiFlexItem>
                  {mcpInfo?.server_info?.name && (
                    <EuiFlexItem grow={false}>
                      <EuiText size="s" color="subdued">
                        {mcpInfo.server_info.name} v{mcpInfo.server_info.version}
                      </EuiText>
                    </EuiFlexItem>
                  )}
                </EuiFlexGroup>
                
                <EuiSpacer size="m" />
                
                <EuiDescriptionList
                  compressed
                  listItems={[
                    {
                      title: 'MCP URL',
                      description: (
                        <EuiFlexGroup alignItems="center" gutterSize="xs">
                          <EuiFlexItem grow={false}>
                            <EuiCode>{mcpInfo?.mcp_url || 'N/A'}</EuiCode>
                          </EuiFlexItem>
                          <EuiFlexItem grow={false}>
                            <EuiCopy textToCopy={mcpInfo?.mcp_url || ''}>
                              {(copy) => (
                                <EuiButtonEmpty
                                  size="xs"
                                  iconType="copy"
                                  onClick={copy}
                                  aria-label="Copy URL"
                                />
                              )}
                            </EuiCopy>
                          </EuiFlexItem>
                        </EuiFlexGroup>
                      ),
                    },
                    {
                      title: 'Protocol Version',
                      description: mcpInfo?.protocol_version || 'N/A',
                    },
                  ]}
                />
              </EuiPanel>

              <EuiSpacer size="m" />

              {/* Configuration Examples */}
              <EuiPanel paddingSize="l">
                <EuiTitle size="s">
                  <h3>
                    <EuiIcon type="documents" style={{ marginRight: 8 }} />
                    Client Configuration
                  </h3>
                </EuiTitle>
                <EuiSpacer size="m" />
                
                <EuiTabs>
                  <EuiTab
                    isSelected={configTab === 'cursor'}
                    onClick={() => setConfigTab('cursor')}
                  >
                    Cursor IDE
                  </EuiTab>
                  <EuiTab
                    isSelected={configTab === 'claude'}
                    onClick={() => setConfigTab('claude')}
                  >
                    Claude Desktop
                  </EuiTab>
                </EuiTabs>
                
                <EuiSpacer size="m" />
                
                {configTab === 'cursor' && mcpInfo?.configuration_examples?.cursor && (
                  <>
                    <EuiText size="s" color="subdued">
                      <p>Add to <EuiCode>{mcpInfo.configuration_examples.cursor.path}</EuiCode>:</p>
                    </EuiText>
                    <EuiSpacer size="s" />
                    <EuiCodeBlock language="json" isCopyable paddingSize="s" fontSize="s">
                      {JSON.stringify(mcpInfo.configuration_examples.cursor.config, null, 2)}
                    </EuiCodeBlock>
                  </>
                )}
                
                {configTab === 'claude' && mcpInfo?.configuration_examples?.claude_desktop && (
                  <>
                    <EuiText size="s" color="subdued">
                      <p>Add to <EuiCode>{mcpInfo.configuration_examples.claude_desktop.path}</EuiCode>:</p>
                    </EuiText>
                    <EuiSpacer size="s" />
                    <EuiCodeBlock language="json" isCopyable paddingSize="s" fontSize="s">
                      {JSON.stringify(mcpInfo.configuration_examples.claude_desktop.config, null, 2)}
                    </EuiCodeBlock>
                  </>
                )}
                
                <EuiSpacer size="m" />
                <EuiCallOut size="s" color="warning" iconType="alert" title="API Key Required">
                  <p>Replace <EuiCode>YOUR_API_KEY_HERE</EuiCode> with your Elastic API key.</p>
                </EuiCallOut>
              </EuiPanel>

              <EuiSpacer size="m" />

              {/* Tools Summary */}
              {tools && (
                <EuiPanel paddingSize="l">
                  <EuiTitle size="s">
                    <h3>
                      <EuiIcon type="wrench" style={{ marginRight: 8 }} />
                      Tools Summary
                    </h3>
                  </EuiTitle>
                  <EuiSpacer size="m" />
                  
                  <EuiFlexGroup>
                    <EuiFlexItem>
                      <EuiText textAlign="center">
                        <h2>{tools.total}</h2>
                        <p>Total Tools</p>
                      </EuiText>
                    </EuiFlexItem>
                    <EuiFlexItem>
                      <EuiText textAlign="center">
                        <h2>{tools.builtin_count}</h2>
                        <p>Built-in</p>
                      </EuiText>
                    </EuiFlexItem>
                    <EuiFlexItem>
                      <EuiText textAlign="center">
                        <h2>{tools.custom_count}</h2>
                        <p>Custom</p>
                      </EuiText>
                    </EuiFlexItem>
                  </EuiFlexGroup>
                </EuiPanel>
              )}
            </EuiFlexItem>

            {/* Right Column - Tools & Testing */}
            <EuiFlexItem grow={2}>
              <EuiPanel paddingSize="l">
                <EuiTitle size="s">
                  <h3>
                    <EuiIcon type="inspect" style={{ marginRight: 8 }} />
                    Tool Tester
                  </h3>
                </EuiTitle>
                <EuiText size="s" color="subdued">
                  <p>Select a tool and test it with custom arguments</p>
                </EuiText>
                
                <EuiSpacer size="m" />
                
                {toolsLoading ? (
                  <EuiLoadingSpinner />
                ) : tools?.error ? (
                  <EuiCallOut title="Tools Unavailable" color="warning" iconType="alert">
                    <p>{tools.error}</p>
                  </EuiCallOut>
                ) : tools ? (
                  <>
                    {/* Custom Tools */}
                    {tools.custom_tools.length > 0 && (
                      <>
                        <EuiTitle size="xs">
                          <h4>
                            Custom Tools <EuiBadge>{tools.custom_count}</EuiBadge>
                          </h4>
                        </EuiTitle>
                        <EuiSpacer size="s" />
                        <EuiFlexGroup wrap gutterSize="s">
                          {tools.custom_tools.map((tool) => (
                            <EuiFlexItem key={tool.name} grow={false}>
                              <EuiToolTip content={tool.description.length > 200 ? tool.description.slice(0, 200) + '...' : tool.description}>
                                <EuiButton
                                  size="s"
                                  color={selectedTool?.name === tool.name ? 'primary' : 'text'}
                                  fill={selectedTool?.name === tool.name}
                                  onClick={() => setSelectedTool(tool)}
                                >
                                  {tool.name}
                                </EuiButton>
                              </EuiToolTip>
                            </EuiFlexItem>
                          ))}
                        </EuiFlexGroup>
                        <EuiSpacer size="m" />
                      </>
                    )}
                    
                    {/* Built-in Tools */}
                    <EuiTitle size="xs">
                      <h4>
                        Built-in Tools <EuiBadge color="hollow">{tools.builtin_count}</EuiBadge>
                      </h4>
                    </EuiTitle>
                    <EuiSpacer size="s" />
                    <EuiFlexGroup wrap gutterSize="s">
                      {tools.builtin_tools.map((tool) => (
                        <EuiFlexItem key={tool.name} grow={false}>
                          <EuiToolTip content={tool.description.length > 200 ? tool.description.slice(0, 200) + '...' : tool.description}>
                            <EuiButton
                              size="s"
                              color={selectedTool?.name === tool.name ? 'primary' : 'text'}
                              fill={selectedTool?.name === tool.name}
                              onClick={() => setSelectedTool(tool)}
                            >
                              {tool.name.replace('platform_core_', '')}
                            </EuiButton>
                          </EuiToolTip>
                        </EuiFlexItem>
                      ))}
                    </EuiFlexGroup>
                  </>
                ) : (
                  <EuiText color="subdued">No tools available</EuiText>
                )}

                {/* Selected Tool Details */}
                {selectedTool && (
                  <>
                    <EuiHorizontalRule />
                    
                    <EuiTitle size="xs">
                      <h4>{selectedTool.name}</h4>
                    </EuiTitle>
                    <EuiSpacer size="s" />
                    <EuiText size="s" color="subdued">
                      <p>{selectedTool.description}</p>
                    </EuiText>
                    
                    <EuiSpacer size="m" />
                    
                    {/* Input Schema */}
                    {selectedTool.inputSchema.properties && Object.keys(selectedTool.inputSchema.properties).length > 0 ? (
                      <>
                        <EuiTitle size="xxs">
                          <h5>Parameters</h5>
                        </EuiTitle>
                        <EuiSpacer size="s" />
                        
                        {Object.entries(selectedTool.inputSchema.properties).map(([key, prop]) => {
                          const isRequired = selectedTool.inputSchema.required?.includes(key)
                          return (
                            <EuiFormRow
                              key={key}
                              label={
                                <span>
                                  {key}
                                  {isRequired && <EuiBadge color="danger" style={{ marginLeft: 4 }}>required</EuiBadge>}
                                  <EuiBadge color="hollow" style={{ marginLeft: 4 }}>{prop.type}</EuiBadge>
                                </span>
                              }
                              helpText={prop.description}
                              fullWidth
                            >
                              {prop.type === 'string' && key.includes('query') ? (
                                <EuiTextArea
                                  value={toolArgs[key] || ''}
                                  onChange={(e) => setToolArgs({ ...toolArgs, [key]: e.target.value })}
                                  placeholder={`Enter ${key}...`}
                                  rows={2}
                                  fullWidth
                                />
                              ) : (
                                <EuiFieldText
                                  value={toolArgs[key] || ''}
                                  onChange={(e) => setToolArgs({ ...toolArgs, [key]: e.target.value })}
                                  placeholder={`Enter ${key}...`}
                                  fullWidth
                                />
                              )}
                            </EuiFormRow>
                          )
                        })}
                        
                        <EuiSpacer size="m" />
                      </>
                    ) : (
                      <EuiText size="s" color="subdued">
                        <p>No parameters required</p>
                      </EuiText>
                    )}
                    
                    <EuiButton
                      fill
                      iconType="play"
                      onClick={testTool}
                      isLoading={testing}
                      disabled={testing}
                    >
                      Test Tool
                    </EuiButton>
                    
                    {/* Test Result */}
                    {testResult && (
                      <>
                        <EuiSpacer size="m" />
                        <EuiCallOut
                          title={testResult.success ? `Success - ${testResult.result_count} results` : 'Error'}
                          color={testResult.success ? 'success' : 'danger'}
                          iconType={testResult.success ? 'check' : 'error'}
                        >
                          <EuiCodeBlock
                            language="json"
                            paddingSize="s"
                            fontSize="s"
                            overflowHeight={300}
                            isCopyable
                          >
                            {JSON.stringify(testResult.parsed_results || testResult.raw_result, null, 2)}
                          </EuiCodeBlock>
                        </EuiCallOut>
                      </>
                    )}
                  </>
                )}
              </EuiPanel>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiPageBody>
      </EuiPage>
    </div>
  )
}

