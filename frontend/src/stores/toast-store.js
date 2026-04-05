import { create } from 'zustand'

let _nextId = 1

export const useToastStore = create((set) => ({
  toasts: [],

  show: (message, { type = 'info', duration = 3500 } = {}) => {
    const id = _nextId++
    set(s => ({ toasts: [...s.toasts, { id, message, type }] }))
    setTimeout(() => {
      set(s => ({ toasts: s.toasts.filter(t => t.id !== id) }))
    }, duration)
    return id
  },

  dismiss: (id) => set(s => ({ toasts: s.toasts.filter(t => t.id !== id) })),
}))

// Convenience outside React — call toast.show("msg") anywhere
export const toast = {
  show:    (...args) => useToastStore.getState().show(...args),
  success: (msg)    => useToastStore.getState().show(msg, { type: 'success' }),
  warn:    (msg)    => useToastStore.getState().show(msg, { type: 'warn' }),
  error:   (msg)    => useToastStore.getState().show(msg, { type: 'error', duration: 5000 }),
}
