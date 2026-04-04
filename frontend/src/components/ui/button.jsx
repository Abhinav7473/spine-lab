import { colors, typography, radii, spacing, transitions } from '../../constants/theme'

// Primary uses inverted contrast — the most visually "loud" option.
// In dark mode: lime bg + black text stands out hard.
// In light mode: dark-olive bg + white text does the same.
//
// Ghost is subtle but still readable.
// Danger is for destructive confirms only.
const variants = {
  primary: {
    background:  colors.accent,
    color:       colors.accentFg,
    border:      'none',
    fontWeight:  typography.weightBold,
    boxShadow:   `0 0 0 1px ${colors.accent}`,
  },
  ghost: {
    background: 'transparent',
    color:      colors.textMuted,
    border:     `1px solid ${colors.border}`,
    fontWeight: typography.weightMedium,
  },
  danger: {
    background: 'transparent',
    color:      colors.danger,
    border:     `1px solid ${colors.danger}`,
    fontWeight: typography.weightMedium,
  },
}

export function Button({ children, onClick, variant = 'primary', disabled = false, style }) {
  const base = {
    display:       'inline-flex',
    alignItems:    'center',
    gap:           spacing.xs,
    padding:       `10px ${spacing.lg}`,   // more breathing room than before
    borderRadius:  radii.sm,
    fontFamily:    typography.fontMono,
    fontSize:      typography.sizeSm,
    letterSpacing: '0.02em',
    cursor:        disabled ? 'not-allowed' : 'pointer',
    opacity:       disabled ? 0.4 : 1,
    transition:    transitions.fast,
    ...variants[variant],
    ...style,
  }

  return (
    <button style={base} onClick={onClick} disabled={disabled}>
      {children}
    </button>
  )
}
