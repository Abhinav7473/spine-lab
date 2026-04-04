import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// Stores the validated access role and raw code.
// role null = not yet validated — app shows the access gate.
export const useAccessStore = create(
  persist(
    (set) => ({
      role: null,   // 'dev' | 'user' | null
      code: null,   // raw code — sent as X-Access-Code for admin API calls

      setAccess: (role, code) => set({ role, code }),
      clearAccess: () => set({ role: null, code: null }),
    }),
    { name: 'spine-access' }
  )
)
