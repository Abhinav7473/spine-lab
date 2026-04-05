import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useFeed } from '../hooks/use-feed'
import { useUser } from '../hooks/use-user'
import { useUserStore } from '../stores/user-store'
import { useAccessStore } from '../stores/access-store'
import { useTheme } from '../components/ui/theme-provider'
import { FeedList, RecommendationsPanel, RecsCarousel } from '../components/feed/feed-list'
import { StreakCalendar } from '../components/feed/streak-calendar'
import '../styles/feed.css'

const QUEUE_PAGE_SIZE = 5

// ── Resizable column divider ───────────────────────────────────────────────────
// Updates a CSS custom property on the grid container so no re-render is needed
// on every mousemove.
function useResizableDivider(cssVar, initialPx, minPx = 180, maxPx = 600) {
  const gridRef   = useRef(null)
  const dragging  = useRef(false)
  const startX    = useRef(0)
  const startW    = useRef(initialPx)
  const currentW  = useRef(initialPx)

  const onMouseDown = useCallback((e) => {
    e.preventDefault()
    dragging.current = true
    startX.current   = e.clientX
    startW.current   = currentW.current
    document.body.style.cursor    = 'col-resize'
    document.body.style.userSelect = 'none'
  }, [])

  useEffect(() => {
    const onMove = (e) => {
      if (!dragging.current || !gridRef.current) return
      const w = Math.min(maxPx, Math.max(minPx, startW.current + (e.clientX - startX.current)))
      currentW.current = w
      gridRef.current.style.setProperty(cssVar, `${w}px`)
    }
    const onUp = () => {
      if (!dragging.current) return
      dragging.current = false
      document.body.style.cursor    = ''
      document.body.style.userSelect = ''
    }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup',   onUp)
    return () => {
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup',   onUp)
    }
  }, [cssVar, minPx, maxPx])

  return { gridRef, onMouseDown }
}

const DEFAULT_SEED_TOPICS = ['transformer', 'diffusion models', 'reinforcement learning']

export function FeedPage() {
  const {
    recommendations, unread, stats,
    coldStart, sessionsUntilReranking,
    totalCount, loading, error, loadFeed,
  } = useFeed()

  const { userId } = useUserStore()
  const { createUser } = useUser()
  const { role, clearAccess } = useAccessStore()
  const { mode, toggle } = useTheme()
  const navigate = useNavigate()

  useEffect(() => {
    if (!userId) createUser(DEFAULT_SEED_TOPICS)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (userId) loadFeed()
  }, [userId]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Desktop: shared page state for both columns ────────────────────────────
  const [desktopPage, setDesktopPage] = useState(0)
  const totalQueuePages = Math.ceil(unread.length / QUEUE_PAGE_SIZE)
  const totalPages = Math.max(totalQueuePages, 1)

  function goPrev() { setDesktopPage(p => Math.max(0, p - 1)) }
  function goNext() { setDesktopPage(p => Math.min(totalPages - 1, p + 1)) }

  const recProps   = { recommendations, coldStart, sessionsUntilReranking, loading }
  const queueProps = { unread, loading, error }

  // Resizable dividers
  const sidebar = useResizableDivider('--sidebar-w', 240, 160, 320)
  const recCol  = useResizableDivider('--rec-w',     380, 260, 520)

  // Share the same gridRef between both hooks (sidebar.gridRef is canonical)
  // by wiring recCol's handlers to the same element
  const desktopRef = useCallback((el) => {
    sidebar.gridRef.current = el
    recCol.gridRef.current  = el
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const recIndex = Math.min(desktopPage, Math.max(recommendations.length - 1, 0))

  return (
    <div className="feed-root">
      {/* Desktop — 3 columns: sidebar | recommendations | queue */}
      <div className="feed-desktop" ref={desktopRef}>
        <DesktopSidebar
          totalCount={totalCount} stats={stats} userId={userId}
          role={role} mode={mode} toggle={toggle}
          navigate={navigate} clearAccess={clearAccess}
        />

        {/* Divider 1: sidebar ↔ recs */}
        <div
          className="resize-divider"
          style={{ left: 'calc(var(--sidebar-w) - 3px)' }}
          onMouseDown={sidebar.onMouseDown}
        />

        <div className="feed-recommendations">
          <RecommendationsPanel
            {...recProps}
            page={desktopPage} totalPages={totalPages}
            onPrev={goPrev} onNext={goNext}
          />
        </div>

        {/* Divider 2: recs ↔ queue */}
        <div
          className="resize-divider"
          style={{ left: 'calc(var(--sidebar-w) + var(--rec-w) - 3px)' }}
          onMouseDown={recCol.onMouseDown}
        />

        <div className="feed-queue">
          <FeedList {...queueProps} page={desktopPage} totalPages={totalPages} hideControls />
        </div>

        {/* Shared footer — spans recs + queue columns */}
        <div className="feed-footer">
          <span className="feed-footer-info">
            {recommendations.length > 0 && `pick ${recIndex + 1}/${recommendations.length}`}
          </span>
          <div className="page-controls">
            <button className="page-btn" onClick={goPrev} disabled={desktopPage === 0}>←</button>
            <span className="page-label">{desktopPage + 1} / {totalPages}</span>
            <button className="page-btn" onClick={goNext} disabled={desktopPage >= totalPages - 1}>→</button>
          </div>
          <span className="feed-footer-info" style={{ textAlign: 'right' }}>
            {unread.length > 0 && `${unread.length} unread`}
          </span>
        </div>
      </div>

      {/* Mobile — stacked: header, stats, carousel, queue */}
      <div className="feed-mobile">
        <MobileHeader
          totalCount={totalCount} role={role}
          mode={mode} toggle={toggle} navigate={navigate}
        />
        {stats && <MobileStatsStrip stats={stats} />}
        <div className="feed-content">
          <RecsCarousel {...recProps} />
          <FeedList {...queueProps} />
        </div>
      </div>
    </div>
  )
}

// ── Desktop sidebar ────────────────────────────────────────────────────────────
function DesktopSidebar({ totalCount, stats, userId, role, mode, toggle, navigate, clearAccess }) {
  return (
    <aside className="feed-sidebar">

      <div className="feed-sidebar-brand">
        <h1 className="feed-sidebar-brand-name">spine</h1>
        <p className="feed-sidebar-brand-count">{totalCount} papers</p>
      </div>

      <nav className="feed-sidebar-nav">
        <SidebarBtn label="Feed" active />
        <SidebarBtn label="Settings" clickable onClick={() => navigate('/settings')} />
        {role === 'dev' && (
          <SidebarBtn label="Admin" clickable onClick={() => navigate('/admin')} />
        )}
      </nav>

      {stats && <StatsBlock stats={stats} />}

      {userId && <StreakCalendar userId={userId} />}

      <div>
        <p className="stats-section-label">Topics</p>
        <div className="topics-list">
          {DEFAULT_SEED_TOPICS.map(t => (
            <span key={t} className="topic-item">{t}</span>
          ))}
        </div>
      </div>

      <div className="feed-sidebar-controls">
        <button onClick={toggle} className="icon-btn">
          {mode === 'dark' ? '☀ light' : '☾ dark'}
        </button>
        <button onClick={clearAccess} className="icon-btn danger">
          sign out
        </button>
      </div>

    </aside>
  )
}

// ── Mobile header ──────────────────────────────────────────────────────────────
function MobileHeader({ totalCount, role, mode, toggle, navigate }) {
  return (
    <header className="feed-mobile-header">
      <div>
        <h1 className="mobile-brand-name">spine</h1>
        <p className="mobile-brand-count">{totalCount} papers</p>
      </div>
      <div className="feed-mobile-header-actions">
        {role === 'dev' && (
          <button onClick={() => navigate('/admin')} className="icon-btn">admin</button>
        )}
        <button onClick={toggle} className="icon-btn">
          {mode === 'dark' ? '☀' : '☾'}
        </button>
      </div>
    </header>
  )
}

// ── Stats block (desktop sidebar) ─────────────────────────────────────────────
function StatsBlock({ stats }) {
  const { streak, papers_started, papers_deep, papers_done } = stats

  return (
    <div className="stats-block">
      <p className="stats-section-label">Stats</p>

      <div className={`stats-streak-number ${streak > 0 ? 'active' : 'inactive'}`}>
        {streak}
      </div>
      <div className="stats-streak-label">day streak</div>

      <div className="stats-grid">
        {[
          [papers_started, 'started'],
          [papers_deep,    'deep'],
          [papers_done,    'done'],
        ].map(([val, label]) => (
          <div key={label}>
            <div className="stats-grid-item-value">{val}</div>
            <div className="stats-grid-item-label">{label}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Mobile stats strip ─────────────────────────────────────────────────────────
function MobileStatsStrip({ stats }) {
  const { streak, papers_started, papers_deep, papers_done } = stats
  const items = [
    streak > 0         ? `${streak}d streak`      : null,
    papers_started > 0 ? `${papers_started} read`  : null,
    papers_deep    > 0 ? `${papers_deep} deep`      : null,
    papers_done    > 0 ? `${papers_done} done`      : null,
  ].filter(Boolean)

  if (items.length === 0) return null

  return (
    <div className="mobile-stats-strip">
      {items.map((item, i) => (
        <span key={i} className={`mobile-stats-item ${i === 0 && streak > 0 ? 'highlight' : ''}`}>
          {item}
        </span>
      ))}
    </div>
  )
}

// ── Sidebar button ─────────────────────────────────────────────────────────────
function SidebarBtn({ label, active, clickable, onClick }) {
  return (
    <button
      onClick={onClick}
      className={['sidebar-btn', active ? 'active' : '', clickable ? 'clickable' : ''].filter(Boolean).join(' ')}
    >
      {label}
    </button>
  )
}
