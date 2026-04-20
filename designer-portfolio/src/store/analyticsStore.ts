import { create } from 'zustand'
import axios from 'axios'

const API_URL = 'http://localhost:3002/api'

interface AnalyticsOverview {
  totalViews: number
  totalWorks: number
  totalDeployments: number
}

interface TopWork {
  workId: string
  views: number
  work: {
    id: string
    title: string
    thumbnail?: string
  }
}

interface EventByDay {
  date: string
  count: number
}

interface EventByType {
  eventType: string
  count: number
}

interface AnalyticsState {
  loading: boolean
  error: string | null
  overview: AnalyticsOverview | null
  topWorks: TopWork[]
  eventsByDay: EventByDay[]
  eventsByType: EventByType[]
  recentEvents: any[]
  getOverview: (params?: { startDate?: string; endDate?: string }) => Promise<void>
  trackEvent: (eventType: string, workId?: string, metadata?: Record<string, any>) => Promise<void>
  getWorkStats: (workId: string) => Promise<any>
  clearError: () => void
}

export const useAnalyticsStore = create<AnalyticsState>((set) => ({
  loading: false,
  error: null,
  overview: null,
  topWorks: [],
  eventsByDay: [],
  eventsByType: [],
  recentEvents: [],

  getOverview: async (params) => {
    set({ loading: true, error: null })
    try {
      const token = localStorage.getItem('accessToken')
      const queryParams = new URLSearchParams()

      if (params?.startDate) queryParams.append('startDate', params.startDate)
      if (params?.endDate) queryParams.append('endDate', params.endDate)

      const response = await axios.get(`${API_URL}/analytics/stats/overview?${queryParams.toString()}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      const { overview, topWorks, eventsByDay, eventsByType, recentEvents } = response.data.data

      set({
        overview,
        topWorks: topWorks || [],
        eventsByDay: eventsByDay || [],
        eventsByType: eventsByType || [],
        recentEvents: recentEvents || [],
        loading: false
      })
    } catch (error: any) {
      const message = error.response?.data?.message || error.response?.data?.error || '获取分析数据失败'
      set({ error: message, loading: false })
    }
  },

  trackEvent: async (eventType, workId, metadata) => {
    try {
      const token = localStorage.getItem('accessToken')
      await axios.post(`${API_URL}/analytics/track`, {
        eventType,
        workId,
        metadata
      }, {
        headers: {
          'Authorization': token ? `Bearer ${token}` : undefined,
          'Content-Type': 'application/json'
        }
      })
    } catch (error) {
      console.error('Track event error:', error)
    }
  },

  getWorkStats: async (workId) => {
    set({ loading: true, error: null })
    try {
      const token = localStorage.getItem('accessToken')
      const response = await axios.get(`${API_URL}/analytics/stats/works/${workId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      set({ loading: false })
      return response.data.data
    } catch (error: any) {
      const message = error.response?.data?.message || error.response?.data?.error || '获取作品统计失败'
      set({ error: message, loading: false })
      throw error
    }
  },

  clearError: () => set({ error: null })
}))
