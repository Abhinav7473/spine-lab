import { colors, typography, spacing, radii } from '../../constants/theme'

export const READING_MODES = ['text', 'audio', 'skim', 'full']

const LABELS = {
  text:  'Read',
  audio: 'Listen',
  skim:  'Skim',
  full:  'Full Paper',
}

const DESCRIPTIONS = {
  text:  'full abstract, section by section',
  audio: 'text-to-speech, hands-free',
  skim:  'core claim in 3 sentences max',
  full:  'rendered in-app — interactions tracked',
}

export function ReadingModeSwitcher({ mode, onChange, compact = false }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.sm }}>
      <div style={{ display: 'flex', gap: spacing.sm, flexWrap: 'wrap' }}>
        {READING_MODES.map((m) => (
          <button
            key={m}
            onClick={() => onChange(m)}
            style={{
              padding:      `${spacing.xs} ${spacing.md}`,
              borderRadius: radii.sm,
              fontFamily:   typography.fontMono,
              fontSize:     typography.sizeXs,
              fontWeight:   typography.weightMedium,
              cursor:       'pointer',
              transition:   'all 0.15s ease',
              border:       mode === m
                ? `1px solid ${colors.accent}`
                : `1px solid ${colors.border}`,
              background:   mode === m ? colors.accent : 'transparent',
              color:        mode === m ? colors.accentFg : colors.textMuted,
            }}
          >
            {LABELS[m]}
          </button>
        ))}
      </div>
      {!compact && (
        <p style={{
          fontFamily: typography.fontMono,
          fontSize:   typography.sizeXs,
          color:      colors.textFaint,
          margin:     0,
        }}>
          {DESCRIPTIONS[mode]}
        </p>
      )}
    </div>
  )
}
