import { useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useWorkStore } from '../store/workStore'

const WorkDetail = () => {
  const { id } = useParams<{ id: string }>()
  const { getWorkById, currentWork, loading, error } = useWorkStore()

  useEffect(() => {
    if (id) {
      getWorkById(id)
    }
  }, [id, getWorkById])

  if (loading) {
    return (
      <div className="container text-center py-20">
        <div className="loading"></div>
        <p className="mt-4 text-sm text-ash">加载中...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container py-20">
        <div className="bg-rose-gold/10 border border-rose-gold/30 rounded-lg p-4 mb-4">
          <p className="text-rose-gold">{error}</p>
        </div>
        <button onClick={() => getWorkById(id!)} className="btn-primary">
          重试
        </button>
      </div>
    )
  }

  if (!currentWork) {
    return (
      <div className="container py-20 text-center">
        <p className="text-ash">作品不存在</p>
        <Link to="/works" className="btn-primary mt-4">
          返回作品列表
        </Link>
      </div>
    )
  }

  return (
    <div className="container">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-display text-ivory">作品详情</h1>
        <div className="flex gap-2">
          <Link to={`/works/${id}/edit`} className="btn-secondary">
            编辑
          </Link>
          <Link to="/works" className="btn-secondary">
            返回列表
          </Link>
        </div>
      </div>

      <div className="card mb-8">
        <div className="mb-6">
          <h2 className="text-2xl font-display text-ivory mb-2">{currentWork.title}</h2>
          <p className="text-ash">{currentWork.description || '无描述'}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div>
            <h3 className="text-sm font-medium text-pearl mb-2">状态</h3>
            <span className={`px-2 py-1 rounded-full text-xs ${currentWork.status === 'published' ? 'bg-emerald/20 text-emerald' : 'bg-amber/20 text-amber'}`}>
              {currentWork.status === 'published' ? '已发布' : '草稿'}
            </span>
          </div>
          <div>
            <h3 className="text-sm font-medium text-pearl mb-2">可见性</h3>
            <span className="text-sm text-ash">
              {currentWork.visibility === 'public' ? '公开' : '私有'}
            </span>
          </div>
          <div>
            <h3 className="text-sm font-medium text-pearl mb-2">创建时间</h3>
            <span className="text-sm text-ash">
              {new Date(currentWork.created_at).toLocaleString()}
            </span>
          </div>
          <div>
            <h3 className="text-sm font-medium text-pearl mb-2">更新时间</h3>
            <span className="text-sm text-ash">
              {new Date(currentWork.updated_at).toLocaleString()}
            </span>
          </div>
        </div>

        <div className="border-t border-silver pt-6">
          <h3 className="text-sm font-medium text-pearl mb-4">预览</h3>
          <div className="bg-graphite rounded-lg p-8 flex items-center justify-center">
            {currentWork.cover_image_url ? (
              <img
                src={currentWork.cover_image_url}
                alt={currentWork.title}
                className="max-w-full max-h-64 object-contain"
              />
            ) : (
              <div className="text-ash">无封面图片</div>
            )}
          </div>
        </div>
      </div>

      <div className="card">
        <h3 className="text-lg font-display text-ivory mb-4">作品统计</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-graphite rounded-lg p-4">
            <h4 className="text-sm text-ash mb-1">浏览量</h4>
            <p className="text-xl font-bold text-ivory">{currentWork.view_count}</p>
          </div>
          <div className="bg-graphite rounded-lg p-4">
            <h4 className="text-sm text-ash mb-1">点赞数</h4>
            <p className="text-xl font-bold text-ivory">{currentWork.like_count}</p>
          </div>
          <div className="bg-graphite rounded-lg p-4">
            <h4 className="text-sm text-ash mb-1">评论数</h4>
            <p className="text-xl font-bold text-ivory">{currentWork.comment_count}</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default WorkDetail