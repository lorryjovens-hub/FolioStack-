import { create } from 'zustand'
import axios from 'axios'

const API_URL = 'http://localhost:3002/api'

interface UploadedFile {
  id: string
  originalName: string
  filename: string
  size: number
  mimetype: string
  url: string
  uploadedAt: string
}

interface UploadState {
  uploading: boolean
  progress: number
  error: string | null
  uploadedFiles: UploadedFile[]
  uploadFile: (file: File) => Promise<UploadedFile>
  uploadMultiple: (files: File[]) => Promise<UploadedFile[]>
  uploadImage: (file: File) => Promise<UploadedFile>
  deleteFile: (filename: string) => Promise<void>
  clearError: () => void
}

export const useUploadStore = create<UploadState>((set, get) => ({
  uploading: false,
  progress: 0,
  error: null,
  uploadedFiles: [],

  uploadFile: async (file) => {
    set({ uploading: true, progress: 0, error: null })
    try {
      const token = localStorage.getItem('accessToken')
      const formData = new FormData()
      formData.append('file', file)

      const response = await axios.post(`${API_URL}/upload/file`, formData, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        },
        onUploadProgress: (progressEvent) => {
          const progress = progressEvent.total
            ? Math.round((progressEvent.loaded * 100) / progressEvent.total)
            : 0
          set({ progress })
        }
      })

      const uploadedFile = response.data.data.file
      set((state) => ({
        uploadedFiles: [...state.uploadedFiles, uploadedFile],
        uploading: false,
        progress: 100
      }))
      return uploadedFile
    } catch (error: any) {
      const message = error.response?.data?.message || error.response?.data?.error || '文件上传失败'
      set({ error: message, uploading: false })
      throw error
    }
  },

  uploadMultiple: async (files) => {
    set({ uploading: true, progress: 0, error: null })
    try {
      const token = localStorage.getItem('accessToken')
      const formData = new FormData()
      files.forEach((file) => {
        formData.append('files', file)
      })

      const response = await axios.post(`${API_URL}/upload/multiple`, formData, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        },
        onUploadProgress: (progressEvent) => {
          const progress = progressEvent.total
            ? Math.round((progressEvent.loaded * 100) / progressEvent.total)
            : 0
          set({ progress })
        }
      })

      const uploadedFiles = response.data.data.files
      set((state) => ({
        uploadedFiles: [...state.uploadedFiles, ...uploadedFiles],
        uploading: false,
        progress: 100
      }))
      return uploadedFiles
    } catch (error: any) {
      const message = error.response?.data?.message || error.response?.data?.error || '文件上传失败'
      set({ error: message, uploading: false })
      throw error
    }
  },

  uploadImage: async (file) => {
    set({ uploading: true, progress: 0, error: null })
    try {
      const token = localStorage.getItem('accessToken')
      const formData = new FormData()
      formData.append('image', file)

      const response = await axios.post(`${API_URL}/upload/image`, formData, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        },
        onUploadProgress: (progressEvent) => {
          const progress = progressEvent.total
            ? Math.round((progressEvent.loaded * 100) / progressEvent.total)
            : 0
          set({ progress })
        }
      })

      const uploadedFile = response.data.data.image
      set((state) => ({
        uploadedFiles: [...state.uploadedFiles, uploadedFile],
        uploading: false,
        progress: 100
      }))
      return uploadedFile
    } catch (error: any) {
      const message = error.response?.data?.message || error.response?.data?.error || '图片上传失败'
      set({ error: message, uploading: false })
      throw error
    }
  },

  deleteFile: async (filename) => {
    try {
      const token = localStorage.getItem('accessToken')
      await axios.delete(`${API_URL}/upload/file/${filename}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      set((state) => ({
        uploadedFiles: state.uploadedFiles.filter(f => f.filename !== filename)
      }))
    } catch (error: any) {
      const message = error.response?.data?.message || error.response?.data?.error || '删除文件失败'
      set({ error: message })
      throw error
    }
  },

  clearError: () => set({ error: null })
}))
