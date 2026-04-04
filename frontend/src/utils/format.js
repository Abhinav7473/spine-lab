/**
 * Truncates text to maxLen characters, appending ellipsis if cut.
 */
export function truncate(text, maxLen = 200) {
  if (!text || text.length <= maxLen) return text
  return text.slice(0, maxLen).trimEnd() + '…'
}

/**
 * Formats an ISO date string to "Mar 2025" style.
 */
export function formatDate(isoString) {
  if (!isoString) return ''
  return new Date(isoString).toLocaleDateString('en-US', {
    month: 'short',
    year:  'numeric',
  })
}

/**
 * Returns "Author et al." for multi-author lists, full name for single.
 */
export function formatAuthors(authors = []) {
  if (authors.length === 0) return ''
  if (authors.length === 1) return authors[0]
  return `${authors[0]} et al.`
}
