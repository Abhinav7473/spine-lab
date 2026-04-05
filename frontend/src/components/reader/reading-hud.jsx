import { useState, useEffect } from 'react'
import { useSessionStore } from '../../stores/session-store'
import '../../styles/glass.css'
import '../../styles/reading-hud.css'

function fmt(secs) {
  const m = Math.floor(secs / 60)
  const s = secs % 60
  return m > 0 ? `${m}m ${s.toString().padStart(2, '0')}s` : `${s}s`
}

export function ReadingHud({ scrollDepth = 0, currentSection = null }) {
  const { getDwellSeconds, sessionId } = useSessionStore()
  const [elapsed, setElapsed] = useState(0)

  useEffect(() => {
    if (!sessionId) return
    const t = setInterval(() => setElapsed(getDwellSeconds()), 1000)
    return () => clearInterval(t)
  }, [sessionId, getDwellSeconds])

  if (!sessionId) return null

  const pct = Math.round(scrollDepth * 100)

  return (
    <div className="reading-hud glass glass-hud">
      <div className="hud-timer">{fmt(elapsed)}</div>
      <div className="hud-label">active reading</div>

      <div className="hud-divider" />

      <div className="hud-depth-row">
        <span className="hud-depth-label">{pct}%</span>
        <div className="hud-depth-track">
          <div className="hud-depth-fill" style={{ width: `${pct}%` }} />
        </div>
      </div>

      {currentSection && (
        <div className="hud-section">§ {currentSection}</div>
      )}
    </div>
  )
}
