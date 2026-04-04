import { api } from '../utils/api'
import { useUserStore } from '../stores/user-store'

export function useUser() {
  const { userId, seedTopics, setUser, clearUser } = useUserStore()

  async function createUser(topics) {
    const data = await api.post('/users/', { seed_topics: topics })
    setUser(data.id, data.seed_topics)
    return data
  }

  return { userId, seedTopics, createUser, clearUser }
}
