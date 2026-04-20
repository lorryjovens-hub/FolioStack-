import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'

const Register = () => {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    displayName: ''
  })
  const { register, loading, error, clearError } = useAuthStore()
  const navigate = useNavigate()

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    clearError()
    try {
      await register(
        formData.username,
        formData.email,
        formData.password,
        formData.displayName
      )
      navigate('/')
    } catch (error) {
      // 错误已经在store中处理
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h2 className="text-3xl font-display text-ivory mb-2">注册</h2>
          <p className="text-ash">创建您的 FolioStack 账户</p>
        </div>

        {error && (
          <div className="bg-rose-gold/10 border border-rose-gold/30 rounded-lg p-4">
            <p className="text-rose-gold text-sm">{error}</p>
          </div>
        )}

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="rounded-md shadow-sm space-y-4">
            <div>
              <label htmlFor="username" className="form-label">
                用户名
              </label>
              <input
                id="username"
                name="username"
                type="text"
                required
                className="w-full"
                value={formData.username}
                onChange={handleChange}
              />
            </div>

            <div>
              <label htmlFor="email" className="form-label">
                邮箱
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                className="w-full"
                value={formData.email}
                onChange={handleChange}
              />
            </div>

            <div>
              <label htmlFor="password" className="form-label">
                密码
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                className="w-full"
                value={formData.password}
                onChange={handleChange}
              />
            </div>

            <div>
              <label htmlFor="displayName" className="form-label">
                显示名称
              </label>
              <input
                id="displayName"
                name="displayName"
                type="text"
                className="w-full"
                value={formData.displayName}
                onChange={handleChange}
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-3"
            >
              {loading ? <div className="loading"></div> : '注册'}
            </button>
          </div>

          <div className="text-center text-sm">
            <p className="text-ash">
              已有账户？
              <Link to="/login" className="text-champagne ml-1 hover:underline">
                立即登录
              </Link>
            </p>
          </div>
        </form>
      </div>
    </div>
  )
}

export default Register