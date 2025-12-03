// Pre-register EUI icons for Vite (must be first import)
import './iconCache'

import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { BrandedThemeProvider } from './components/providers/BrandedThemeProvider'
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
 */
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <BrandedThemeProvider>
        <App />
      </BrandedThemeProvider>
    </BrowserRouter>
  </React.StrictMode>,
)
