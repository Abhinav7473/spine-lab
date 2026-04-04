import { createContext, useContext, useState, useLayoutEffect } from 'react'
import { darkTheme, lightTheme } from '../../constants/theme'

const ThemeCtx = createContext({ mode: 'dark', toggle: () => {} })

export function useTheme() {
  return useContext(ThemeCtx)
}

function applyTheme(mode) {
  const vars = mode === 'dark' ? darkTheme : lightTheme
  const root = document.documentElement
  Object.entries(vars).forEach(([k, v]) => root.style.setProperty(k, v))
  document.body.style.background = vars['--c-bg']
  document.body.style.color      = vars['--c-text']
}

export function ThemeProvider({ children }) {
  const [mode, setMode] = useState(() => {
    try { return localStorage.getItem('spine-theme') || 'dark' } catch { return 'dark' }
  })

  // useLayoutEffect so vars are set before first paint — no flash
  useLayoutEffect(() => {
    applyTheme(mode)
    try { localStorage.setItem('spine-theme', mode) } catch {}
  }, [mode])

  const toggle = () => setMode(m => m === 'dark' ? 'light' : 'dark')

  return (
    <ThemeCtx.Provider value={{ mode, toggle }}>
      {children}
    </ThemeCtx.Provider>
  )
}
