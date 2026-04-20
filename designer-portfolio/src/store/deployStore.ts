import { create } from 'zustand'
import axios from 'axios'

const API_URL = 'http://localhost:3002/api'

interface Deployment {
  id: string
  userId: string
  name: string
  slug: string
  customDomain?: string
  status: 'pending' | 'building' | 'deployed' | 'failed' | 'archived'
  buildLog?: string
  buildTime?: number
  deployedUrl: string
  filePath?: string
  fileSize?: number
  commitSha?: string
  branch?: string
  views: number
  lastDeployedAt?: string
  createdAt: string
  updatedAt: string
}

interface DeployState {
  deployments: Deployment[]
  currentDeployment: Deployment | null
  loading: boolean
  error: string | null
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
  getDeployments: (params?: { page?: number; limit?: number; status?: string }) => Promise<void>
  getDeploymentById: (id: string) => Promise<void>
  createDeployment: (data: { projectName: string; customDomain?: string; file?: File }) => Promise<Deployment>
  buildDeployment: (id: string) => Promise<void>
  deleteDeployment: (id: string) => Promise<void>
  clearError: () => void
}

export const useDeployStore = create<DeployState>((set, get) => ({
  deployments: [],
  currentDeployment: null,
  loading: false,
  error: null,
  pagination: {
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0
  },

  getDeployments: async (params) => {
    set({ loading: true, error: null })
    try {
      const token = localStorage.getItem('accessToken')
      const queryParams = new URLSearchParams()

      if (params?.page) queryParams.append('page', params.page.toString())
      if (params?.limit) queryParams.append('limit', params.limit.toString())
      if (params?.status) queryParams.append('status', params.status)

      const response = await axios.get(`${API_URL}/deploy?${queryParams.toString()}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      const { data, page, limit, total, totalPages } = response.data.data

      set({
        deployments: data || [],
        pagination: { page, limit, total, totalPages },
        loading: false
      })
    } catch (error: any) {
      const message = error.response?.data?.message || error.response?.data?.error || '获取部署列表失败'
      set({ error: message, loading: false })
    }
  },

  getDeploymentById: async (id) => {
    set({ loading: true, error: null })
    try {
      const token = localStorage.getItem('accessToken')
      const response = await axios.get(`${API_URL}/deploy/${id}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      set({ currentDeployment: response.data.data.deployment, loading: false })
    } catch (error: any) {
      const message = error.response?.data?.message || error.response?.data?.error || '获取部署详情失败'
      set({ error: message, loading: false })
    }
  },

  createDeployment: async (data) => {
    set({ loading: true, error: null })
    try {
      const token = localStorage.getItem('accessToken')
      const formData = new FormData()
      formData.append('projectName', data.projectName)
      if (data.customDomain) {
        formData.append('customDomain', data.customDomain)
      }
      if (data.file) {
        formData.append('file', data.file)
      }

      const response = await axios.post(`${API_URL}/deploy`, formData, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      })

      const newDeployment = response.data.data.deployment
      set((state) => ({
        deployments: [newDeployment, ...state.deployments],
        loading: false
      }))
      return newDeployment
    } catch (error: any) {
      const message = error.response?.data?.message || error.response?.data?.error || '创建部署失败'
      set({ error: message, loading: false })
      throw error
    }
  },

  buildDeployment: async (id) => {
    set({ loading: true, error: null })
    try {
      const token = localStorage.getItem('accessToken')
      const response = await axios.post(`${API_URL}/deploy/build/${id}`, {}, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      const updatedDeployment = response.data.data.deployment
      set((state) => ({
        deployments: state.deployments.map(d => d.id === id ? updatedDeployment : d),
        currentDeployment: state.currentDeployment?.id === id ? updatedDeployment : state.currentDeployment,
        loading: false
      }))
    } catch (error: any) {
      const message = error.response?.data?.message || error.response?.data?.error || '构建部署失败'
      set({ error: message, loading: false })
      throw error
    }
  },

  deleteDeployment: async (id) => {
    set({ loading: true, error: null })
    try {
      const token = localStorage.getItem('accessToken')
      await axios.delete(`${API_URL}/deploy/${id}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      set((state) => ({
        deployments: state.deployments.filter(d => d.id !== id),
        currentDeployment: state.currentDeployment?.id === id ? null : state.currentDeployment,
        loading: false
      }))
    } catch (error: any) {
      const message = error.response?.data?.message || error.response?.data?.error || '删除部署失败'
      set({ error: message, loading: false })
      throw error
    }
  },

  clearError: () => set({ error: null })
}))
