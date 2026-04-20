import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useWorkStore } from '../store/workStore'

const Dashboard = () => {
  const { works, loading, getWorks } = useWorkStore()

  useEffect(() => {
    getWorks()
  }, [getWorks])

  const totalWorks = works.length
  const publishedWorks = works.filter(w => w.status === 'published').length
  const draftWorks = works.filter(w => w.status === 'draft').length

  if (loading) {
    return (
      <div className="container text-center py-20">
        <div className="loading"></div>
        <p className="mt-4 text-sm text-ash">加载中...</p>
      </div>
    )
  }

  return (
    <div className="container">
      <div className="mb-8">
        <h1 className="text-3xl font-display text-ivory mb-2">仪表盘</h1>
        <p className="text-ash">欢迎回来，查看您的作品集概览</p>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="card">
          <h3 className="text-lg font-display text-champagne mb-2">总作品数</h3>
          <p className="text-3xl font-bold text-ivory">{totalWorks}</p>
        </div>
        <div className="card">
          <h3 className="text-lg font-display text-champagne mb-2">已发布</h3>
          <p className="text-3xl font-bold text-ivory">{publishedWorks}</p>
        </div>
        <div className="card">
          <h3 className="text-lg font-display text-champagne mb-2">草稿</h3>
          <p className="text-3xl font-bold text-ivory">{draftWorks}</p>
        </div>
      </div>

      {/* 最近作品 */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-display text-ivory">最近作品</h2>
          <Link to="/works" className="text-champagne hover:underline text-sm">
            查看全部
          </Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {works.slice(0, 3).map((work) => (
            <Link
              key={work.uuid}
              to={`/works/${work.uuid}`}
              className="card hover-lift block"
            >
              <div className="h-48 bg-graphite rounded-lg mb-4 flex items-center justify-center">
                {work.cover_image_url ? (
                  <img
                    src={work.cover_image_url}
                    alt={work.title}
                    className="w-full h-full object-cover rounded-lg"
                  />
                ) : (
                  <div className="text-ash">无封面</div>
                )}
              </div>
              <h3 className="text-lg font-display text-ivory mb-2">{work.title}</h3>
              <p className="text-sm text-ash mb-3 line-clamp-2">
                {work.description || '无描述'}
              </p>
              <div className="flex justify-between items-center text-xs text-ash">
                <span>{work.status === 'published' ? '已发布' : '草稿'}</span>
                <span>{new Date(work.created_at).toLocaleDateString()}</span>
              </div>
            </Link>
          ))}
          {works.length === 0 && (
            <div className="col-span-full card text-center py-12">
              <p className="text-ash mb-4">还没有作品</p>
              <Link to="/works/create" className="btn-primary">
                创建第一个作品
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* 快速操作 */}
      <div className="card">
        <h2 className="text-xl font-display text-ivory mb-4">快速操作</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Link to="/works/create" className="btn-primary py-4 text-center">
            创建新作品
          </Link>
          <Link to="/works" className="btn-secondary py-4 text-center">
            管理作品
          </Link>
        </div>
      </div>
    </div>
  )
}

export default Dashboard