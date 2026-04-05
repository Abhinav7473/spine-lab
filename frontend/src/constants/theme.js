// Design tokens — all visual decisions live here, nowhere else.
// Colors reference CSS custom properties so dark/light mode is a single var-swap.
// Actual hex values live in darkTheme / lightTheme below.

export const colors = {
  bg:           'var(--c-bg)',
  surface:      'var(--c-surface)',
  surfaceHover: 'var(--c-surface-hover)',
  border:       'var(--c-border)',
  text:         'var(--c-text)',
  textMuted:    'var(--c-text-muted)',
  textFaint:    'var(--c-text-faint)',
  accent:       'var(--c-accent)',
  accentDim:    'var(--c-accent-dim)',
  accentFg:     'var(--c-accent-fg)',   // text color to use ON the accent background
  danger:       'var(--c-danger)',
}

// ── Themes ────────────────────────────────────────────────────────────────────
// Dark: One Dark / Claude-inspired charcoal — warm-neutral, not pitch black.
// Background is ~#1e2028, giving enough depth without harsh contrast.
// Accent is brand lime; works well on the lifted background.
export const darkTheme = {
  '--c-bg':            '#1e2028',
  '--c-surface':       '#252831',
  '--c-surface-hover': '#2d3040',
  '--c-border':        '#353848',
  '--c-text':          '#c8ccdc',
  '--c-text-muted':    '#7a7f9a',
  '--c-text-faint':    '#484e66',
  '--c-accent':        '#c8f542',
  '--c-accent-dim':    'rgba(200,245,66,0.18)',
  '--c-accent-fg':     '#161820',
  '--c-danger':        '#f87171',
  '--c-warn':          '#fbbf24',
  '--c-success':       '#4ade80',
  // Glass layer values (used in glass.css)
  '--c-glass-bg':      '30,32,44',   // RGB for rgba()
  '--c-glass-border':  '255,255,255',
}

// Light: warm paper-white — for daytime / bright environments.
export const lightTheme = {
  '--c-bg':            '#f6f6f2',
  '--c-surface':       '#ffffff',
  '--c-surface-hover': '#f0f0eb',
  '--c-border':        '#dcdcd4',
  '--c-text':          '#1a1a22',
  '--c-text-muted':    '#5c5c78',
  '--c-text-faint':    '#9898b0',
  '--c-accent':        '#4a7000',
  '--c-accent-dim':    'rgba(74,112,0,0.12)',
  '--c-accent-fg':     '#ffffff',
  '--c-danger':        '#dc2626',
  '--c-warn':          '#d97706',
  '--c-success':       '#16a34a',
  '--c-glass-bg':      '240,240,235',
  '--c-glass-border':  '0,0,0',
}

export const spacing = {
  xs:  '4px',
  sm:  '8px',
  md:  '16px',
  lg:  '24px',
  xl:  '40px',
  xxl: '64px',
}

export const typography = {
  fontMono: "'JetBrains Mono', 'Fira Code', 'Courier New', monospace",
  fontSans: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  sizeXs:   '11px',
  sizeSm:   '13px',
  sizeMd:   '15px',
  sizeLg:   '18px',
  sizeXl:   '24px',
  weightNormal: 400,
  weightMedium: 500,
  weightBold:   700,
}

export const radii = {
  sm: '4px',
  md: '8px',
  lg: '12px',
}

export const transitions = {
  fast:   'all 0.1s ease',
  normal: 'all 0.2s ease',
}

export const breakpoints = {
  md: 768,   // tablet
  lg: 1080,  // desktop — sidebar layout activates here
}

