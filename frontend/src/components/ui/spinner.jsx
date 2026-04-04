import { colors } from '../../constants/theme'

export function Spinner({ size = 20 }) {
  return (
    <div style={{
      width:        size,
      height:       size,
      border:       `2px solid ${colors.border}`,
      borderTop:    `2px solid ${colors.accent}`,
      borderRadius: '50%',
      animation:    'spin 0.7s linear infinite',
    }} />
  )
}

// Inject keyframe once
if (typeof document !== 'undefined' && !document.getElementById('spine-spin')) {
  const style = document.createElement('style')
  style.id = 'spine-spin'
  style.textContent = '@keyframes spin { to { transform: rotate(360deg); } }'
  document.head.appendChild(style)
}
