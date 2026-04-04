import { create } from 'zustand'

export const useFeedStore = create((set) => ({
  hero:                    null,
  queue:                   [],
  missed:                  [],
  newPapers:               [],
  stats:                   null,
  coldStart:               true,
  sessionsUntilReranking:  5,
  loading:                 false,
  error:                   null,

  setFeed: (data) => set({
    hero:                   data.hero,
    queue:                  data.queue,
    missed:                 data.missed,
    newPapers:              data.new,
    stats:                  data.stats,
    coldStart:              data.cold_start,
    sessionsUntilReranking: data.sessions_until_reranking ?? 0,
  }),
  setLoading: (loading) => set({ loading }),
  setError:   (error)   => set({ error }),
}))
