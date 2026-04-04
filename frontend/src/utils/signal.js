// Utilities for computing behavioral reading signals.
// Pure functions — no side effects, no store access.

/**
 * Returns scroll depth as a 0.0–1.0 float.
 * Pass the scrollable container element.
 */
export function getScrollDepth(el) {
  if (!el) return 0
  const scrolled = el.scrollTop + el.clientHeight
  const total    = el.scrollHeight
  if (total === 0) return 0
  return Math.min(scrolled / total, 1)
}

/**
 * Extracts the section heading visible nearest the top of the viewport.
 * Looks for h2/h3 elements inside the container.
 */
export function getVisibleSection(containerEl) {
  if (!containerEl) return null
  const headings = containerEl.querySelectorAll('h2, h3')
  for (const h of headings) {
    const rect = h.getBoundingClientRect()
    if (rect.top >= 0 && rect.top < window.innerHeight * 0.5) {
      return h.textContent.trim()
    }
  }
  return null
}

/**
 * Formats seconds into a human-readable string (e.g. "2m 14s").
 */
export function formatDwell(seconds) {
  if (seconds < 60) return `${seconds}s`
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return s > 0 ? `${m}m ${s}s` : `${m}m`
}
