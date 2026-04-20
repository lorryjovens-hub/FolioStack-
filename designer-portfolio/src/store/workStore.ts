import { create } from 'zustand'
import axios from 'axios'

const API_URL = 'http://localhost:3002/api'

interface MediaItem {
  id: string
  media_type: string
  file_url: string
  file_name: string
  file_size: number
  mime_type: string
  thumbnail_url: string
  sort_order: number
  is_primary: boolean
  created_at: string
}

interface Work {
  id: string
  uuid: string
  userId: string
  title: string
  description: string
  type: 'link' | 'file' | 'github' | 'deployed'
  url?: string
  thumbnail?: string
  tags: string[]
  category?: string
  status: 'draft' | 'published' | 'archived'
  featured: boolean
  viewCount: number
  likeCount: number
  metadata?: Record<string, any>
  deployedUrl?: string
  createdAt: string
  updatedAt: string
  media?: MediaItem[]
  user?: {
    id: string
    username: string
    avatar?: string
  }
}

interface WorkState {
  works: Work[]
  currentWork: Work | null
  loading: boolean
  error: string | null
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
  getWorks: (params?: { page?: number; limit?: number; status?: string; category?: string }) => Promise<void>
  getWorkById: (id: string) => Promise<void>
  createWork: (work: Partial<Work>) => Promise<Work>
  updateWork: (id: string, work: Partial<Work>) => Promise<Work>
  deleteWork: (id: string) => Promise<void>
  importFromUrl: (url: string) => Promise<Work>
  importFromGithub: (url: string) => Promise<Work>
  likeWork: (id: string) => Promise<void>
  clearError: () => void
}

export const useWorkStore = create<WorkState>((set, get) => ({
  works: [],
  currentWork: null,
  loading: false,
  error: null,
  pagination: {
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0
  },

  getWorks: async (params) => {
    set({ loading: true, error: null })
    try {
      const token = localStorage.getItem('accessToken')
      const queryParams = new URLSearchParams()

      if (params?.page) queryParams.append('page', params.page.toString())
      if (params?.limit) queryParams.append('limit', params.limit.toString())
      if (params?.status) queryParams.append('status', params.status)
      if (params?.category) queryParams.append('category', params.category)

      const response = await axios.get(`${API_URL}/works?${queryParams.toString()}`, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      })

      const { data, page, limit, total, totalPages } = response.data.data

      set({
        works: data || [],
        pagination: { page, limit, total, totalPages },
        loading: false
      })
    } catch (error: any) {
      const message = error.response?.data?.message || error.response?.data?.error || '获取作品列表失败'
      set({ error: message, loading: false })
    }
  },

  getWorkById: async (id) => {
    set({ loading: true, error: null })
    try {
      const token = localStorage.getItem('accessToken')
      const response = await axios.get(`${API_URL}/works/${id}`, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      })

      set({ currentWork: response.data.data.work, loading: false })
    } catch (error: any) {
      const message = error.response?.data?.message || error.response?.data?.error || '获取作品详情失败'
      set({ error: message, loading: false })
    }
  },

  createWork: async (work) => {
    set({ loading: true, error: null })
    try {
      const token = localStorage.getItem('accessToken')
      const response = await axios.post(`${API_URL}/works`, work, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      const newWork = response.data.data.work
      set((state) => ({
        works: [newWork, ...state.works],
        loading: false
      }))
      return newWork
    } catch (error: any) {
      const message = error.response?.data?.message || error.response?.data?.error || '创建作品失败'
      set({ error: message, loading: false })
      throw error
    }
  },

  updateWork: async (id, work) => {
    set({ loading: true, error: null })
    try {
      const token = localStorage.getItem('accessToken')
      const response = await axios.patch(`${API_URL}/works/${id}`, work, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      const updatedWork = response.data.data.work
      set((state) => ({
        works: state.works.map(w => w.id === id ? updatedWork : w),
        currentWork: state.currentWork?.id === id ? updatedWork : state.currentWork,
        loading: false
      }))
      return updatedWork
    } catch (error: any) {
      const message = error.response?.data?.message || error.response?.data?.error || '更新作品失败'
      set({ error: message, loading: false })
      throw error
    }
  },

  deleteWork: async (id) => {
    set({ loading: true, error: null })
    try {
      const token = localStorage.getItem('accessToken')
      await axios.delete(`${API_URL}/works/${id}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      set((state) => ({
        works: state.works.filter(w => w.id !== id),
        currentWork: state.currentWork?.id === id ? null : state.currentWork,
        loading: false
      }))
    } catch (error: any) {
      const message = error.response?.data?.message || error.response?.data?.error || '删除作品失败'
      set({ error: message, loading: false })
      throw error
    }
  },

  importFromUrl: async (url) => {
    set({ loading: true, error: null })
    try {
      const token = localStorage.getItem('accessToken')
      const response = await axios.post(`${API_URL}/works/import-url`, { url }, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      const newWork = response.data.data.work
      set((state) => ({
        works: [newWork, ...state.works],
        loading: false
      }))
      return newWork
    } catch (error: any) {
      const message = error.response?.data?.message || error.response?.data?.error || '导入链接失败'
      set({ error: message, loading: false })
      throw error
    }
  },

  importFromGithub: async (url) => {
    set({ loading: true, error: null })
    try {
      const token = localStorage.getItem('accessToken')
      const response = await axios.post(`${API_URL}/works/import-github`, { url }, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      const newWork = response.data.data.work
      set((state) => ({
        works: [newWork, ...state.works],
        loading: false
      }))
      return newWork
    } catch (error: any) {
      const message = error.response?.data?.message || error.response?.data?.error || '导入GitHub仓库失败'
      set({ error: message, loading: false })
      throw error
    }
  },

  likeWork: async (id) => {
    try {
      const token = localStorage.getItem('accessToken')
      const response = await axios.post(`${API_URL}/works/${id}/like`, {}, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      const newLikeCount = response.data.data.likeCount
      set((state) => ({
        works: state.works.map(w => w.id === id ? { ...w, likeCount: newLikeCount } : w),
        currentWork: state.currentWork?.id === id ? { ...state.currentWork, likeCount: newLikeCount } : state.currentWork
      }))
    } catch (error: any) {
      console.error('Like work error:', error)
    }
  },

  clearError: () => set({ error: null })
}))
