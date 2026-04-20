import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useWorkStore } from '../store/workStore'
import FileUpload from '../components/FileUpload'

const WorkEdit = () => {
  const { id } = useParams<{ id: string }>()
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    status: 'draft',
    visibility: 'public',
    cover_image_url: ''
  })
  const { getWorkById, currentWork, updateWork, loading, error, clearError } = useWorkStore()
  const navigate = useNavigate()

  useEffect(() => {
    if (id) {
      getWorkById(id)
    }
  }, [id, getWorkById])

  useEffect(() => {
    if (currentWork) {
      setFormData({
        title: currentWork.title,
        description: currentWork.description,
        status: currentWork.status,
        visibility: currentWork.visibility,
        cover_image_url: currentWork.cover_image_url || ''
      })
    }
  }, [currentWork])

  const handleFileUpload = (fileUrl: string) => {
    setFormData(prev => ({
      ...prev,
      cover_image_url: fileUrl
    }))
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    clearError()
    if (!id) return
    try {
      await updateWork(id, formData)
      navigate(`/works/${id}`)
    } catch (error) {
      // 错误已经在store中处理
    }
  }

  if (loading && !currentWork) {
    return (
      <div className="container text-center py-20">
        <div className="loading"></div>
        <p className="mt-4 text-sm text-ash">加载中...</p>
      </div>
    )
  }

  if (!currentWork) {
    return (
      <div className="container py-20 text-center">
        <p className="text-ash">作品不存在</p>
        <button onClick={() => navigate('/works')} className="btn-primary mt-4">
          返回作品列表
        </button>
      </div>
    )
  }

  return (
    <div className="container">
      <div className="mb-8">
        <h1 className="text-3xl font-display text-ivory mb-2">编辑作品</h1>
        <p className="text-ash">编辑 {currentWork.title}</p>
      </div>

      {error && (
        <div className="bg-rose-gold/10 border border-rose-gold/30 rounded-lg p-4 mb-6">
          <p className="text-rose-gold">{error}</p>
        </div>
      )}

      <div className="card">
        <form onSubmit={handleSubmit}>
          <div className="space-y-6">
            <div>
              <label htmlFor="title" className="form-label">
                标题 <span className="text-rose-gold">*</span>
              </label>
              <input
                id="title"
                name="title"
                type="text"
                required
                className="w-full"
                value={formData.title}
                onChange={handleChange}
              />
            </div>

            <div>
              <label htmlFor="description" className="form-label">
                描述
              </label>
              <textarea
                id="description"
                name="description"
                rows={4}
                className="w-full"
                value={formData.description}
                onChange={handleChange}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="status" className="form-label">
                  状态
                </label>
                <select
                  id="status"
                  name="status"
                  className="w-full"
                  value={formData.status}
                  onChange={handleChange}
                >
                  <option value="draft">草稿</option>
                  <option value="published">已发布</option>
                </select>
              </div>

              <div>
                <label htmlFor="visibility" className="form-label">
                  可见性
                </label>
                <select
                  id="visibility"
                  name="visibility"
                  className="w-full"
                  value={formData.visibility}
                  onChange={handleChange}
                >
                  <option value="public">公开</option>
                  <option value="private">私有</option>
                </select>
              </div>
            </div>

            <FileUpload
              label="封面图片"
              onFileUpload={handleFileUpload}
              initialFileUrl={formData.cover_image_url}
              accept="image/*"
            />

            <div className="flex justify-end gap-3 pt-4">
              <button
                type="button"
                onClick={() => navigate(`/works/${id}`)}
                className="btn-secondary"
              >
                取消
              </button>
              <button
                type="submit"
                disabled={loading}
                className="btn-primary"
              >
                {loading ? <div className="loading"></div> : '更新'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}

export default WorkEdit