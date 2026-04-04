import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useFeed } from '../hooks/use-feed'
import { useUser } from '../hooks/use-user'
import { useUserStore } from '../stores/user-store'
import { useAccessStore } from '../stores/access-store'
import { useTheme } from '../components/ui/theme-provider'
import { FeedList } from '../components/feed/feed-list'
import '../styles/feed.css'

const DEFAULT_SEED_TOPICS = ['transformer', 'diffusion models', 'reinforcement learning']

export function FeedPage() {
  const {
    hero, queue, missed, newPapers, stats,
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

  const feedProps = { hero, queue, missed, newPapers, coldStart, sessionsUntilReranking, loading, error }

  return (
    <div className="feed-root">
      {/* Desktop — hidden below 900px via CSS */}
      <div className="feed-desktop">
        <DesktopSidebar
          totalCount={totalCount} stats={stats}
          role={role} mode={mode} toggle={toggle}
          navigate={navigate} clearAccess={clearAccess}
        />
        <main className="feed-main">
          <FeedList {...feedProps} />
        </main>
      </div>

      {/* Mobile — hidden above 900px via CSS */}
      <div className="feed-mobile">
        <MobileHeader
          totalCount={totalCount} role={role}
          mode={mode} toggle={toggle} navigate={navigate}
        />
        {stats && <MobileStatsStrip stats={stats} />}
        <div className="feed-content">
          <FeedList {...feedProps} />
        </div>
      </div>
    </div>
  )
}

// ── Desktop sidebar ────────────────────────────────────────────────────────────
function DesktopSidebar({ totalCount, stats, role, mode, toggle, navigate, clearAccess }) {
  return (
    <aside className="feed-sidebar">

      {/* Brand */}
      <div className="feed-sidebar-brand">
        <h1 className="feed-sidebar-brand-name">spine</h1>
        <p className="feed-sidebar-brand-count">{totalCount} papers</p>
      </div>

      {/* Nav */}
      <nav className="feed-sidebar-nav">
        <SidebarBtn label="Feed" active />
        {role === 'dev' && (
          <SidebarBtn label="Admin" clickable onClick={() => navigate('/admin')} />
        )}
      </nav>

      {/* Stats */}
      {stats && <StatsBlock stats={stats} />}

      {/* Topics */}
      <div>
        <p className="stats-section-label">Topics</p>
        <div className="topics-list">
          {DEFAULT_SEED_TOPICS.map(t => (
            <span key={t} className="topic-item">{t}</span>
          ))}
        </div>
      </div>

      {/* Controls */}
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
    streak > 0         ? `${streak}d streak`         : null,
    papers_started > 0 ? `${papers_started} read`    : null,
    papers_deep    > 0 ? `${papers_deep} deep`        : null,
    papers_done    > 0 ? `${papers_done} done`        : null,
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
