import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const useUserStore = create(
  persist(
    (set) => ({
      userId:      null,
      seedTopics:  [],
      email:       null,
      preferences: {},   // reading_mode, pdf_view, theme, topics

      setUser: (userId, seedTopics, email = null) => set({ userId, seedTopics, email }),
      setPreferences: (prefs) => set((s) => ({ preferences: { ...s.preferences, ...prefs } })),
      clearUser: () => set({ userId: null, seedTopics: [], email: null, preferences: {} }),
    }),
    { name: 'spine-user' }
  )
)
