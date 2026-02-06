# Standalone Overlay Chat Script

A completely standalone version of the overlay chat that connects directly to Elastic Agent Builder - no backend required.

## Quick Start

1. **Install Tampermonkey** browser extension
   - [Chrome](https://chrome.google.com/webstore/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo)
   - [Firefox](https://addons.mozilla.org/en-US/firefox/addon/tampermonkey/)
   - [Edge](https://microsoftedge.microsoft.com/addons/detail/tampermonkey/iikmkjmpaadaobahmlepeloendndfphd)

2. **Install the script** in Tampermonkey:
   - Open Tampermonkey Dashboard (click icon → Dashboard)
   - Click "Create a new script" or "+"
   - Delete the default template
   - Copy all code from `frontend/src/scripts/overlay-chat-standalone.user.js`
   - Paste and save (Ctrl/Cmd+S)

3. **The script is pre-configured** with working credentials for the shared demo cluster

4. **Test on a matching website** (default: `*://*.elastic.co/*`)
   - Navigate to https://www.elastic.co
   - Look for the chat button in the bottom-right corner

## Configuration

### Option 1: Edit the Script Directly (Recommended)

1. Open Tampermonkey Dashboard → Click your script
2. Find the `CONFIG` section (around line 44):
   ```javascript
   const CONFIG = {
       kibanaUrl: GM_getValue('kibanaUrl', 'https://...'),
       apiKey: GM_getValue('apiKey', '...'),
       agentId: GM_getValue('agentId', '...'),
   };
   ```
3. Change the default values (second parameter to `GM_getValue`)
4. Save (Ctrl/Cmd+S) and refresh the page

### Option 2: Via Tampermonkey Menu

On a matching website:
1. Click Tampermonkey icon in browser toolbar
2. Find "Elastic Agent Chat Overlay (Standalone)"
3. Use menu commands: ⚙️ Set Kibana URL, 🔑 Set API Key, 🤖 Set Agent ID

**Note**: If menu commands don't appear, use Option 1 instead.

## Configuration Options

### Required

| Option | Description | Format |
|--------|-------------|--------|
| `kibanaUrl` | Kibana endpoint URL | `https://your-deployment.kb.region.gcp.cloud.es.io` |
| `apiKey` | Elastic API key with Agent Builder permissions | Base64 string |
| `agentId` | Agent Builder agent ID | `agent-xxxxx` or custom ID |

### Optional

| Option | Description | Default |
|--------|-------------|---------|
| `name` | Chat assistant name | `'AI Assistant'` |
| `primaryColor` | Brand color (hex) | `'#1D70B8'` |
| `greeting` | Welcome message | `'Hello! I\'m your AI assistant...'` |
| `position` | Button position | `'bottom-right'` |
| `autoOpen` | Auto-open on page load | `false` |

## Finding Your Credentials

### Kibana URL
1. Go to [Elastic Cloud Console](https://cloud.elastic.co)
2. Select your deployment → Find **Kibana** endpoint
3. Copy the full URL

### API Key
1. Elastic Cloud → Your Deployment → **Security** → **API Keys**
2. Create a key with Agent Builder read/write permissions
3. Copy immediately (shown only once!)

### Agent ID
1. Open Kibana → **Machine Learning** → **Agent Builder**
2. Select your agent → **Settings** tab
3. Copy the Agent ID

## Customization

### Target Websites

Edit the `@match` line at the top of the script:

```javascript
// @match        *://*.elastic.co/*   // Elastic sites only (default)
// @match        *://*.gov.uk/*       // GOV.UK sites
// @match        *://*/*              // All websites
```

### Appearance

Edit `CONFIG` or use `GM_setValue` in browser console:

```javascript
GM_setValue('chatName', 'My Assistant');
GM_setValue('primaryColor', '#FF5733');
GM_setValue('position', 'bottom-left');  // or top-right, top-left
```

## Testing Checklist

- [ ] Script installed in Tampermonkey (shows in Dashboard)
- [ ] Script enabled (green checkmark)
- [ ] On matching website (Tampermonkey icon shows badge)
- [ ] Chat button visible (bottom-right by default)
- [ ] Chat opens when clicked
- [ ] Can send message and receive response
- [ ] Response streams word-by-word
- [ ] No errors in browser console (F12)

## Troubleshooting

### Chat button doesn't appear
- Check Tampermonkey icon shows a badge (script running)
- Verify `@match` pattern matches current URL
- Open browser console (F12) for errors

### "Authentication failed" (401)
- Verify API key is correct (no extra spaces)
- Check API key has Agent Builder permissions
- Ensure key hasn't expired

### "Agent not found" (404)
- Verify Agent ID in Kibana → Agent Builder → Settings
- Check agent is in same deployment as Kibana URL
- Ensure agent is enabled/active

### Messages don't stream
- Check Tampermonkey version is 4.14+ (supports streaming)
- Verify network request shows `text/event-stream` response
- Check browser console for SSE errors

### Debugging

Open browser console (F12) to see logs:
```
[Elastic Chat] Ready. Kibana: https://... Agent: agent-xxxxx
[Elastic Chat] Stream started, processing chunks in real-time
[Elastic Chat] SSE Event: text_chunk {...}
```

## Differences from Backend Version

| Feature | Backend Version | Standalone Version |
|---------|----------------|-------------------|
| **Connection** | Via backend proxy | Direct to Agent Builder |
| **API Key** | Stored on backend | Stored in Tampermonkey |
| **Branding** | Fetched from backend | Manual configuration |
| **Setup** | Requires backend running | Just configure credentials |
| **Use Case** | Full demo starter setup | Quick standalone demos |

## Security Notes

- API keys are stored in Tampermonkey's local storage (browser-only)
- Use read-only API keys with minimal permissions when possible
- Don't share your configured script publicly
- Consider using a dedicated browser profile for demos

## Related Files

- `frontend/src/scripts/overlay-chat.user.js` - Overlay chat userscript
