import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './app'
import { darkTheme, lightTheme } from './constants/theme'

// Apply initial theme vars before React renders to prevent FOUC
const _savedMode = (() => { try { return localStorage.getItem('spine-theme') } catch { return null } })()
const _initVars  = _savedMode === 'light' ? lightTheme : darkTheme
Object.entries(_initVars).forEach(([k, v]) => document.documentElement.style.setProperty(k, v))

// Global reset — uses CSS vars so theme switches apply instantly.
// dvh (dynamic viewport height) handles iOS Safari's collapsible toolbar correctly.
const style = document.createElement('style')
style.textContent = `
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  html, body { width: 100%; min-height: 100dvh; }
  body {
    background: var(--c-bg);
    color: var(--c-text);
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    text-rendering: optimizeLegibility;
  }
  #root { width: 100%; min-height: 100dvh; }
  a { color: inherit; text-decoration: none; }
  img { max-width: 100%; height: auto; }
  /* Font stacks — reference via var() in CSS files */
  :root {
    --font-mono: 'JetBrains Mono', 'Fira Code', 'Courier New', monospace;
    --font-sans: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  }
  /* Fluid type scale — clamp keeps text readable on any screen */
  :root {
    --fluid-sm:  clamp(11px, 1.5vw, 13px);
    --fluid-md:  clamp(14px, 2vw,   15px);
    --fluid-lg:  clamp(16px, 2.5vw, 18px);
    --fluid-xl:  clamp(20px, 3vw,   24px);
  }
`
document.head.appendChild(style)

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
)
