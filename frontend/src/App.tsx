import { Routes, Route } from 'react-router-dom'
import { Layout } from './components/layout/Layout'
import { WelcomePage } from './pages/WelcomePage'
import { ChatPage } from './pages/ChatPage'
import { A2AChatPage } from './pages/A2AChatPage'
import { BrandedDemoPage } from './pages/BrandedDemoPage'
import { BrandEditorPage } from './pages/BrandEditorPage'
import { AuditPage } from './pages/AuditPage'
import { MCPExplorerPage } from './pages/MCPExplorerPage'
import { SearchPageSimple } from './pages/SearchPageSimple'
import { DemoGuidePage } from './pages/DemoGuidePage'
import { OverlayDemoPage } from './pages/OverlayDemoPage'
import { OverlayGuidePage } from './pages/OverlayGuidePage'
import { WorkflowsPage } from './pages/WorkflowsPage'
import { GeoSearchPage } from './pages/GeoSearchPage'
import { ProfilePage } from './pages/ProfilePage'
import { VoiceChatPage } from './pages/VoiceChatPage'
import { BrandedHomePage } from './pages/BrandedHomePage'
import { VisualSearchPage } from './pages/VisualSearchPage'
import { NetworkTopologyPage } from './pages/NetworkTopologyPage'
import { NetworkDashboardPage } from './pages/NetworkDashboardPage'
import { NetworkImpactPage } from './pages/NetworkImpactPage'
import { NetflowAnalysisPage } from './pages/NetflowAnalysisPage'
import { MerakiAnalysisPage } from './pages/MerakiAnalysisPage'

/**
 * Main App Component
 *
 * All routes are wrapped in <Layout /> which renders AppHeader automatically.
 * Pages do NOT need to import or render AppHeader themselves.
 *
 * To add a headerless route (e.g. an embedded widget), place it outside
 * the <Route element={<Layout />}> group.
 */
function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<WelcomePage />} />
        <Route path="/home" element={<BrandedHomePage />} />
        <Route path="/guide" element={<DemoGuidePage />} />
        <Route path="/chat" element={<ChatPage />} />
        <Route path="/a2a-chat" element={<A2AChatPage />} />
        <Route path="/branded" element={<BrandedDemoPage />} />
        <Route path="/brands" element={<BrandEditorPage />} />
        <Route path="/audit" element={<AuditPage />} />
        <Route path="/mcp" element={<MCPExplorerPage />} />
        <Route path="/search" element={<SearchPageSimple />} />
        <Route path="/workflows" element={<WorkflowsPage />} />
        <Route path="/geo" element={<GeoSearchPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/visual-search" element={<VisualSearchPage />} />
        <Route path="/voice" element={<VoiceChatPage />} />
        <Route path="/overlay" element={<OverlayDemoPage />} />
        <Route path="/overlay-guide" element={<OverlayGuidePage />} />
        <Route path="/network-topology" element={<NetworkTopologyPage />} />
        <Route path="/network-dashboard" element={<NetworkDashboardPage />} />
        <Route path="/network-impact" element={<NetworkImpactPage />} />
        <Route path="/netflow" element={<NetflowAnalysisPage />} />
        <Route path="/meraki" element={<MerakiAnalysisPage />} />
      </Route>
    </Routes>
  )
}

export default App
