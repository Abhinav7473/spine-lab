import { useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSession } from '../../hooks/use-session'
import { useSessionStore } from '../../stores/session-store'
import '../../styles/reader.css'

// ── Extract core claim from abstract ─────────────────────────────────────────
function extractCoreClaim(abstract) {
  if (!abstract) return ''
  const sentences = abstract.match(/[^.!?]+[.!?]+/g) ?? [abstract]
  // First sentence + last sentence = motivation + result, ~3 sentences max
  const picks = sentences.length <= 3
    ? sentences
    : [sentences[0], sentences[1], sentences[sentences.length - 1]]
  return picks.join(' ').trim()
}

// ── Component ─────────────────────────────────────────────────────────────────
export function PaperReader({ paper, mode = 'skim', onModeChange, onScrollDepth }) {
  const containerRef = useRef(null)
  useSession(paper.id, containerRef, onScrollDepth)

  return (
    <div ref={containerRef} className="paper-reader-scroll">
      {mode === 'skim' && (
        <SkimMode paper={paper} onReadFull={() => onModeChange?.('full')} />
      )}
      {mode === 'full' && (
        <FullMode paper={paper} />
      )}
    </div>
  )
}

// ── Skim mode ─────────────────────────────────────────────────────────────────
function SkimMode({ paper, onReadFull }) {
  const coreClaim = extractCoreClaim(paper.abstract)
  const authors   = (paper.authors ?? []).slice(0, 3).join(', ')
  const more      = (paper.authors?.length ?? 0) > 3 ? ` +${paper.authors.length - 3}` : ''

  return (
    <div className="skim-root">

      <div className="skim-meta">
        <span>{authors}{more}</span>
        <span className="skim-meta-dot">·</span>
        <span>{paper.published_at}</span>
        {paper.page_count && (
          <>
            <span className="skim-meta-dot">·</span>
            <span>{paper.page_count}pp</span>
          </>
        )}
      </div>

      <h1 className="skim-title">{paper.title}</h1>

      <div className="skim-claim-block">
        <p className="skim-claim-label">Core claim</p>
        <p className="skim-claim-text">{coreClaim}</p>
      </div>

      {paper.categories?.length > 0 && (
        <div className="skim-categories">
          {paper.categories.slice(0, 4).map(c => (
            <span key={c} className="skim-category">{c}</span>
          ))}
        </div>
      )}

      <div className="skim-actions">
        <button className="skim-read-full-btn" onClick={onReadFull}>
          Read full paper →
        </button>
        <a
          href={`https://arxiv.org/abs/${paper.arxiv_id}`}
          target="_blank"
          rel="noopener noreferrer"
          className="skim-arxiv-link"
        >
          arxiv ↗
        </a>
      </div>

    </div>
  )
}

// ── Full mode (PDF proxy) ─────────────────────────────────────────────────────
function FullMode({ paper }) {
  return (
    <iframe
      src={`/api/papers/${paper.id}/pdf`}
      title={paper.title}
      className="reader-pdf-frame"
    />
  )
}
