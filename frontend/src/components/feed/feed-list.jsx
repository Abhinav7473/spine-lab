import { PaperCard, FeaturedCard } from './paper-card'
import { PaperCardSkeleton } from '../ui/skeleton'
import '../../styles/components.css'

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

export function FeedList({ hero, queue, missed, newPapers, coldStart, sessionsUntilReranking, loading, error }) {
  if (loading) {
    return (
      <div className="skeleton-list">
        <PaperCardSkeleton featured />
        {Array.from({ length: 4 }, (_, i) => <PaperCardSkeleton key={i} />)}
      </div>
    )
  }

  if (error) {
    return <p className="feed-error">{error}</p>
  }

  if (!hero && newPapers.length === 0) {
    return (
      <p className="feed-empty">
        No papers yet — check back in a moment while the feed seeds from ArXiv.
      </p>
    )
  }

  return (
    <div>
      {coldStart && sessionsUntilReranking > 0 && (
        <ColdStartBanner sessionsLeft={sessionsUntilReranking} />
      )}

      {hero && <FeaturedCard paper={hero} />}

      {queue.length > 0 && (
        <div>
          <SectionLabel label="Jump back in" sublabel={`${queue.length} in progress`} />
          <div className="paper-list">
            {queue.map(p => <PaperCard key={p.id} paper={p} />)}
          </div>
        </div>
      )}

      {missed.length > 0 && (
        <div>
          <SectionLabel label="Opened, didn't finish" sublabel="pick up where you left off" />
          <div className="paper-list">
            {missed.map(p => <PaperCard key={p.id} paper={p} />)}
          </div>
        </div>
      )}

      {newPapers.length > 0 && (
        <div>
          <SectionLabel label="Discover" sublabel={`${newPapers.length} unread`} />
          <div className="paper-list">
            {newPapers.map(p => <PaperCard key={p.id} paper={p} />)}
          </div>
        </div>
      )}
    </div>
  )
}
