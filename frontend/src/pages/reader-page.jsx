import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { PaperReader } from '../components/reader/paper-reader'
import { ReadingModeSwitcher } from '../components/reader/reading-mode-switcher'
import { ReadingNudge } from '../components/reader/reading-nudge'
import { ReadingHud } from '../components/reader/reading-hud'
import { ReaderSkeleton } from '../components/ui/skeleton'
import { useSessionStore } from '../stores/session-store'
import { api } from '../utils/api'
import '../styles/reader.css'

export function ReaderPage() {
  const { paperId } = useParams()
  const navigate    = useNavigate()

  const [paper,        setPaper]        = useState(null)
  const [loading,      setLoading]      = useState(true)
  const [showNudge,    setShowNudge]    = useState(false)
  const [mode,         setMode]         = useState('skim')
  const [scrollDepth,  setScrollDepth]  = useState(0)
  const { markCompleted } = useSessionStore()

  useEffect(() => {
    api.get(`/papers/${paperId}`)
      .then(setPaper)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [paperId])

  if (loading) return <ReaderSkeleton />

  if (!paper) {
    return (
      <div className="reader-root">
        <p className="reader-not-found">Paper not found.</p>
      </div>
    )
  }

  if (showNudge) {
    return (
      <div className="reader-root">
        <div className="reader-container">
          <ReadingNudge onDismiss={() => navigate('/')} />
        </div>
      </div>
    )
  }

  return (
    <div className="reader-root">
      <div className={`reader-container ${mode === 'full' ? 'reader-container--full' : ''}`}>

        <nav className="reader-nav">
          <button className="reader-nav-back" onClick={() => navigate('/')}>← feed</button>
          <ReadingModeSwitcher mode={mode} onChange={setMode} />
          <button
            className="reader-nav-done"
            onClick={() => { markCompleted(); setShowNudge(true) }}
          >
            ✓ done
          </button>
        </nav>

        <PaperReader paper={paper} mode={mode} onModeChange={setMode} onScrollDepth={setScrollDepth} />
        <ReadingHud scrollDepth={scrollDepth} />

      </div>
    </div>
  )
}
