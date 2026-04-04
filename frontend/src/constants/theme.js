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
// Dark: deep navy-black base — easier on eyes for long reading than pure black.
// Accent is the same punchy lime (#c8f542) — it's the brand.
export const darkTheme = {
  '--c-bg':           '#0c0d11',
  '--c-surface':      '#14151c',
  '--c-surface-hover':'#1c1e2a',
  '--c-border':       '#252838',
  '--c-text':         '#dde1ed',
  '--c-text-muted':   '#7880a0',
  '--c-text-faint':   '#4a5068',
  '--c-accent':       '#c8f542',
  '--c-accent-dim':   '#8aab28',
  '--c-accent-fg':    '#000000',
  '--c-danger':       '#f87171',
}

// Light: warm paper-white — for daytime / bright environments.
// Accent becomes deep olive to keep the green DNA readable on white.
export const lightTheme = {
  '--c-bg':           '#f8f8f4',
  '--c-surface':      '#ffffff',
  '--c-surface-hover':'#f1f1ec',
  '--c-border':       '#deded6',
  '--c-text':         '#18181e',
  '--c-text-muted':   '#606078',
  '--c-text-faint':   '#a0a0b8',
  '--c-accent':       '#4a7000',
  '--c-accent-dim':   '#355200',
  '--c-accent-fg':    '#ffffff',
  '--c-danger':       '#dc2626',
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

