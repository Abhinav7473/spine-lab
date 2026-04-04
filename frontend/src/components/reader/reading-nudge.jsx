import { colors, typography, spacing, radii } from '../../constants/theme'

const QUESTIONS = [
  "What's the problem?",
  "What's proposed?",
  "What's obvious?",
  "What's confusing?",
]

// Shown after reading — nudges user to work through these with an LLM or notebook.
// No input fields. No submission. Just a reminder.
export function ReadingNudge({ onDismiss }) {
  return (
    <div style={{
      background:   colors.surface,
      border:       `1px solid ${colors.border}`,
      borderRadius: radii.lg,
      padding:      spacing.xl,
      maxWidth:     520,
      margin:       '0 auto',
    }}>
      <p style={{
        margin:     `0 0 ${spacing.md}`,
        fontFamily: typography.fontMono,
        fontSize:   typography.sizeSm,
        color:      colors.textMuted,
        lineHeight: 1.7,
      }}>
        Take these somewhere else — your LLM, a notebook, wherever.
        Don't answer here.
      </p>

      <ol style={{
        margin:     `0 0 ${spacing.lg}`,
        padding:    `0 0 0 ${spacing.lg}`,
        display:    'flex',
        flexDirection: 'column',
        gap:        spacing.sm,
      }}>
        {QUESTIONS.map((q) => (
          <li key={q} style={{
            fontFamily: typography.fontSans,
            fontSize:   typography.sizeMd,
            color:      colors.text,
            lineHeight: 1.5,
          }}>
            {q}
          </li>
        ))}
      </ol>

      <button
        onClick={onDismiss}
        style={{
          background:  'none',
          border:      'none',
          fontFamily:  typography.fontMono,
          fontSize:    typography.sizeXs,
          color:       colors.textFaint,
          cursor:      'pointer',
          padding:     0,
        }}
      >
        done, back to feed →
      </button>
    </div>
  )
}
