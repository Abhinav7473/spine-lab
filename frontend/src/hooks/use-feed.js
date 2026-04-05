import { useCallback } from 'react'
import { api } from '../utils/api'
import { useFeedStore } from '../stores/feed-store'
import { useUserStore } from '../stores/user-store'

export function useFeed() {
  const {
    recommendations, unread, stats,
    coldStart, sessionsUntilReranking,
    loading, error,
    setFeed, setLoading, setError,
  } = useFeedStore()

  const { userId } = useUserStore()

  const loadFeed = useCallback(async () => {
    if (!userId) return
    setLoading(true)
    setError(null)
    try {
      const data = await api.get(`/feed/${userId}`)
      setFeed(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [userId, setFeed, setLoading, setError])

  const totalCount = recommendations.length + unread.length

  return {
    recommendations, unread, stats,
    coldStart, sessionsUntilReranking,
    totalCount,
    loading, error,
    loadFeed,
  }
}
