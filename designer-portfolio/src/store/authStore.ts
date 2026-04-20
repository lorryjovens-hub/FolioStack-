import { create } from 'zustand'
import axios from 'axios'

const API_URL = 'http://localhost:3002/api'

interface User {
  id: string
  uuid: string
  username: string
  email: string
  displayName: string
  role: string
  avatar?: string
  bio?: string
}

interface AuthState {
  user: User | null
  loading: boolean
  error: string | null
  isAuthenticated: boolean
  login: (username: string, password: string) => Promise<void>
  register: (username: string, email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  checkAuth: () => Promise<void>
  clearError: () => void
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  loading: false,
  error: null,
  isAuthenticated: false,

  login: async (username, password) => {
    set({ loading: true, error: null })
    try {
      const response = await axios.post(`${API_URL}/auth/login`, {
        username,
        password
      }, {
        headers: {
          'Content-Type': 'application/json'
        }
      })

      const { user, accessToken, refreshToken } = response.data.data

      localStorage.setItem('accessToken', accessToken)
      localStorage.setItem('refreshToken', refreshToken)
      localStorage.setItem('user', JSON.stringify(user))

      axios.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`

      set({ user, isAuthenticated: true, loading: false })
    } catch (error: any) {
      const message = error.response?.data?.message || error.response?.data?.error || '登录失败'
      set({ error: message, loading: false })
      throw error
    }
  },

  register: async (username, email, password) => {
    set({ loading: true, error: null })
    try {
      const response = await axios.post(`${API_URL}/auth/register`, {
        username,
        email,
        password
      }, {
        headers: {
          'Content-Type': 'application/json'
        }
      })

      const { user, accessToken, refreshToken } = response.data.data

      localStorage.setItem('accessToken', accessToken)
      localStorage.setItem('refreshToken', refreshToken)
      localStorage.setItem('user', JSON.stringify(user))

      axios.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`

      set({ user, isAuthenticated: true, loading: false })
    } catch (error: any) {
      const message = error.response?.data?.message || error.response?.data?.error || '注册失败'
      set({ error: message, loading: false })
      throw error
    }
  },

  logout: async () => {
    set({ loading: true })
    try {
      const token = localStorage.getItem('accessToken')
      if (token) {
        await axios.post(`${API_URL}/auth/logout`, {}, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })
      }
    } catch (error) {
      console.error('Logout error:', error)
    } finally {
      localStorage.removeItem('accessToken')
      localStorage.removeItem('refreshToken')
      localStorage.removeItem('user')
      delete axios.defaults.headers.common['Authorization']
      set({ user: null, isAuthenticated: false, loading: false })
    }
  },

  checkAuth: async () => {
    const token = localStorage.getItem('accessToken')
    const userStr = localStorage.getItem('user')

    if (token && userStr) {
      try {
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`

        const user = JSON.parse(userStr)
        set({ user, isAuthenticated: true })

        const response = await axios.get(`${API_URL}/users/me/profile`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })

        if (response.data.data) {
          set({ user: response.data.data.user, isAuthenticated: true })
          localStorage.setItem('user', JSON.stringify(response.data.data.user))
        }
      } catch (error) {
        localStorage.removeItem('accessToken')
        localStorage.removeItem('refreshToken')
        localStorage.removeItem('user')
        delete axios.defaults.headers.common['Authorization']
        set({ user: null, isAuthenticated: false })
      }
    } else {
      set({ user: null, isAuthenticated: false })
    }
  },

  clearError: () => set({ error: null })
}))

const token = localStorage.getItem('accessToken')
if (token) {
  axios.defaults.headers.common['Authorization'] = `Bearer ${token}`
}
