import { useState } from 'react'
import axios from 'axios'

interface FileUploadProps {
  label: string
  onFileUpload: (fileUrl: string) => void
  initialFileUrl?: string
  accept?: string
  multiple?: boolean
}

const FileUpload = ({ 
  label, 
  onFileUpload, 
  initialFileUrl, 
  accept = 'image/*',
  multiple = false 
}: FileUploadProps) => {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    setLoading(true)
    setError(null)

    try {
      const formData = new FormData()
      formData.append('file', files[0])

      const response = await axios.post('/api/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      })

      if (response.data.success) {
        onFileUpload(response.data.fileUrl)
      } else {
        setError('上传失败')
      }
    } catch (err: any) {
      setError(err.response?.data?.error || '上传失败')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="form-group">
      <label className="form-label">{label}</label>
      <div className="border-2 border-dashed border-silver rounded-lg p-6 text-center hover:border-champagne transition-colors">
        {initialFileUrl ? (
          <div className="relative mb-4">
            <img
              src={initialFileUrl}
              alt="Preview"
              className="max-h-40 object-contain mx-auto"
            />
            <button
              type="button"
              onClick={() => onFileUpload('')}
              className="absolute top-2 right-2 bg-rose-gold text-white rounded-full p-1 hover:bg-rose-gold/80"
            >
              ×
            </button>
          </div>
        ) : null}
        <input
          type="file"
          accept={accept}
          multiple={multiple}
          onChange={handleFileChange}
          className="hidden"
          id={`file-upload-${Math.random().toString(36).substr(2, 9)}`}
        />
        <label
          htmlFor={`file-upload-${Math.random().toString(36).substr(2, 9)}`}
          className="cursor-pointer btn-secondary inline-block"
        >
          {loading ? (
            <div className="flex items-center gap-2">
              <div className="loading"></div>
              <span>上传中...</span>
            </div>
          ) : (
            initialFileUrl ? '更换文件' : '选择文件'
          )}
        </label>
        {error && (
          <p className="form-error mt-2">{error}</p>
        )}
        <p className="text-xs text-ash mt-2">
          支持的文件类型: {accept === 'image/*' ? '图片文件' : '所有文件'}
        </p>
      </div>
    </div>
  )
}

export default FileUpload