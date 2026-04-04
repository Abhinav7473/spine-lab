import { useRef, useEffect, useCallback } from 'react'
import { useSession } from '../../hooks/use-session'
import { useAudioReader } from '../../hooks/use-audio-reader'
import { AudioControls } from './audio-controls'
import { useSessionStore } from '../../stores/session-store'
import { colors, typography, spacing } from '../../constants/theme'

// ── Section definitions ───────────────────────────────────────────────────────
function buildSections(paper) {
  const abstract  = paper.abstract ?? ''
  const sentences = abstract.match(/[^.!?]+[.!?]+/g) ?? [abstract]

  return [
    { id: 'abstract', heading: 'Abstract', text: abstract },
    {
      id:      'skim',
      heading: 'Core Claim',
      text: [
        ...sentences.slice(0, 2),
        sentences.length > 3 ? sentences[sentences.length - 1] : '',
      ].join(' ').trim(),
    },
  ]
}

// ── Component ─────────────────────────────────────────────────────────────────
export function PaperReader({ paper, mode = 'text' }) {
  const containerRef = useRef(null)
  const sectionRefs  = useRef({})
  useSession(paper.id, containerRef)

  const sections  = buildSections(paper)
  const fullText  = paper.abstract ?? ''
  const audio     = useAudioReader(fullText)

  const { pushSectionEvent } = useSessionEvents()

  // IntersectionObserver — logs section_enter events
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            pushSectionEvent(entry.target.dataset.section)
          }
        })
      },
      { threshold: 0.4 }
    )

    Object.values(sectionRefs.current).forEach((el) => {
      if (el) observer.observe(el)
    })

    return () => observer.disconnect()
  }, [mode]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (mode !== 'audio') audio.stop()
  }, [mode]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div
      ref={containerRef}
      style={{ overflowY: 'auto', maxHeight: 'calc(100vh - 160px)', padding: `0 ${spacing.lg}` }}
    >
      {/* Paper header */}
      <h1 style={styles.title}>{paper.title}</h1>
      <p style={styles.meta}>
        {(paper.authors ?? []).join(', ')} · {paper.published_at}
        {paper.page_count && ` · ${paper.page_count}pp`}
      </p>

      {/* Audio controls */}
      {mode === 'audio' && (
        <div style={{ marginBottom: spacing.xl }}>
          <AudioControls
            isPlaying={audio.isPlaying}
            isPaused={audio.isPaused}
            progress={audio.progress}
            supported={audio.supported}
            onPlay={audio.play}
            onPause={audio.pause}
            onStop={audio.stop}
          />
        </div>
      )}

      {/* Content by mode */}
      {mode === 'text'  && <TextMode  sections={sections} sectionRefs={sectionRefs} />}
      {mode === 'audio' && <AudioMode text={fullText}     sectionRefs={sectionRefs} progress={audio.progress} />}
      {mode === 'skim'  && <SkimMode  sections={sections} sectionRefs={sectionRefs} />}
      {mode === 'full'  && <FullMode  paper={paper} />}

      {/* Link to full paper — always present except in 'full' mode where it's redundant */}
      {mode !== 'full' && (
        <div style={{ marginTop: spacing.xl, paddingTop: spacing.lg, borderTop: `1px solid ${colors.border}` }}>
          <a
            href={`https://arxiv.org/abs/${paper.arxiv_id}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{ fontFamily: typography.fontMono, fontSize: typography.sizeSm, color: colors.accent }}
          >
            open on arxiv ↗
          </a>
          <span style={{ fontFamily: typography.fontMono, fontSize: typography.sizeXs, color: colors.textFaint, marginLeft: spacing.md }}>
            or switch to Full Paper mode to read in-app
          </span>
        </div>
      )}
    </div>
  )
}

// ── Mode renderers ────────────────────────────────────────────────────────────

function TextMode({ sections, sectionRefs }) {
  const main = sections.find(s => s.id === 'abstract')
  return (
    <section ref={el => sectionRefs.current['abstract'] = el} data-section="abstract">
      <h2 style={styles.heading}>{main.heading}</h2>
      <p style={styles.body}>{main.text}</p>
    </section>
  )
}

function AudioMode({ text, sectionRefs, progress }) {
  const words    = text.split(/\s+/)
  const boundary = Math.floor(progress * words.length)
  return (
    <section ref={el => sectionRefs.current['abstract'] = el} data-section="abstract" style={{ lineHeight: 1.9 }}>
      {words.map((word, i) => (
        <span
          key={i}
          style={{
            fontFamily:  typography.fontSans,
            fontSize:    typography.sizeMd,
            color:       i < boundary ? colors.text : colors.textMuted,
            transition:  'color 0.1s ease',
            marginRight: '0.3em',
          }}
        >
          {word}
        </span>
      ))}
    </section>
  )
}

function SkimMode({ sections, sectionRefs }) {
  const skim = sections.find(s => s.id === 'skim')
  return (
    <section ref={el => sectionRefs.current['skim'] = el} data-section="skim">
      <h2 style={styles.heading}>{skim.heading}</h2>
      <p style={{ ...styles.body, fontSize: typography.sizeLg, lineHeight: 1.7 }}>{skim.text}</p>
      <p style={{ fontFamily: typography.fontMono, fontSize: typography.sizeXs, color: colors.textFaint, marginTop: spacing.md }}>
        switch to Read mode for the full abstract
      </p>
    </section>
  )
}

function FullMode({ paper }) {
  // Stream the PDF through our backend proxy — the browser's built-in viewer
  // handles LaTeX, math, images, and fonts natively. No parsing needed.
  return (
    <iframe
      src={`/api/papers/${paper.id}/pdf`}
      title={paper.title}
      style={{
        width:   '100%',
        height:  'calc(100dvh - 140px)',
        border:  'none',
        display: 'block',
      }}
    />
  )
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function useSessionEvents() {
  const pushSectionEvent = useCallback((section) => {
    if (!section) return
    const { pushEvent, sessionId } = useSessionStore.getState()
    if (sessionId) pushEvent({ event_type: 'section_enter', section })
  }, [])
  return { pushSectionEvent }
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = {
  title: {
    fontFamily: typography.fontSans,
    fontSize:   typography.sizeXl,
    fontWeight: typography.weightBold,
    color:      colors.text,
    lineHeight: 1.3,
    margin:     `0 0 ${spacing.md}`,
  },
  meta: {
    fontFamily: typography.fontMono,
    fontSize:   typography.sizeXs,
    color:      colors.textFaint,
    margin:     `0 0 ${spacing.xl}`,
  },
  heading: {
    fontFamily: typography.fontSans,
    fontSize:   typography.sizeLg,
    fontWeight: typography.weightMedium,
    color:      colors.text,
    margin:     `0 0 ${spacing.sm}`,
    paddingTop: spacing.lg,
  },
  body: {
    fontFamily: typography.fontSans,
    fontSize:   typography.sizeMd,
    color:      colors.textMuted,
    lineHeight: 1.85,
    margin:     `0 0 ${spacing.lg}`,
  },
}
