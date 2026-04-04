import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const useUserStore = create(
  persist(
    (set) => ({
      userId:     null,
      seedTopics: [],

      setUser: (userId, seedTopics) => set({ userId, seedTopics }),
      clearUser: () => set({ userId: null, seedTopics: [] }),
    }),
    { name: 'spine-user' }   // persists to localStorage
  )
)
