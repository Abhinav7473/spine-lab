import { colors, typography, spacing } from '../../constants/theme'

// Progress bar + play/pause/stop for the audio reading mode.
export function AudioControls({ isPlaying, isPaused, progress, supported, onPlay, onPause, onStop }) {
  if (!supported) {
    return (
      <p style={{ fontFamily: typography.fontMono, fontSize: typography.sizeSm, color: colors.danger }}>
        Text-to-speech not supported in this browser.
      </p>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.md }}>

      {/* Progress bar */}
      <div style={{
        height:       4,
        background:   colors.border,
        borderRadius: radii.sm,
        overflow:     'hidden',
      }}>
        <div style={{
          height:     '100%',
          width:      `${progress * 100}%`,
          background: colors.accent,
          transition: 'width 0.3s ease',
        }} />
      </div>

      {/* Controls */}
      <div style={{ display: 'flex', gap: spacing.sm, alignItems: 'center' }}>
        {isPlaying ? (
          <ControlButton onClick={onPause} label="⏸ pause" />
        ) : (
          <ControlButton onClick={onPlay}  label={isPaused ? '▶ resume' : '▶ play'} primary />
        )}
        {(isPlaying || isPaused) && (
          <ControlButton onClick={onStop} label="■ stop" />
        )}
        <span style={{
          fontFamily: typography.fontMono,
          fontSize:   typography.sizeXs,
          color:      colors.textFaint,
          marginLeft: spacing.sm,
        }}>
          {Math.round(progress * 100)}%
        </span>
      </div>

    </div>
  )
}

function ControlButton({ onClick, label, primary }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding:      `${spacing.xs} ${spacing.md}`,
        borderRadius: 4,
        fontFamily:   typography.fontMono,
        fontSize:     typography.sizeXs,
        cursor:       'pointer',
        border:       primary ? 'none' : `1px solid ${colors.border}`,
        background:   primary ? colors.accent : 'transparent',
        color:        primary ? colors.accentFg : colors.textMuted,
      }}
    >
      {label}
    </button>
  )
}
