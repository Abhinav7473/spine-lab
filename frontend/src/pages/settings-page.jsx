import { useState, useRef, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { api } from '../utils/api'
import { useUserStore } from '../stores/user-store'
import { useAccessStore } from '../stores/access-store'
import { useTheme } from '../components/ui/theme-provider'
import { ALL_TOPICS, TOPICS_BY_DOMAIN } from '../constants/topics-corpus'
import '../styles/settings.css'

// ── Topic chip ─────────────────────────────────────────────────────────────────
function TopicChip({ topic, onRemove }) {
  return (
    <div className="settings-chip">
      <span>{topic}</span>
      <button className="settings-chip-remove" onClick={() => onRemove(topic)} aria-label={`Remove ${topic}`}>×</button>
    </div>
  )
}

// ── Addable chip (in browser panel) ───────────────────────────────────────────
function AddChip({ topic, added, onAdd }) {
  return (
    <button
      className={`settings-browse-chip ${added ? 'added' : ''}`}
      onClick={() => !added && onAdd(topic)}
      disabled={added}
    >
      {added ? '✓ ' : '+ '}{topic}
    </button>
  )
}

// ── Autocomplete input ─────────────────────────────────────────────────────────
function TopicInput({ value, onChange, onAdd, currentTopics }) {
  const [open, setOpen]       = useState(false)
  const [cursor, setCursor]   = useState(-1)
  const wrapRef               = useRef(null)

  const suggestions = value.trim().length >= 1
    ? ALL_TOPICS
        .filter(t => t.includes(value.trim().toLowerCase()) && !currentTopics.includes(t))
        .slice(0, 8)
    : []

  // Close on outside click
  useEffect(() => {
    function handle(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [])

  function pick(topic) {
    onAdd(topic)
    onChange('')
    setOpen(false)
    setCursor(-1)
  }

  function handleKey(e) {
    if (!open || suggestions.length === 0) {
      if (e.key === 'Enter') { e.preventDefault(); handleSubmit() }
      return
    }
    if (e.key === 'ArrowDown') { e.preventDefault(); setCursor(c => Math.min(c + 1, suggestions.length - 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setCursor(c => Math.max(c - 1, -1)) }
    else if (e.key === 'Enter') {
      e.preventDefault()
      if (cursor >= 0) pick(suggestions[cursor])
      else handleSubmit()
    }
    else if (e.key === 'Escape') { setOpen(false); setCursor(-1) }
  }

  function handleSubmit() {
    const t = value.trim().toLowerCase()
    if (t && !currentTopics.includes(t)) { onAdd(t); onChange('') }
  }

  return (
    <div className="settings-topic-input-wrap" ref={wrapRef}>
      <div className="settings-topic-input-row">
        <input
          className="settings-input"
          placeholder="Search or type a topic…"
          value={value}
          onChange={e => { onChange(e.target.value); setOpen(true); setCursor(-1) }}
          onFocus={() => { if (value.trim()) setOpen(true) }}
          onKeyDown={handleKey}
          autoComplete="off"
        />
        <button
          type="button"
          className="settings-add-btn"
          onClick={handleSubmit}
          disabled={!value.trim()}
        >
          add
        </button>
      </div>
      {open && suggestions.length > 0 && (
        <ul className="settings-autocomplete">
          {suggestions.map((s, i) => (
            <li
              key={s}
              className={`settings-autocomplete-item ${i === cursor ? 'active' : ''}`}
              onMouseDown={() => pick(s)}
              onMouseEnter={() => setCursor(i)}
            >
              {s}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

// ── Domain browser ─────────────────────────────────────────────────────────────
function DomainBrowser({ currentTopics, onAdd }) {
  const [openDomain, setOpenDomain] = useState(null)

  return (
    <div className="settings-domain-browser">
      <p className="settings-hint" style={{ marginBottom: 10 }}>Browse by domain</p>
      {Object.entries(TOPICS_BY_DOMAIN).map(([domain, topics]) => {
        const isOpen   = openDomain === domain
        const addedCount = topics.filter(t => currentTopics.includes(t)).length
        return (
          <div key={domain} className="settings-domain-row">
            <button
              className={`settings-domain-header ${isOpen ? 'open' : ''}`}
              onClick={() => setOpenDomain(isOpen ? null : domain)}
            >
              <span className="settings-domain-name">{domain}</span>
              {addedCount > 0 && (
                <span className="settings-domain-count">{addedCount}</span>
              )}
              <span className="settings-domain-chevron">{isOpen ? '▾' : '▸'}</span>
            </button>
            {isOpen && (
              <div className="settings-domain-chips">
                {topics.map(t => (
                  <AddChip
                    key={t}
                    topic={t}
                    added={currentTopics.includes(t)}
                    onAdd={onAdd}
                  />
                ))}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ── Section wrapper ────────────────────────────────────────────────────────────
function Section({ title, children }) {
  return (
    <div className="settings-section">
      <p className="settings-section-title">{title}</p>
      {children}
    </div>
  )
}

// ── Radio row ──────────────────────────────────────────────────────────────────
function RadioRow({ label, name, options, value, onChange }) {
  return (
    <div className="settings-row">
      <span className="settings-row-label">{label}</span>
      <div className="settings-radio-group">
        {options.map(([val, display]) => (
          <label key={val} className={`settings-radio ${value === val ? 'active' : ''}`}>
            <input type="radio" name={name} value={val} checked={value === val} onChange={() => onChange(val)} />
            {display}
          </label>
        ))}
      </div>
    </div>
  )
}

// ── Main page ──────────────────────────────────────────────────────────────────
export function SettingsPage() {
  const navigate     = useNavigate()
  const [params]     = useSearchParams()
  const isOnboarding = params.get('onboarding') === 'true'

  const { userId, seedTopics, email, preferences, setPreferences } = useUserStore()
  const { clearAccess } = useAccessStore()
  const { mode: themeMode, toggle: toggleTheme } = useTheme()

  const [topics,     setTopics]     = useState(seedTopics ?? [])
  const [topicInput, setTopicInput] = useState('')
  const [readMode,   setReadMode]   = useState(preferences.reading_mode ?? 'skim')
  const [pdfView,    setPdfView]    = useState(preferences.pdf_view     ?? 'scroll')
  const [saving,     setSaving]     = useState(false)
  const [saved,      setSaved]      = useState(false)

  function addTopic(t) {
    const normalized = t.trim().toLowerCase()
    if (normalized && !topics.includes(normalized)) {
      setTopics(ts => [...ts, normalized])
    }
  }

  function removeTopic(t) {
    setTopics(ts => ts.filter(x => x !== t))
  }

  async function handleSave() {
    if (!userId) return
    setSaving(true)
    try {
      await api.patch(`/users/${userId}/preferences`, {
        seed_topics:  topics,
        reading_mode: readMode,
        pdf_view:     pdfView,
        theme:        themeMode,
      })
      setPreferences({ topics, reading_mode: readMode, pdf_view: pdfView })
      setSaved(true)
      setTimeout(() => {
        setSaved(false)
        if (isOnboarding) navigate('/')
      }, 1200)
    } catch (err) {
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  function handleSignOut() {
    clearAccess()
    navigate('/login')
  }

  return (
    <div className="settings-root">
      <div className="settings-container">

        <nav className="settings-nav">
          {!isOnboarding && (
            <button className="settings-back" onClick={() => navigate('/')}>← back to feed</button>
          )}
          <h2 className="settings-title">{isOnboarding ? 'Set up your feed' : 'Settings'}</h2>
        </nav>

        {isOnboarding && (
          <p className="settings-onboarding-hint">
            Pick at least a few topics and we'll start finding papers for you.
          </p>
        )}

        {/* Topics */}
        <Section title="Topics of interest">
          <p className="settings-hint">
            These seed your feed. Precise terms work best — "attention mechanisms" ranks better than "AI".
          </p>
          <div className="settings-chips">
            {topics.map(t => <TopicChip key={t} topic={t} onRemove={removeTopic} />)}
            {topics.length === 0 && (
              <span className="settings-hint" style={{ fontStyle: 'italic' }}>No topics yet</span>
            )}
          </div>
          <TopicInput
            value={topicInput}
            onChange={setTopicInput}
            onAdd={addTopic}
            currentTopics={topics}
          />
          <DomainBrowser currentTopics={topics} onAdd={addTopic} />
        </Section>

        {/* Reading preferences */}
        <Section title="Reading preferences">
          <RadioRow
            label="Default mode"
            name="reading_mode"
            options={[['skim', 'skim'], ['full', 'full paper']]}
            value={readMode}
            onChange={setReadMode}
          />
          <RadioRow
            label="PDF view"
            name="pdf_view"
            options={[['scroll', 'scroll'], ['page', 'page by page']]}
            value={pdfView}
            onChange={setPdfView}
          />
          <RadioRow
            label="Theme"
            name="theme"
            options={[['dark', 'dark'], ['light', 'light']]}
            value={themeMode}
            onChange={(v) => { if (v !== themeMode) toggleTheme() }}
          />
        </Section>

        {/* Account */}
        {!isOnboarding && (
          <Section title="Account">
            <div className="settings-row">
              <span className="settings-row-label">Signed in as</span>
              <span className="settings-row-value">{email ?? 'anonymous (access code)'}</span>
            </div>
            <div className="settings-row">
              <span className="settings-row-label">User ID</span>
              <span className="settings-row-value settings-mono">{userId?.slice(0, 8)}…</span>
            </div>
            <div className="settings-oauth-links">
              <p className="settings-oauth-label">Link an account to sync history across devices</p>
              <div className="settings-oauth-btns">
                <OAuthLink provider="Google" href="/api/auth/google" enabled={!!import.meta.env.VITE_GOOGLE_OAUTH_ENABLED} />
                <OAuthLink provider="GitHub" href="/api/auth/github" enabled={!!import.meta.env.VITE_GITHUB_OAUTH_ENABLED} />
              </div>
            </div>
          </Section>
        )}

        {/* Data */}
        {!isOnboarding && (
          <Section title="Data & privacy">
            <p className="settings-hint">
              Your reading signals (dwell time, scroll depth, section visits) are stored locally and
              used only to personalise your feed. No data is shared with third parties.
            </p>
            <div className="settings-data-actions">
              <button className="settings-danger-btn" onClick={handleSignOut}>
                sign out
              </button>
            </div>
          </Section>
        )}

        {/* Save bar */}
        <div className="settings-save-bar">
          <button
            className="settings-save-btn"
            onClick={handleSave}
            disabled={saving || (isOnboarding && topics.length === 0)}
          >
            {saved ? '✓ saved' : saving ? 'saving…' : isOnboarding ? 'start reading →' : 'save changes'}
          </button>
        </div>

      </div>
    </div>
  )
}

function OAuthLink({ provider, href, enabled }) {
  if (!enabled) {
    return (
      <span className="settings-oauth-btn disabled">
        {provider} <span className="settings-oauth-soon">coming soon</span>
      </span>
    )
  }
  return (
    <a href={href} className="settings-oauth-btn">
      Link {provider}
    </a>
  )
}
