import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { PaperReader } from '../components/reader/paper-reader'
import { ReadingNudge } from '../components/reader/reading-nudge'
import { ReadingModeSwitcher } from '../components/reader/reading-mode-switcher'
import { ReaderSkeleton } from '../components/ui/skeleton'
import { Button } from '../components/ui/button'
import { useIsDesktop } from '../hooks/use-viewport'
import { api } from '../utils/api'
import { colors, typography, spacing } from '../constants/theme'
import '../styles/reader.css'

export function ReaderPage() {
  const { paperId } = useParams()
  const navigate    = useNavigate()
  const isDesktop   = useIsDesktop()

  const [paper,     setPaper]     = useState(null)
  const [loading,   setLoading]   = useState(true)
  const [showNudge, setShowNudge] = useState(false)
  const [mode,      setMode]      = useState('full')

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
        <p style={{ color: colors.danger, fontFamily: typography.fontMono, padding: spacing.xl }}>
          Paper not found.
        </p>
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
      <div className="reader-container">

        <nav className="reader-nav">
          <Button variant="ghost" onClick={() => navigate('/')}>← feed</Button>
          <div className="reader-nav-right">
            {isDesktop && <ReadingModeSwitcher mode={mode} onChange={setMode} compact />}
            <Button variant="primary" onClick={() => setShowNudge(true)}>done reading</Button>
          </div>
        </nav>

        {!isDesktop && (
          <div className="reader-mode-switcher-mobile">
            <ReadingModeSwitcher mode={mode} onChange={setMode} />
          </div>
        )}

        <PaperReader paper={paper} mode={mode} />

      </div>
    </div>
  )
}
