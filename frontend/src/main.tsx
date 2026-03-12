// Pre-register EUI icons for Vite (must be first import)
import './iconCache'

import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { BrandedThemeProvider } from './components/providers/BrandedThemeProvider'
import { ProfileProvider } from './profiles'
import App from './App'

/**
 * Application Entry Point
 *
 * Wraps the app with:
 * - BrowserRouter for client-side routing
 * - BrandedThemeProvider for combined branding + dark/light mode
 *
 * Brand is selected via:
 * - URL param: ?brand=mybrand
 * - localStorage persistence
 * - Defaults to 'default' theme
 *
 * NOTE: React.StrictMode is DISABLED in this app for EUI compatibility.
 * In development, StrictMode's intentional dev-only double-rendering corrupts
 * EUI's Emotion-based accordion animations, causing content to stay hidden
 * (blockSize: 0, opacity: 0) even when the accordion state is "open".
 * See: hive-mind/troubleshooting/EUI_ACCORDION_EXPANSION_ISSUES.md
 */
ReactDOM.createRoot(document.getElementById('root')!).render(
  <BrowserRouter basename={import.meta.env.BASE_URL}>
    <BrandedThemeProvider>
      <ProfileProvider>
        <App />
      </ProfileProvider>
    </BrandedThemeProvider>
  </BrowserRouter>
)
