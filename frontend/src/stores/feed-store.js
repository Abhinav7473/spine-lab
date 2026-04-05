import { create } from 'zustand'

export const useFeedStore = create((set) => ({
  recommendations:         [],
  unread:                  [],
  stats:                   null,
  coldStart:               true,
  sessionsUntilReranking:  5,
  loading:                 false,
  error:                   null,

  setFeed: (data) => set({
    recommendations:        data.recommendations,
    unread:                 data.unread,
    stats:                  data.stats,
    coldStart:              data.cold_start,
    sessionsUntilReranking: data.sessions_until_reranking ?? 0,
  }),
  setLoading: (loading) => set({ loading }),
  setError:   (error)   => set({ error }),
}))
