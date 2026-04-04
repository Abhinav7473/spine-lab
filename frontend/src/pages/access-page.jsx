import { useState } from 'react'
import { api } from '../utils/api'
import { useAccessStore } from '../stores/access-store'
import { colors, typography, spacing, radii } from '../constants/theme'

export function AccessPage() {
  const { setAccess } = useAccessStore()
  const [code,    setCode]    = useState('')
  const [error,   setError]   = useState(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
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

  return (
    <div style={{
      minHeight:      '100vh',
      display:        'flex',
      alignItems:     'center',
      justifyContent: 'center',
      padding:        spacing.xl,
      background:     colors.bg,
    }}>
      <div style={{ width: '100%', maxWidth: 380 }}>

        <h1 style={{
          fontFamily:    typography.fontMono,
          fontSize:      typography.sizeXl,
          fontWeight:    typography.weightBold,
          color:         colors.accent,
          margin:        `0 0 ${spacing.xs}`,
          letterSpacing: '-0.5px',
        }}>
          spine
        </h1>
        <p style={{
          fontFamily: typography.fontMono,
          fontSize:   typography.sizeXs,
          color:      colors.textFaint,
          margin:     `0 0 ${spacing.xl}`,
        }}>
          an alternative to doomscrolling
        </p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: spacing.md }}>
          <label style={{
            fontFamily: typography.fontMono,
            fontSize:   typography.sizeSm,
            color:      colors.textMuted,
          }}>
            access code
          </label>

          <input
            type="text"
            value={code}
            onChange={e => setCode(e.target.value)}
            placeholder="SPINE-DEMO-A1"
            autoFocus
            style={{
              background:   colors.surface,
              border:       `1px solid ${error ? colors.danger : colors.border}`,
              borderRadius: radii.sm,
              color:        colors.text,
              fontFamily:   typography.fontMono,
              fontSize:     typography.sizeMd,
              padding:      `${spacing.sm} ${spacing.md}`,
              outline:      'none',
              width:        '100%',
              transition:   'border-color 0.15s ease',
            }}
            onFocus={e => { e.target.style.borderColor = colors.accent }}
            onBlur={e  => { e.target.style.borderColor = error ? colors.danger : colors.border }}
          />

          {error && (
            <p style={{
              fontFamily: typography.fontMono,
              fontSize:   typography.sizeXs,
              color:      colors.danger,
              margin:     0,
            }}>
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading || !code.trim()}
            style={{
              background:   loading || !code.trim() ? colors.border : colors.accent,
              border:       'none',
              borderRadius: radii.sm,
              color:        loading || !code.trim() ? colors.textFaint : colors.accentFg,
              cursor:       loading || !code.trim() ? 'not-allowed' : 'pointer',
              fontFamily:   typography.fontMono,
              fontSize:     typography.sizeSm,
              fontWeight:   typography.weightMedium,
              padding:      `${spacing.sm} ${spacing.md}`,
              transition:   'background 0.15s ease',
            }}
          >
            {loading ? 'checking…' : 'enter →'}
          </button>
        </form>

        <p style={{
          fontFamily: typography.fontMono,
          fontSize:   typography.sizeXs,
          color:      colors.textFaint,
          marginTop:  spacing.xl,
          lineHeight: 1.6,
        }}>
          Early access only. Codes are distributed manually.
        </p>

      </div>
    </div>
  )
}
