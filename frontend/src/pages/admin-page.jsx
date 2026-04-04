import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../utils/api'
import { useAccessStore } from '../stores/access-store'
import { colors, typography, spacing, radii } from '../constants/theme'

// Admin API calls send the stored access code as a header for server-side auth
function useAdminApi() {
  const { code: rawCode } = useAccessStore()

  async function adminGet(path) {
    const res = await fetch(`/api${path}`, {
      headers: { 'X-Access-Code': rawCode },
    })
    if (!res.ok) throw new Error(await res.text())
    return res.json()
  }

  async function adminPost(path, body) {
    const res = await fetch(`/api${path}`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', 'X-Access-Code': rawCode },
      body:    JSON.stringify(body),
    })
    if (!res.ok) throw new Error(await res.text())
    return res.json()
  }

  return { adminGet, adminPost }
}

export function AdminPage() {
  const navigate = useNavigate()
  const { role } = useAccessStore()
  const { adminGet, adminPost } = useAdminApi()

  const [stats,       setStats]       = useState(null)
  const [statsError,  setStatsError]  = useState(null)
  const [topic,       setTopic]       = useState('transformer attention')
  const [fetchResult, setFetchResult] = useState(null)
  const [fetching,    setFetching]    = useState(false)
  const [fetchError,  setFetchError]  = useState(null)

  useEffect(() => {
    if (role !== 'dev') { navigate('/'); return }
    adminGet('/admin/stats')
      .then(setStats)
      .catch(e => setStatsError(e.message))
  }, [role]) // eslint-disable-line react-hooks/exhaustive-deps

  async function triggerFetch() {
    setFetching(true)
    setFetchResult(null)
    setFetchError(null)
    try {
      const result = await adminPost('/admin/fetch', { topic, max_results: 25 })
      setFetchResult(result)
      // Refresh stats
      const s = await adminGet('/admin/stats')
      setStats(s)
    } catch (e) {
      setFetchError(e.message)
    } finally {
      setFetching(false)
    }
  }

  if (role !== 'dev') return null

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: spacing.xl }}>

      <nav style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.xl }}>
        <span style={{ fontFamily: typography.fontMono, fontSize: typography.sizeLg, color: colors.accent, fontWeight: typography.weightBold }}>
          spine / admin
        </span>
        <button
          onClick={() => navigate('/')}
          style={{ background: 'none', border: `1px solid ${colors.border}`, borderRadius: radii.sm, color: colors.textFaint, cursor: 'pointer', fontFamily: typography.fontMono, fontSize: typography.sizeXs, padding: `${spacing.xs} ${spacing.sm}` }}
        >
          ← feed
        </button>
      </nav>

      {/* Stats */}
      <section style={{ marginBottom: spacing.xl }}>
        <h2 style={heading}>DB Stats</h2>
        {statsError && <p style={{ color: colors.danger, fontFamily: typography.fontMono, fontSize: typography.sizeSm }}>{statsError}</p>}
        {stats && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: spacing.md }}>
            {[
              ['papers',   stats.papers],
              ['users',    stats.users],
              ['sessions', stats.sessions],
              ['signals',  stats.signals],
            ].map(([label, val]) => (
              <div key={label} style={{ background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: radii.md, padding: spacing.md }}>
                <div style={{ fontFamily: typography.fontMono, fontSize: typography.sizeXl, fontWeight: typography.weightBold, color: colors.text }}>{val}</div>
                <div style={{ fontFamily: typography.fontMono, fontSize: typography.sizeXs, color: colors.textFaint, marginTop: spacing.xs }}>{label}</div>
              </div>
            ))}
          </div>
        )}
        {stats && (
          <p style={{ fontFamily: typography.fontMono, fontSize: typography.sizeXs, color: colors.textFaint, marginTop: spacing.md }}>
            Re-ranking threshold: {stats.reranking_threshold} sessions ·
            Last fetch: {stats.last_fetch ? new Date(stats.last_fetch).toLocaleString() : 'never'}
          </p>
        )}
      </section>

      {/* Fetch papers */}
      <section style={{ marginBottom: spacing.xl }}>
        <h2 style={heading}>Fetch from ArXiv</h2>
        <p style={{ fontFamily: typography.fontMono, fontSize: typography.sizeXs, color: colors.textFaint, marginBottom: spacing.md }}>
          Topic is sent as <code>all:&lt;topic&gt;+AND+cat:cs.AI</code>. Use space-separated keywords.
        </p>
        <div style={{ display: 'flex', gap: spacing.sm, flexWrap: 'wrap' }}>
          <input
            value={topic}
            onChange={e => setTopic(e.target.value)}
            style={{
              flex:         1,
              minWidth:     200,
              background:   colors.surface,
              border:       `1px solid ${colors.border}`,
              borderRadius: radii.sm,
              color:        colors.text,
              fontFamily:   typography.fontMono,
              fontSize:     typography.sizeSm,
              padding:      `${spacing.sm} ${spacing.md}`,
              outline:      'none',
            }}
            onFocus={e => { e.target.style.borderColor = colors.accent }}
            onBlur={e  => { e.target.style.borderColor = colors.border }}
          />
          <button
            onClick={triggerFetch}
            disabled={fetching}
            style={{
              background:   fetching ? colors.border : colors.accent,
              border:       'none',
              borderRadius: radii.sm,
              color:        fetching ? colors.textFaint : colors.accentFg,
              cursor:       fetching ? 'not-allowed' : 'pointer',
              fontFamily:   typography.fontMono,
              fontSize:     typography.sizeSm,
              fontWeight:   typography.weightMedium,
              padding:      `${spacing.sm} ${spacing.lg}`,
            }}
          >
            {fetching ? 'fetching…' : 'fetch 25'}
          </button>
        </div>

        {fetchResult && (
          <p style={{ fontFamily: typography.fontMono, fontSize: typography.sizeSm, color: colors.accent, marginTop: spacing.md }}>
            ✓ {fetchResult.inserted} new papers inserted ({fetchResult.total_fetched} fetched from ArXiv)
          </p>
        )}
        {fetchError && (
          <p style={{ fontFamily: typography.fontMono, fontSize: typography.sizeSm, color: colors.danger, marginTop: spacing.md }}>
            {fetchError}
          </p>
        )}
      </section>

      {/* Common topics quick-fetch */}
      <section>
        <h2 style={heading}>Quick fetch topics</h2>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: spacing.sm }}>
          {[
            'transformer attention',
            'diffusion models',
            'reinforcement learning human feedback',
            'large language models',
            'graph neural networks',
            'multimodal learning',
            'mechanistic interpretability',
            'mixture of experts',
          ].map(t => (
            <button
              key={t}
              onClick={() => setTopic(t)}
              style={{
                background:   colors.surface,
                border:       `1px solid ${colors.border}`,
                borderRadius: radii.sm,
                color:        colors.textMuted,
                cursor:       'pointer',
                fontFamily:   typography.fontMono,
                fontSize:     typography.sizeXs,
                padding:      `${spacing.xs} ${spacing.sm}`,
              }}
            >
              {t}
            </button>
          ))}
        </div>
      </section>

    </div>
  )
}

const heading = {
  fontFamily:   typography.fontMono,
  fontSize:     typography.sizeSm,
  fontWeight:   typography.weightBold,
  color:        colors.textMuted,
  margin:       `0 0 ${spacing.md}`,
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
}
