# Component Registry

> **Read this before proposing new code.** Know what already exists, its maturity, and where to find it.

**Status legend**: **Production** (battle-tested) | **Working** (functional, less tested) | **Experimental** (spike/POC) | **Stub** (placeholder)

---

## Frontend Pages

| Page | Path | Status | Use When |
|------|------|--------|----------|
| ChatPage | `pages/ChatPage.tsx` | Production | Single-agent chat with Agent Builder |
| A2AChatPage | `pages/A2AChatPage.tsx` | Production | Multi-agent orchestration with coordinator LLM |
| SearchPageSimple | `pages/SearchPageSimple.tsx` | Production | Faceted search with field discovery and OTel tracking |
| AuditPage | `pages/AuditPage.tsx` | Production | Conversation history, reasoning steps, tool call audit |
| BrandEditorPage | `pages/BrandEditorPage.tsx` | Production | Visual brand theme editor with color pickers and logo upload |
| BrandedDemoPage | `pages/BrandedDemoPage.tsx` | Production | Full-screen branded demo via `?brand=<id>` param |
| MCPExplorerPage | `pages/MCPExplorerPage.tsx` | Production | MCP server tool explorer with schema viewer and test execution |
| OverlayDemoPage | `pages/OverlayDemoPage.tsx` | Production | FloatingChatWidget overlay showcase |
| OverlayGuidePage | `pages/OverlayGuidePage.tsx` | Production | Tampermonkey injection guide with script generator |
| DemoGuidePage | `pages/DemoGuidePage.tsx` | Production | Presenter guide with demo tracks and talking points |
| GeoSearchPage | `pages/GeoSearchPage.tsx` | Working | Geo search with dual map implementations (Leaflet + Mapbox), 5 search modes |
| ProfilePage | `pages/ProfilePage.tsx` | Working | Data-driven demo persona page with stats, attributes, tags, people sections |
| VisualSearchPage | `pages/VisualSearchPage.tsx` | Working | Text-to-image and image-to-image kNN search with Jina CLIP v2 |
| VoiceChatPage | `pages/VoiceChatPage.tsx` | Working | Voice-first chat UX with STT controls and TTS availability fallback |
| WorkflowsPage | `pages/WorkflowsPage.tsx` | Working | Workflow management: health, deploy, run, poll, recipe library |
| WelcomePage | `pages/WelcomePage.tsx` | Production | Landing page with feature cards and connection status |
| BrandedHomePage | `pages/BrandedHomePage.tsx` | Production | Config-driven branded homepage with hero, categories, featured items, assistant CTA |

## Frontend Components

### Chat (`components/chat/`)

| Component | Path | Status | Notes |
|-----------|------|--------|-------|
| ChatContainer | `components/chat/ChatContainer.tsx` | Production | Core chat with SSE streaming, exposes `sendMessage` via ref |
| ChatHeader | `components/chat/ChatHeader.tsx` | Production | Title + reset button |
| ChatInput | `components/chat/ChatInput.tsx` | Production | Auto-resize textarea, Enter to send |
| MessageBubble | `components/chat/MessageBubble.tsx` | Production | Role-aware message with markdown, reasoning, tool calls |
| MarkdownContent | `components/chat/MarkdownContent.tsx` | Production | Markdown renderer with syntax highlighting |
| ReasoningSteps | `components/chat/ReasoningSteps.tsx` | Production | Collapsible reasoning step display |
| ToolCallCard | `components/chat/ToolCallCard.tsx` | Production | Expandable tool call params/results |
| SuggestionChips | `components/chat/SuggestionChips.tsx` | Production | Quick prompt suggestion buttons |
| AgentEmptyState | `components/chat/AgentEmptyState.tsx` | Production | Empty state before first message |
| QuickPrompts | `components/chat/QuickPrompts.tsx` | Production | Demo prompt pills |
| FloatingChatWidget | `components/chat/FloatingChatWidget.tsx` | Production | Floating chat overlay with FAB toggle |

### A2A (`components/a2a/`)

| Component | Path | Status | Notes |
|-----------|------|--------|-------|
| A2AChatContainer | `components/a2a/A2AChatContainer.tsx` | Production | A2A chat with health check and agent selector |
| A2AMessageBubble | `components/a2a/A2AMessageBubble.tsx` | Production | Message bubble with function call visualization |
| A2ASetupRequired | `components/a2a/A2ASetupRequired.tsx` | Production | Setup guide when LLM proxy not configured |
| AgentSelector | `components/a2a/AgentSelector.tsx` | Production | Multi-select for coordinator agents |
| FunctionCallCard | `components/a2a/FunctionCallCard.tsx` | Production | Function call details with agent steps |
| AgentArchitectureGraph | `components/a2a/AgentArchitectureGraph.tsx` | Production | Visual coordinator-agent architecture diagram |

### Audit (`components/audit/`)

| Component | Path | Status | Notes |
|-----------|------|--------|-------|
| ConversationList | `components/audit/ConversationList.tsx` | Production | Conversation list with agent filter and search |
| ConversationDetail | `components/audit/ConversationDetail.tsx` | Production | Full conversation view with reasoning and tool calls |

### Layout (`components/layout/`)

| Component | Path | Status | Notes |
|-----------|------|--------|-------|
| AppHeader | `components/layout/AppHeader.tsx` | Production | Main nav with brand switcher and theme toggle |
| AppHeaderSimple | `components/layout/AppHeaderSimple.tsx` | Production | Simplified header variant |
| ThemeToggle | `components/layout/ThemeToggle.tsx` | Production | Light/dark mode toggle |
| PageInfoButton | `components/layout/PageInfoButton.tsx` | Production | Info flyout with page details |

### Geo (`components/geo/`)

| Component | Path | Status | Notes |
|-----------|------|--------|-------|
| MapProvider | `components/geo/MapProvider.tsx` | Working | Context for map library selection, viewport state, fit-to-bounds, user geolocation |
| LeafletMap | `components/geo/LeafletMap.tsx` | Working | Leaflet map with markers, heatmap circles, delivery zone polygons, fit-to-bounds |
| MapboxMap | `components/geo/MapboxMap.tsx` | Working | Mapbox GL JS map with vector tiles, heatmap layer, delivery zones (requires `VITE_MAPBOX_TOKEN`) |
| MapControls | `components/geo/MapControls.tsx` | Working | Sidebar: library toggle, search mode radios, zoom controls, radius slider, filters |
| StoreMarker | `components/geo/StoreMarker.tsx` | Working | Shared marker popup content (name, type, rating, distance) |
| StoreDetailPanel | `components/geo/StoreDetailPanel.tsx` | Working | EuiFlyout with full store details on marker click |
| FormatComparisonPanel | `components/geo/FormatComparisonPanel.tsx` | Working | Query inspector showing ES query + response JSON |
| HeatmapLayer | `components/geo/HeatmapLayer.tsx` | Working | Heatmap data preparation utilities |
| DeliveryZoneLayer | `components/geo/DeliveryZoneLayer.tsx` | Working | Delivery zone polygon data extraction |
| VectorTileLayer | `components/geo/VectorTileLayer.tsx` | Working | Info badge for Mapbox-only vector tile mode |

### Common (`components/common/`)

| Component | Path | Status | Notes |
|-----------|------|--------|-------|
| BrandedEmptyState | `components/common/BrandedEmptyState.tsx` | Production | Brand-themed empty state with icon/image/photo strip, falls back to EUI when no brand vars |
| HeroSection | `components/common/HeroSection.tsx` | Working | Reusable hero banner with background image, overlay, and centered content; auto-reads brand heroImage |
| PhotoStrip | `components/common/PhotoStrip.tsx` | Working | Horizontal row of images with shape variants (circle, rounded, square) for visual richness |

### Search (`components/search/`)

| Component | Path | Status | Notes |
|-----------|------|--------|-------|
| SearchResultCard | `components/search/SearchResultCard.tsx` | Production | Product card with generic JSON fallback |
| ProductDetailModal | `components/search/ProductDetailModal.tsx` | Working | Generic product detail modal for search and visual search |

### Voice (`components/voice/`)

| Component | Path | Status | Notes |
|-----------|------|--------|-------|
| VoiceChatControls | `components/voice/VoiceChatControls.tsx` | Working | Reusable mic/status control bar (idle/listening/processing/speaking) |

### Profiles (`profiles/`)

| Component | Path | Status | Notes |
|-----------|------|--------|-------|
| ProfileProvider | `profiles/ProfileContext.tsx` | Working | Context provider with localStorage + URL param persistence |
| ProfileSwitcher | `profiles/ProfileSwitcher.tsx` | Working | Header dropdown for persona switching |
| useProfileContext | `hooks/useProfileContext.ts` | Working | Natural-language profile string for agent prompts |

### Branding (`components/branding/`)

| Component | Path | Status | Notes |
|-----------|------|--------|-------|
| BrandSwitcher | `components/branding/BrandSwitcher.tsx` | Production | Brand theme dropdown |

### Demo (`components/demo/`)

| Component | Path | Status | Notes |
|-----------|------|--------|-------|
| DemoPromptPills | `components/demo/DemoPromptPills.tsx` | Production | Configurable demo prompt pills |

### Providers (`components/providers/`)

| Component | Path | Status | Notes |
|-----------|------|--------|-------|
| EuiProviderWrapper | `components/providers/EuiProviderWrapper.tsx` | Production | EUI theme provider with colorMode |
| BrandedThemeProvider | `components/providers/BrandedThemeProvider.tsx` | Production | Brand context + CSS variable injection |

### Other

| Component | Path | Status | Notes |
|-----------|------|--------|-------|
| ErrorBoundary | `components/ErrorBoundary.tsx` | Production | React error boundary with EUI styling |

## Frontend Hooks & Services

| Hook/Service | Path | Status | Notes |
|--------------|------|--------|-------|
| useAgentChat | `hooks/useAgentChat.ts` | Production | SSE streaming, tool calls, reasoning |
| useA2AChat | `hooks/useA2AChat.ts` | Production | Coordinator LLM, function calls, agent execution |
| useSearchSimple | `hooks/useSearchSimple.ts` | Production | Query, filters, pagination, aggregations |
| agentApi | `services/agentApi.ts` | Production | Agent Builder SSE client, event normalization |
| auditApi | `services/auditApi.ts` | Production | Conversation history API client |
| analyticsApi | `services/analyticsApi.ts` | Production | ES|QL search analytics (CTR, MRR, zero-results) |
| llmProxyApi | `services/llmProxyApi.ts` | Production | A2A coordinator LLM proxy client |
| useGeoSearch | `hooks/useGeoSearch.ts` | Working | Geo search: nearby, bounding box, aggregations, delivery zone check |
| useVoiceChat | `hooks/useVoiceChat.ts` | Working | Wraps `useAgentChat` with browser STT and chunked TTS playback |
| useTTSPlayback | `hooks/useTTSPlayback.ts` | Working | Queue-based TTS synthesis/playback with abort + cleanup handling |
| workflowsApi | `services/workflowsApi.ts` | Working | Workflows API client (search, deploy, run, poll, cancel) |

## Frontend Utilities

| Utility | Path | Status | Notes |
|---------|------|--------|-------|
| unsplash / STOCK_IMAGES | `utils/images.ts` | Working | Unsplash URL builder and curated stock image registry (35 photos, 8 categories) |

## Backend Routes

| Route | Path | Prefix | Status | Notes |
|-------|------|--------|--------|-------|
| Agent Builder | `routes/agent.py` | `/api/agent` | Production | SSE proxy to Agent Builder |
| Search | `routes/search_simple.py` | `/api/search` | Production | Simplified search with OTel |
| Search (Full) | `routes/search.py` | `/api/search` | Production | Full-featured search with ranking |
| Search Fields | `routes/search_fields.py` | `/api/search/fields` | Production | Field config inspection |
| Analytics | `routes/analytics.py` | `/api/analytics` | Production | ES|QL search analytics |
| Tracking | `routes/tracking.py` | `/api/tracking` | Production | OTel event tracking |
| Audit | `routes/audit.py` | `/api/audit` | Production | Conversation history |
| Branding | `routes/branding.py` | `/api/branding` | Production | Brand CRUD (JSON file store) |
| MCP | `routes/mcp.py` | `/api/mcp` | Production | MCP server proxy (JSON-RPC 2.0) |
| A2A Chat | `routes/a2a/chat.py` | `/api/a2a` | Production | Coordinator chat with streaming |
| A2A Health | `routes/a2a/health.py` | `/api/a2a/health` | Production | LLM proxy status check |
| Geo Search | `routes/geo_search.py` | `/api/geo` | Working | Nearby, bounding box, aggregations, vector tiles, delivery zone check |
| Voice | `routes/voice.py` | `/api/voice` | Working | Google Cloud TTS synthesis, voice presets, health check endpoint |
| Workflows | `routes/workflows.py` | `/api/workflows` | Working | Proxy to Kibana Workflows Management API |
| Profiles | `routes/profiles.py` | `/api/profiles` | Working | Demo persona API with hot-reload |
| Visual Search | `routes/visual_search.py` | `/api/visual-search` | Working | Jina CLIP v2 text/image kNN search |
| Agno Demo | `routes/agno_demo.py` | `/api/agno` | Experimental | Agno framework POC |

## Backend Libraries

| Module | Path | Status | Notes |
|--------|------|--------|-------|
| ES Client | `elasticsearch/client.py` | Production | Lazy singleton with connection pooling |
| Retriever Builder | `elasticsearch/retriever_builder.py` | Production | Composable retriever patterns |
| Query Builder | `elasticsearch/query_builder.py` | Production | Complex ES query DSL builder |
| Search Logic | `elasticsearch/search.py` | Production | Search orchestration (query + retriever + scoring) |
| Models | `elasticsearch/models.py` | Production | Pydantic models for ES documents |
| Config | `config.py` | Production | Pydantic settings with env var loading |
| A2A Functions | `routes/a2a/functions.py` | Production | Function definition builders for agents |
| A2A Handlers | `routes/a2a/handlers.py` | Production | Server/client function handlers |
| Geo Queries | `elasticsearch/geo_queries.py` | Working | Reusable geo query builders (distance, bounding box, shape, aggregation) |
| A2A Agents | `routes/a2a/agents.py` | Production | Agent discovery and management |
