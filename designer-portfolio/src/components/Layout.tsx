import { Outlet, Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'

const Layout = () => {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* 导航栏 */}
      <header className="bg-charcoal border-b border-silver py-4">
        <div className="container flex justify-between items-center">
          <Link to="/" className="text-2xl font-display text-champagne">
            FolioStack
          </Link>
          <div className="flex items-center gap-3">
            {user ? (
              <>
                <span className="text-sm text-pearl">{user.username}</span>
                <button 
                  onClick={handleLogout}
                  className="btn-secondary"
                >
                  登出
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="btn-secondary">
                  登录
                </Link>
                <Link to="/register" className="btn-primary">
                  注册
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* 主内容 */}
      <main className="flex-grow py-8">
        <Outlet />
      </main>

      {/* 页脚 */}
      <footer className="bg-charcoal border-t border-silver py-6">
        <div className="container text-center text-sm text-ash">
          <p>© 2026 FolioStack. 作品集管理平台</p>
        </div>
      </footer>
    </div>
  )
}

export default Layout