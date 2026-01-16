import { Routes, Route } from 'react-router-dom'
import { WelcomePage } from './pages/WelcomePage'
import { ChatPage } from './pages/ChatPage'
import { A2AChatPage } from './pages/A2AChatPage'
import { BrandedDemoPage } from './pages/BrandedDemoPage'
import { BrandEditorPage } from './pages/BrandEditorPage'
import { AuditPage } from './pages/AuditPage'
import { MCPExplorerPage } from './pages/MCPExplorerPage'
import { SearchPageSimple } from './pages/SearchPageSimple'
import { DemoGuidePage } from './pages/DemoGuidePage'

/**
 * Main App Component
 * 
 * Routes:
 * - / : Welcome page with onboarding for new users
 * - /guide : Demo guide with presenter notes and demo flow
 * - /chat : Streaming chat interface with Agent Builder
 * - /a2a-chat : A2A coordinator chat (multi-agent orchestration)
 * - /branded : Branded demo with customizable brand theme
 * - /brands : Brand editor for creating/managing themes
 * - /audit : Conversation history and audit display
 * - /mcp : MCP Explorer for testing Agent Builder tools
 * - /search : Product search with faceted filtering
 */
function App() {
  return (
    <Routes>
      <Route path="/" element={<WelcomePage />} />
      <Route path="/guide" element={<DemoGuidePage />} />
      <Route path="/chat" element={<ChatPage />} />
      <Route path="/a2a-chat" element={<A2AChatPage />} />
      <Route path="/branded" element={<BrandedDemoPage />} />
      <Route path="/brands" element={<BrandEditorPage />} />
      <Route path="/audit" element={<AuditPage />} />
      <Route path="/mcp" element={<MCPExplorerPage />} />
      <Route path="/search" element={<SearchPageSimple />} />
    </Routes>
  )
}

export default App
