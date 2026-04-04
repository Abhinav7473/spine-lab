import { colors, radii, spacing } from '../../constants/theme'

// Inject shimmer keyframe once — uses CSS vars so it reacts to theme swaps
if (typeof document !== 'undefined' && !document.getElementById('spine-shimmer')) {
  const style = document.createElement('style')
  style.id = 'spine-shimmer'
  style.textContent = `
    @keyframes shimmer {
      0%   { background-position: -800px 0; }
      100% { background-position:  800px 0; }
    }
    .spine-bone {
      background: linear-gradient(
        90deg,
        var(--c-surface)      0%,
        var(--c-border)       50%,
        var(--c-surface)      100%
      );
      background-size: 1600px 100%;
      animation: shimmer 1.8s ease-in-out infinite;
    }
  `
  document.head.appendChild(style)
}

// ── Primitive ─────────────────────────────────────────────────────────────────
export function Bone({ width = '100%', height = '14px', style }) {
  return (
    <div
      className="spine-bone"
      style={{ width, height, borderRadius: radii.sm, flexShrink: 0, ...style }}
    />
  )
}

// ── Paper card skeleton ───────────────────────────────────────────────────────
// featured=true renders a taller hero skeleton matching FeaturedCard
export function PaperCardSkeleton({ featured = false }) {
  if (featured) {
    return (
      <div style={{
        background:    colors.surface,
        border:        `1px solid ${colors.border}`,
        borderRadius:  radii.lg,
        padding:       spacing.xl,
        display:       'flex',
        flexDirection: 'column',
        gap:           spacing.md,
      }}>
        <Bone width="100px" height="11px" />
        <Bone width="85%"   height="28px" />
        <Bone width="62%"   height="28px" />
        {[100,100,100,96,100,88,100].map((w,i) => (
          <Bone key={i} width={`${w}%`} height="15px" />
        ))}
        <div style={{ display: 'flex', gap: spacing.sm }}>
          <Bone width="72px" height="20px" />
          <Bone width="60px" height="20px" />
        </div>
      </div>
    )
  }

  return (
    <div style={{
      background:    colors.surface,
      border:        `1px solid ${colors.border}`,
      borderRadius:  radii.md,
      padding:       spacing.lg,
      display:       'flex',
      flexDirection: 'column',
      gap:           spacing.sm,
    }}>
      {/* badge row */}
      <div style={{ display: 'flex', gap: spacing.sm }}>
        <Bone width="68px"  height="20px" />
        <Bone width="52px"  height="20px" />
        <Bone width="76px"  height="20px" />
      </div>
      {/* title lines */}
      <Bone width="90%" height="17px" />
      <Bone width="68%" height="17px" />
      {/* abstract lines */}
      <Bone width="100%" height="13px" />
      <Bone width="100%" height="13px" />
      <Bone width="82%"  height="13px" />
      {/* meta row */}
      <div style={{ display: 'flex', gap: spacing.md }}>
        <Bone width="130px" height="11px" />
        <Bone width="72px"  height="11px" />
      </div>
    </div>
  )
}

// ── Reader skeleton — matches ReaderPage paper header + content ───────────────
export function ReaderSkeleton() {
  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: spacing.xl }}>
      {/* nav row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: spacing.lg }}>
        <Bone width="80px"  height="30px" />
        <Bone width="120px" height="30px" />
      </div>
      {/* mode switcher */}
      <div style={{ display: 'flex', gap: spacing.sm, marginBottom: spacing.xl }}>
        <Bone width="58px" height="28px" />
        <Bone width="58px" height="28px" />
        <Bone width="58px" height="28px" />
      </div>
      {/* paper title */}
      <Bone width="88%" height="26px" style={{ marginBottom: spacing.sm }} />
      <Bone width="62%" height="26px" style={{ marginBottom: spacing.md }} />
      {/* meta */}
      <Bone width="260px" height="11px" style={{ marginBottom: spacing.xl }} />
      {/* section heading */}
      <Bone width="90px" height="18px" style={{ marginBottom: spacing.md }} />
      {/* body lines */}
      {[100, 100, 100, 96, 100, 100, 88, 100, 94].map((w, i) => (
        <Bone key={i} width={`${w}%`} height="15px" style={{ marginBottom: '10px' }} />
      ))}
    </div>
  )
}
