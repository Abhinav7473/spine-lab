import { useState, useEffect } from 'react'
import { FeaturedCard, PaperCard } from './paper-card'
import { PaperCardSkeleton } from '../ui/skeleton'
import '../../styles/components.css'

const QUEUE_PAGE_SIZE = 5

function SectionLabel({ label, sublabel }) {
  return (
    <div className="section-label">
      <span className="section-label-text">{label}</span>
      <div className="section-label-line" />
      {sublabel && <span className="section-label-sub">{sublabel}</span>}
    </div>
  )
}

function ColdStartBanner({ sessionsLeft }) {
  return (
    <div className="cold-start-banner">
      <p className="cold-start-text">
        Feed sorted by recency for now.
        Personalised ranking activates after {sessionsLeft} more reading{' '}
        {sessionsLeft === 1 ? 'session' : 'sessions'}.
      </p>
    </div>
  )
}

// Page controls — used only in mobile unread queue (desktop uses shared footer)
function PageControls({ page, totalPages, onPrev, onNext }) {
  if (totalPages <= 1) return null
  return (
    <div className="page-controls">
      <button className="page-btn" onClick={onPrev} disabled={page === 0}>←</button>
      <span className="page-label">{page + 1} / {totalPages}</span>
      <button className="page-btn" onClick={onNext} disabled={page >= totalPages - 1}>→</button>
    </div>
  )
}

// ── Looping recommendations carousel (mobile) ─────────────────────────────────
// Transform-based: all 3 cards always in DOM, active=center, prev/next visible
// behind with reduced opacity + scale. Auto-advances every 5s. Loops infinitely.
export function RecsCarousel({ recommendations, coldStart, sessionsUntilReranking, loading }) {
  const [active, setActive] = useState(0)
  const total = recommendations.length

  // Auto-advance
  useEffect(() => {
    if (total < 2) return
    const t = setInterval(() => setActive(a => (a + 1) % total), 5000)
    return () => clearInterval(t)
  }, [total])

  function cardStyle(index) {
    if (total === 0) return {}
    // Signed distance from active, wrapped into [-floor, +ceil]
    let d = ((index - active) % total + total) % total
    if (d > Math.floor(total / 2)) d -= total   // e.g. for 3 cards: 0, +1, -1
    const tx   = d * 82                          // % offset per card
    const scale = d === 0 ? 1 : 0.88
    const opacity = d === 0 ? 1 : 0.38
    const z = d === 0 ? 2 : 1
    return {
      transform:  `translateX(${tx}%) scale(${scale})`,
      opacity,
      zIndex:     z,
      cursor:     d !== 0 ? 'pointer' : 'default',
    }
  }

  if (loading) {
    return (
      <div className="recs-carousel-wrap">
        <div className="recs-carousel-stage">
          <div className="recs-carousel-card" style={{ opacity: 1, transform: 'translateX(0) scale(1)', zIndex: 2 }}>
            <PaperCardSkeleton featured />
          </div>
        </div>
      </div>
    )
  }

  if (total === 0) return null

  return (
    <div className="recs-carousel-wrap">
      {coldStart && sessionsUntilReranking > 0 && (
        <ColdStartBanner sessionsLeft={sessionsUntilReranking} />
      )}
      <div className="recs-carousel-stage">
        {recommendations.map((p, i) => (
          <div
            key={p.id}
            className="recs-carousel-card"
            style={cardStyle(i)}
            onClick={() => i !== active && setActive(i)}
          >
            <FeaturedCard paper={p} />
          </div>
        ))}
      </div>
      <div className="recs-carousel-dots">
        {recommendations.map((_, i) => (
          <button
            key={i}
            className={`recs-dot ${i === active ? 'active' : ''}`}
            onClick={() => setActive(i)}
          />
        ))}
      </div>
    </div>
  )
}

// ── Desktop recommendations panel (1 card at a time, controlled externally) ──
export function RecommendationsPanel({
  recommendations, coldStart, sessionsUntilReranking, loading,
  page, totalPages, onPrev, onNext,
}) {
  if (loading) {
    return (
      <div className="recs-panel">
        <PaperCardSkeleton featured />
      </div>
    )
  }

  if (recommendations.length === 0) return null

  const recIndex  = Math.min(page, recommendations.length - 1)
  const current   = recommendations[recIndex]

  return (
    <div className="recs-panel">
      {coldStart && sessionsUntilReranking > 0 && (
        <ColdStartBanner sessionsLeft={sessionsUntilReranking} />
      )}
      <SectionLabel label="Curated for you" sublabel={`${recIndex + 1} of ${recommendations.length}`} />
      <FeaturedCard paper={current} />
      <PageControls
        page={page}
        totalPages={totalPages}
        onPrev={onPrev}
        onNext={onNext}
        label={`page ${page + 1} of ${totalPages}`}
      />
    </div>
  )
}

// ── Unread queue (desktop: controlled externally; mobile: self-paginating) ────
export function FeedList({
  unread, loading, error,
  // Desktop controlled mode — pass these to override internal pagination
  page: externalPage, totalPages: externalTotal,
  onPrev: externalPrev, onNext: externalNext,
  hideControls = false,   // desktop passes true — footer owns the controls
}) {
  const [internalPage, setInternalPage] = useState(0)

  const isControlled  = externalPage !== undefined
  const page          = isControlled ? externalPage       : internalPage
  const totalPages    = isControlled ? externalTotal       : Math.ceil((unread ?? []).length / QUEUE_PAGE_SIZE)
  const handlePrev    = isControlled ? externalPrev        : () => setInternalPage(p => Math.max(0, p - 1))
  const handleNext    = isControlled ? externalNext        : () => setInternalPage(p => Math.min(totalPages - 1, p + 1))

  const slice = (unread ?? []).slice(page * QUEUE_PAGE_SIZE, (page + 1) * QUEUE_PAGE_SIZE)

  if (loading) {
    return (
      <div className="skeleton-list">
        {Array.from({ length: QUEUE_PAGE_SIZE }, (_, i) => <PaperCardSkeleton key={i} />)}
      </div>
    )
  }

  if (error) return <p className="feed-error">{error}</p>

  if ((unread ?? []).length === 0) {
    return <p className="feed-empty">All caught up — check back later for new papers.</p>
  }

  return (
    <div>
      <SectionLabel label="Unread" sublabel={`${(unread ?? []).length} papers`} />
      <div className="paper-list">
        {slice.map(p => <PaperCard key={p.id} paper={p} />)}
      </div>
      {!hideControls && (
        <PageControls page={page} totalPages={totalPages} onPrev={handlePrev} onNext={handleNext} />
      )}
    </div>
  )
}
