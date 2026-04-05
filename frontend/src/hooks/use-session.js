import { useEffect, useRef } from 'react'
import { api } from '../utils/api'
import { useSessionStore } from '../stores/session-store'
import { useUserStore } from '../stores/user-store'
import { getScrollDepth, getVisibleSection } from '../utils/signal'

const SCROLL_THROTTLE_MS = 2000
const IDLE_THRESHOLD_MS  = 2 * 60 * 1000   // 2 min without scroll → idle

export function useSession(paperId, containerRef, onScrollDepth) {
  const { userId } = useUserStore()
  const {
    sessionId, startSession, pushEvent,
    markLeftApp, clearSession, getDwellSeconds,
    pauseIdle, resumeActive,
  } = useSessionStore()
  // NOTE: `completed` is read directly from store state at close time, not from hook state

  // Two separate refs with distinct responsibilities:
  //   lastScrollAt    — updated on EVERY scroll event (used by idle watcher)
  //   lastSignalCalcAt — updated only when throttle passes (gates expensive ops)
  const lastScrollAt     = useRef(0)
  const lastSignalCalcAt = useRef(0)
  const sectionsVisited  = useRef(new Set())
  const maxScrollDepth   = useRef(0)
  const currentSection   = useRef(null)       // section currently in view
  const sectionEnteredAt = useRef({})         // section → timestamp when it became visible
  const sectionDwells    = useRef({})         // section → cumulative dwell ms

  // ── Session lifecycle ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!userId || !paperId) return

    let id

    api.post('/sessions/', { user_id: userId, paper_id: paperId })
      .then((data) => {
        id = data.session_id
        startSession(id, paperId)
      })

    // Tab hidden → pause dwell counter immediately
    const handleVisibility = () => {
      if (document.hidden) {
        pauseIdle()
        pushEvent({ event_type: 'blur' })
      } else {
        resumeActive()
        pushEvent({ event_type: 'focus' })
      }
    }
    document.addEventListener('visibilitychange', handleVisibility)

    // Window blur catches external opens (PDF viewer, dev tools, etc.)
    const handleBlur  = () => { markLeftApp(); pauseIdle() }
    const handleFocus = () => resumeActive()
    window.addEventListener('blur',  handleBlur)
    window.addEventListener('focus', handleFocus)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility)
      window.removeEventListener('blur',  handleBlur)
      window.removeEventListener('focus', handleFocus)

      if (!id) return

      // Flush any section still in view at close time
      if (currentSection.current && sectionEnteredAt.current[currentSection.current]) {
        const elapsed = Date.now() - sectionEnteredAt.current[currentSection.current]
        sectionDwells.current[currentSection.current] =
          (sectionDwells.current[currentSection.current] || 0) + elapsed
      }

      // Convert ms → seconds for the API
      const section_dwells = Object.fromEntries(
        Object.entries(sectionDwells.current)
          .map(([s, ms]) => [s, Math.round(ms / 1000)])
          .filter(([, secs]) => secs > 0)
      )

      const storeState = useSessionStore.getState()
      const payload = {
        stayed_in_app:         storeState.stayedInApp,
        completed:             storeState.completed,
        reached_past_abstract: maxScrollDepth.current > 0.15,
        total_dwell_secs:      getDwellSeconds(),
        max_scroll_depth:      maxScrollDepth.current,
        sections_visited:      [...sectionsVisited.current],
        section_dwells,
      }

      api.post(`/sessions/${id}/close`, payload).catch(console.error)
      clearSession()
    }
  }, [userId, paperId]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Scroll tracking + idle detection ─────────────────────────────────────
  useEffect(() => {
    const el = containerRef?.current
    if (!el) return

    // Idle watcher — fires every 30s, reads lastScrollAt (not lastSignalCalcAt)
    const idleTimer = setInterval(() => {
      const sinceScroll = Date.now() - lastScrollAt.current
      if (lastScrollAt.current > 0 && sinceScroll > IDLE_THRESHOLD_MS) {
        const { idleStartedAt } = useSessionStore.getState()
        if (!idleStartedAt) {
          pauseIdle()
          pushEvent({ event_type: 'idle' })
        }
      }
    }, 30_000)

    function handleScroll() {
      const now = Date.now()

      // Always update lastScrollAt — the idle watcher depends on this
      lastScrollAt.current = now

      // Idle resume: lightweight, run on every scroll before throttle check
      const { idleStartedAt } = useSessionStore.getState()
      if (idleStartedAt) {
        resumeActive()
        pushEvent({ event_type: 'focus' })
      }

      // Throttle gate — expensive signal ops only every SCROLL_THROTTLE_MS
      if (now - lastSignalCalcAt.current < SCROLL_THROTTLE_MS) return
      lastSignalCalcAt.current = now

      const depth   = getScrollDepth(el)
      const section = getVisibleSection(el)

      maxScrollDepth.current = Math.max(maxScrollDepth.current, depth)
      onScrollDepth?.(maxScrollDepth.current)

      // Track section transitions for per-section dwell
      if (section !== currentSection.current) {
        const now = Date.now()
        // Exit previous section — accumulate its dwell
        if (currentSection.current && sectionEnteredAt.current[currentSection.current]) {
          const elapsed = now - sectionEnteredAt.current[currentSection.current]
          sectionDwells.current[currentSection.current] =
            (sectionDwells.current[currentSection.current] || 0) + elapsed
        }
        // Enter new section
        if (section) {
          sectionEnteredAt.current[section] = now
          sectionsVisited.current.add(section)
        }
        currentSection.current = section
      } else if (section) {
        sectionsVisited.current.add(section)
      }

      if (sessionId) {
        pushEvent({ event_type: 'scroll', payload: { scroll_pct: depth } })
        if (section) pushEvent({ event_type: 'section_enter', section })
      }
    }

    el.addEventListener('scroll', handleScroll, { passive: true })
    return () => {
      el.removeEventListener('scroll', handleScroll)
      clearInterval(idleTimer)
    }
  }, [sessionId, containerRef]) // eslint-disable-line react-hooks/exhaustive-deps
}
