import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Badge } from '../ui/badge'
import { truncate, formatDate, formatAuthors } from '../../utils/format'
import '../../styles/cards.css'

// ── Depth bar ─────────────────────────────────────────────────────────────────
function DepthBar({ scrollDepth, readStatus }) {
  if (scrollDepth == null) return null
  const pct      = Math.min(Math.round(scrollDepth * 100), 100)
  const fillClass = readStatus === 'done' ? 'done' : readStatus === 'reading' ? 'reading' : 'faint'
  return (
    <div className="depth-bar-track">
      <div className={`depth-bar-fill ${fillClass}`} style={{ width: `${pct}%` }} />
    </div>
  )
}

// ── Standard card ─────────────────────────────────────────────────────────────
export function PaperCard({ paper }) {
  const navigate = useNavigate()
  return (
    <div className="paper-card" onClick={() => navigate(`/read/${paper.id}`)}>
      <div className="paper-card-body">

        <div className="paper-card-badges">
          {(paper.categories ?? []).slice(0, 3).map(cat => (
            <Badge key={cat} label={cat} />
          ))}
          {paper.read_status === 'done' && <Badge label="✓ read" variant="accent" />}
          {paper.signal_score != null && paper.read_status !== 'done' && (
            <Badge label={`↑ ${paper.signal_score.toFixed(2)}`} variant="accent" />
          )}
          {paper.page_count && (
            <span className="paper-card-page-count">{paper.page_count}pp</span>
          )}
        </div>

        <h3 className={`paper-card-title ${paper.read_status === 'done' ? 'read' : 'unread'}`}>
          {paper.title}
        </h3>

        <p className="paper-card-abstract">{truncate(paper.abstract, 200)}</p>

        <div className="paper-card-meta">
          <span>{formatAuthors(paper.authors)}</span>
          <span>{formatDate(paper.published_at)}</span>
        </div>

      </div>
      <DepthBar scrollDepth={paper.scroll_depth} readStatus={paper.read_status} />
    </div>
  )
}

// ── Featured / hero card ──────────────────────────────────────────────────────
export function FeaturedCard({ paper }) {
  const navigate      = useNavigate()
  const [expanded, setExpanded] = useState(false)

  const isInProgress  = paper.read_status === 'reading'
  const sectionLabel  = isInProgress ? '↩ continue reading' : '● top paper'
  const abstract      = paper.abstract ?? ''
  const PREVIEW_CHARS = 280
  const needsTruncate = abstract.length > PREVIEW_CHARS

  return (
    <div className="hero-card">

      <div className="hero-card-label-row">
        <span className="hero-card-label">{sectionLabel}</span>
        <div className="hero-card-divider" />
        {paper.page_count && (
          <span className="hero-card-page-count">{paper.page_count}pp</span>
        )}
      </div>

      {paper.reason && (
        <p className="hero-card-reason">{paper.reason}</p>
      )}

      <h2 className="hero-card-title" onClick={() => navigate(`/read/${paper.id}`)}>
        {paper.title}
      </h2>

      <div className="hero-card-abstract-wrap">
        <p className="hero-card-abstract">
          {needsTruncate && !expanded
            ? `${abstract.slice(0, PREVIEW_CHARS).trimEnd()}…`
            : abstract}
        </p>
        {needsTruncate && (
          <button
            className="hero-card-expand-btn"
            onClick={e => { e.stopPropagation(); setExpanded(v => !v) }}
          >
            {expanded ? 'read less ↑' : 'read more ↓'}
          </button>
        )}
      </div>

      <div className="hero-card-footer">
        <div className="hero-card-footer-badges">
          {(paper.categories ?? []).slice(0, 4).map(cat => (
            <Badge key={cat} label={cat} />
          ))}
        </div>
        <span className="hero-card-footer-meta">
          {formatAuthors(paper.authors)} · {formatDate(paper.published_at)}
        </span>
      </div>

      <div className="hero-card-cta" onClick={() => navigate(`/read/${paper.id}`)}>
        {isInProgress
          ? `pick up where you left off — ${Math.round((paper.scroll_depth ?? 0) * 100)}% through →`
          : 'click to open — reading is tracked →'}
      </div>

      <DepthBar scrollDepth={paper.scroll_depth} readStatus={paper.read_status} />
    </div>
  )
}
