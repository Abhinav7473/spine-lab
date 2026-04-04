import { create } from 'zustand'

// Tracks the active reading session and buffers events before flushing to backend.
//
// Dwell time accuracy:
//   getDwellSeconds() returns *active* reading time — wall clock minus idle.
//   Idle periods are tracked explicitly (tab hidden, 2+ min without scroll).
//   This prevents a user who opens a paper and walks away from inflating their signal.

export const useSessionStore = create((set, get) => ({
  sessionId:     null,
  paperId:       null,
  startedAt:     null,
  eventBuffer:   [],
  stayedInApp:   true,

  // Idle tracking
  totalIdleMs:   0,      // accumulated milliseconds where user was not reading
  idleStartedAt: null,   // Date.now() when current idle period started; null = active

  startSession: (sessionId, paperId) => set({
    sessionId,
    paperId,
    startedAt:     Date.now(),
    eventBuffer:   [],
    stayedInApp:   true,
    totalIdleMs:   0,
    idleStartedAt: null,
  }),

  pushEvent: (event) => set((state) => ({
    eventBuffer: [...state.eventBuffer, event],
  })),

  markLeftApp: () => set({ stayedInApp: false }),

  // Call when user becomes inactive (tab hidden, no scroll for 2+ min)
  pauseIdle: () => set((state) => ({
    // Don't overwrite idleStartedAt if already idle
    idleStartedAt: state.idleStartedAt ?? Date.now(),
  })),

  // Call when user returns (tab visible, scroll detected after idle)
  resumeActive: () => set((state) => {
    if (!state.idleStartedAt) return {}  // wasn't idle, nothing to do
    const idleMs = Date.now() - state.idleStartedAt
    return { totalIdleMs: state.totalIdleMs + idleMs, idleStartedAt: null }
  }),

  clearSession: () => set({
    sessionId:     null,
    paperId:       null,
    startedAt:     null,
    eventBuffer:   [],
    stayedInApp:   true,
    totalIdleMs:   0,
    idleStartedAt: null,
  }),

  // Active reading seconds only — does not count idle periods
  getDwellSeconds: () => {
    const { startedAt, totalIdleMs, idleStartedAt } = get()
    if (!startedAt) return 0
    const ongoingIdleMs = idleStartedAt ? Date.now() - idleStartedAt : 0
    return Math.max(0, Math.floor(
      (Date.now() - startedAt - totalIdleMs - ongoingIdleMs) / 1000
    ))
  },
}))
