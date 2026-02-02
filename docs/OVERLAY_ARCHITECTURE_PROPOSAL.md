# Overlay Chat Architecture Proposal

## Problem Statement

We currently have an overlay chat userscript that connects to our backend (`/api/agent/chat`), which proxies to Agent Builder. Some users want a **completely standalone version** that talks directly to Agent Builder agents without requiring our backend.

**Challenge**: How do we keep both versions aligned in the same repo when they:
- May not share much code (different API endpoints)
- Behave differently (backend vs direct)
- Need to evolve independently (new features may apply to one or both)

## Proposed Solution: Adapter Pattern + Shared Core

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Shared Core Layer                         │
│  (UI, rendering, state management, SSE parsing, styling)    │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ uses
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    Adapter Layer                            │
│  ┌──────────────────────┐  ┌──────────────────────────┐   │
│  │ Backend Adapter      │  │ Direct Agent Builder     │   │
│  │ - /api/agent/chat   │  │ Adapter                  │   │
│  │ - Secure keys        │  │ - Kibana API             │   │
│  │ - Backend features   │  │ - Direct connection      │   │
│  └──────────────────────┘  └──────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### Key Principles

1. **Shared Core**: All UI, rendering, styling, and SSE event handling stays in one place
2. **Thin Adapters**: Only the API connection layer differs between versions
3. **Build-Time Generation**: Generate both userscripts from shared source
4. **Feature Flags**: Use configuration to enable/disable features per version

## Implementation Strategy

### Phase 1: Extract Shared Utilities (Simplest Approach)

Since userscripts have limitations with modules, we'll use a **shared utilities file** that both scripts can `@require`:

```
frontend/src/scripts/
├── overlay-chat.user.js              # Backend version (current)
├── overlay-chat-standalone.user.js   # Standalone version (new)
└── overlay-shared.js                 # Shared utilities (new)
```

**Shared utilities** (`overlay-shared.js`):
- Markdown parsing
- SSE event parsing & normalization
- Message rendering helpers
- Style injection helpers
- State management utilities

**Script-specific code**:
- API connection logic (backend vs direct)
- Configuration (different endpoints, auth)
- Initialization (which adapter to use)

### Phase 2: Create Standalone Version

Create `overlay-chat-standalone.user.js` that:
- Uses `@require` to load shared utilities
- Implements direct Agent Builder connection
- Shares all UI/rendering code via shared utilities

### Phase 3: Document Relationship

Create clear documentation showing:
- What's shared (UI, rendering, SSE parsing)
- What's different (API endpoints, auth)
- How to add features to both versions

### Phase 2: Create Standalone Version

Create `overlay-chat-standalone.user.js` that uses Tampermonkey's `@require` to load shared utilities:

```javascript
// ==UserScript==
// @name         Elastic Agent Chat Overlay (Standalone)
// @namespace    https://elastic.co/demos
// @version      1.0.0
// @description  Direct Agent Builder connection (no backend required)
// @author       Elastic Demo Team
// @match        *://*.gov.uk/*
// @run-at       document-end
// @grant        GM_xmlhttpRequest
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_registerMenuCommand
// @grant        GM_addStyle
// @require      https://raw.githubusercontent.com/your-org/repo/main/frontend/src/scripts/overlay-shared.js
// @connect      *.elastic-cloud.com
// @connect      *.kb.*.gcp.elastic-cloud.com
// ==/UserScript==

(function() {
    'use strict';
    
    // Configuration for standalone version
    const CONFIG = {
        kibanaUrl: GM_getValue('kibanaUrl', ''),
        apiKey: GM_getValue('apiKey', ''),
        agentId: GM_getValue('agentId', ''),
        name: GM_getValue('chatName', 'AI Assistant'),
        primaryColor: GM_getValue('primaryColor', '#1D70B8'),
        // ... other config
    };
    
    // Use shared utilities (loaded via @require)
    const { parseMarkdown, parseSSEChunk, renderMessages, injectStyles } = window.OverlayShared;
    
    // Direct Agent Builder connection
    async function streamChat(query, conversationId) {
        const url = `${CONFIG.kibanaUrl}/api/agent_builder/agents/${CONFIG.agentId}/chat`;
        
        return new Promise((resolve, reject) => {
            GM_xmlhttpRequest({
                method: 'POST',
                url: url,
                headers: {
                    'Authorization': `ApiKey ${CONFIG.apiKey}`,
                    'kbn-xsrf': 'true',
                    'Content-Type': 'application/json',
                    'Accept': 'text/event-stream',
                },
                data: JSON.stringify({
                    input: query,
                    conversation_id: conversationId,
                }),
                responseType: 'stream',
                onloadstart: (response) => {
                    // Use shared SSE parsing logic
                    const reader = response.response.getReader();
                    const decoder = new TextDecoder();
                    let buffer = '';
                    
                    function processChunk() {
                        reader.read().then(({ done, value }) => {
                            if (done) {
                                if (buffer.trim()) {
                                    parseSSEChunk(buffer, assistantId);
                                }
                                resolve();
                                return;
                            }
                            
                            buffer += decoder.decode(value, { stream: true });
                            const events = buffer.split('\n\n');
                            buffer = events.pop() || '';
                            
                            for (const event of events) {
                                if (event.trim()) {
                                    parseSSEChunk(event + '\n\n', assistantId);
                                }
                            }
                            processChunk();
                        }).catch(reject);
                    }
                    processChunk();
                },
                onerror: reject,
            });
        });
    }
    
    // Initialize using shared utilities
    injectStyles(CONFIG);
    // ... rest of initialization
})();
```

## File Structure

```
frontend/src/scripts/
├── overlay-chat.user.js              # Backend version (current)
├── overlay-chat-standalone.user.js   # Standalone version (new)
└── overlay-shared.js                 # Shared utilities (new)
    - parseMarkdown()
    - parseSSEChunk()
    - renderMessages()
    - injectStyles()
    - normalizeEventType()
```

**Note**: For local development, you can use a local file path in `@require` or serve `overlay-shared.js` from a CDN/your deployed frontend.

## Benefits

1. **Single Source of Truth**: UI improvements automatically apply to both versions
2. **Clear Separation**: API differences isolated to adapter layer
3. **Easy Testing**: Test adapters independently, test core once
4. **Feature Parity**: Easy to see what features each version supports
5. **Maintainability**: Changes to rendering/styling happen in one place

## Trade-offs

### Pros
- ✅ Shared code stays aligned automatically
- ✅ Clear architecture for future contributors
- ✅ Easy to add new adapters (e.g., MCP adapter)
- ✅ Build system ensures both versions are generated

### Cons
- ⚠️ Initial refactoring effort required
- ⚠️ Build step adds complexity
- ⚠️ Need to test both generated versions

## Migration Path

1. **Week 1**: Extract shared utilities from current script (non-breaking refactor)
2. **Week 2**: Create `overlay-shared.js` with shared functions
3. **Week 3**: Create `overlay-chat-standalone.user.js` using shared utilities
4. **Week 4**: Update `OverlayGuidePage.tsx` to offer both versions
5. **Week 5**: Test both versions and update documentation

## Simpler Alternative: Documentation-First Approach

If the refactoring seems too complex initially, we can start simpler:

1. **Keep both scripts separate** but clearly documented
2. **Create a shared utilities file** that both can copy/include
3. **Document the relationship** in comments at the top of each script
4. **Manual sync** for shared features (with clear checklist)

This is less elegant but:
- ✅ No build system needed
- ✅ Works immediately
- ✅ Can refactor later if needed
- ✅ Clear what's shared vs different

## Alternative Approaches Considered

### Option A: Feature Flag in Single Script
- **Pros**: Simpler, no build step
- **Cons**: Larger script, harder to maintain, users need to configure

### Option B: Completely Separate Scripts
- **Pros**: Maximum independence
- **Cons**: Code duplication, drift over time, harder to keep aligned

### Option C: Shared Library + Wrappers
- **Pros**: Reusable across projects
- **Cons**: Overkill for userscripts, harder to distribute

## Recommendation

**Proceed with Adapter Pattern + Shared Core** because:
1. It balances code sharing with independence
2. Scales well if we add more adapters (MCP, different backends)
3. Makes it clear what's shared vs what's different
4. Aligns with existing patterns in the codebase (see `backend/app/routes/a2a/`)

## Concrete Example: Shared Utilities

Here's what `overlay-shared.js` would contain:

```javascript
/**
 * Shared utilities for overlay chat userscripts
 * Used by both backend and standalone versions
 */
(function() {
    'use strict';
    
    window.OverlayShared = {
        /**
         * Parse markdown text into HTML
         */
        parseMarkdown(text) {
            // ... existing markdown parsing logic from overlay-chat.user.js
        },
        
        /**
         * Parse SSE chunk and extract events
         */
        parseSSEChunk(chunk, assistantId, onEvent) {
            // ... existing SSE parsing logic
        },
        
        /**
         * Normalize event type from Agent Builder
         */
        normalizeEventType(explicitType, data) {
            // ... existing normalization logic
        },
        
        /**
         * Render messages to DOM
         */
        renderMessages(messages, container, config) {
            // ... existing rendering logic
        },
        
        /**
         * Inject CSS styles (CSP-compliant)
         */
        injectStyles(config) {
            // ... existing style injection logic
        },
    };
})();
```

## Summary

**Problem**: Two versions of overlay chat (backend vs standalone) need to stay aligned despite different APIs.

**Solution**: Created standalone script artifact with clear placeholders. Both scripts share the same UI/rendering code but differ only in API connection layer.

**Implementation**:
- ✅ `overlay-chat.user.js` - Backend version (connects via `/api/agent/chat`)
- ✅ `overlay-chat-standalone.user.js` - Standalone version (direct Agent Builder connection)
- ✅ Both scripts are self-contained artifacts ready to share
- ✅ Standalone version has clear placeholders: `YOUR_KIBANA_URL_HERE`, `YOUR_API_KEY_HERE`, `YOUR_AGENT_ID_HERE`

**Benefits**:
- ✅ Simple to share - just copy/paste the script
- ✅ Clear placeholders make configuration obvious
- ✅ Self-contained - no external dependencies
- ✅ Easy to see what's different (just the API connection)

**Trade-offs**:
- ⚠️ Code duplication (but acceptable for standalone artifact)
- ⚠️ Manual sync needed for UI improvements (but scripts are stable)
- ⚠️ Users need to configure API keys themselves

## Next Steps

1. **Review this proposal** - Does this approach work for your needs?
2. **Decide on approach** - Shared utilities vs manual sync vs full refactor
3. **Create tracking issue** - Break down into tasks
4. **Start with shared utilities** - Extract non-API code first
5. **Create standalone version** - Use shared utilities for new script

## Questions to Consider

1. **How will shared utilities be served?**
   - Option A: Host on CDN (GitHub raw, jsDelivr)
   - Option B: Include in both scripts (duplication but simpler)
   - Option C: Build step that inlines shared code

2. **What features are backend-only?**
   - Branding API (backend fetches from `/api/branding/`)
   - Analytics/audit logging
   - Other backend-specific features?

3. **Versioning strategy?**
   - Should both scripts share version numbers?
   - How to handle breaking changes in shared utilities?

4. **Testing approach?**
   - How to test shared utilities independently?
   - How to test both versions?
