import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../utils/api'
import { useAccessStore } from '../stores/access-store'
import { useUserStore } from '../stores/user-store'
import '../styles/login.css'

// ── OAuth redirect ─────────────────────────────────────────────────────────────
// After OAuth callback the backend redirects to /#token=<jwt>.
// We pick it up here and exchange it for a user_id.
function useOAuthTokenRedirect() {
  const { setUser, seedTopics } = useUserStore()
  const { setAccess } = useAccessStore()
  const navigate = useNavigate()

  useEffect(() => {
    const hash = window.location.hash
    if (!hash.startsWith('#token=')) return

    const token = hash.slice('#token='.length)
    window.history.replaceState(null, '', window.location.pathname)

    // Token travels in Authorization header only — never query params
    api.post('/auth/me', undefined, { Authorization: `Bearer ${token}` })
      .then(data => {
        setAccess('user', token)
        setUser(data.user_id, [], data.email)
        // New OAuth users have no topics — send them to onboarding
        if (!seedTopics || seedTopics.length === 0) {
          navigate('/settings?onboarding=true')
        } else {
          navigate('/')
        }
      })
      .catch(console.error)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
}

// ── Provider button ────────────────────────────────────────────────────────────
function OAuthButton({ provider, icon, label, href, disabled }) {
  return (
    <a
      href={disabled ? undefined : href}
      className={`login-oauth-btn ${disabled ? 'disabled' : ''}`}
      aria-disabled={disabled}
      onClick={disabled ? (e) => e.preventDefault() : undefined}
    >
      <span className="login-oauth-icon">{icon}</span>
      <span>{label}</span>
      {disabled && <span className="login-oauth-soon">coming soon</span>}
    </a>
  )
}

// ── Main login page ────────────────────────────────────────────────────────────
export function LoginPage() {
  useOAuthTokenRedirect()

  const { setAccess } = useAccessStore()
  const [tab,     setTab]     = useState('oauth')   // 'oauth' | 'code'
  const [code,    setCode]    = useState('')
  const [error,   setError]   = useState(null)
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  // If already authenticated, skip to feed
  const { role } = useAccessStore()
  useEffect(() => { if (role) navigate('/') }, [role]) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleCode(e) {
    e.preventDefault()
    if (!code.trim()) return
    setLoading(true)
    setError(null)
    try {
      const data = await api.post('/access/validate', { code: code.trim() })
      setAccess(data.role, code.trim())
    } catch {
      setError('Invalid access code.')
    } finally {
      setLoading(false)
    }
  }

  const oauthBase = window.location.origin

  return (
    <div className="login-root">
      <div className="login-card">

        <div className="login-brand">
          <h1 className="login-brand-name">spine</h1>
          <p className="login-brand-tagline">read less, learn more</p>
        </div>

        <div className="login-tabs">
          <button
            className={`login-tab ${tab === 'oauth' ? 'active' : ''}`}
            onClick={() => setTab('oauth')}
          >
            Sign in
          </button>
          <button
            className={`login-tab ${tab === 'code' ? 'active' : ''}`}
            onClick={() => setTab('code')}
          >
            Access code
          </button>
        </div>

        {tab === 'oauth' && (
          <div className="login-oauth-group">
            <OAuthButton
              provider="google"
              icon="G"
              label="Continue with Google"
              href={`${oauthBase}/api/auth/google`}
              disabled={!import.meta.env.VITE_GOOGLE_OAUTH_ENABLED}
            />
            <OAuthButton
              provider="github"
              icon=""
              label="Continue with GitHub"
              href={`${oauthBase}/api/auth/github`}
              disabled={!import.meta.env.VITE_GITHUB_OAUTH_ENABLED}
            />
            <p className="login-oauth-note">
              Your reading history syncs across devices once you sign in with a provider.
            </p>
          </div>
        )}

        {tab === 'code' && (
          <form onSubmit={handleCode} className="login-code-form">
            <label className="login-label">Access code</label>
            <input
              className={`login-input ${error ? 'error' : ''}`}
              type="text"
              value={code}
              onChange={e => setCode(e.target.value)}
              placeholder="SPINE-DEMO-A1"
              autoFocus
            />
            {error && <p className="login-error">{error}</p>}
            <button
              type="submit"
              className="login-submit"
              disabled={loading || !code.trim()}
            >
              {loading ? 'checking…' : 'enter →'}
            </button>
            <p className="login-code-note">
              Early access only. Codes are distributed manually.
            </p>
          </form>
        )}

      </div>
    </div>
  )
}
