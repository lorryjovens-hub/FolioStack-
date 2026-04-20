import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useWorkStore } from '../store/workStore'

const WorkList = () => {
  const { works, loading, error, getWorks, deleteWork } = useWorkStore()

  useEffect(() => {
    getWorks()
  }, [getWorks])

  const handleDelete = async (id: string) => {
    if (confirm('确定要删除这个作品吗？')) {
      try {
        await deleteWork(id)
      } catch (error) {
        // 错误已经在store中处理
      }
    }
  }

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
        <button onClick={() => getWorks()} className="btn-primary">
          重试
        </button>
      </div>
    )
  }

  return (
    <div className="container">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-display text-ivory">作品管理</h1>
        <Link to="/works/create" className="btn-primary">
          创建作品
        </Link>
      </div>

      <div className="card">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-silver">
                <th className="text-left py-4 px-6 text-sm font-medium text-pearl">
                  标题
                </th>
                <th className="text-left py-4 px-6 text-sm font-medium text-pearl">
                  状态
                </th>
                <th className="text-left py-4 px-6 text-sm font-medium text-pearl">
                  可见性
                </th>
                <th className="text-left py-4 px-6 text-sm font-medium text-pearl">
                  创建时间
                </th>
                <th className="text-right py-4 px-6 text-sm font-medium text-pearl">
                  操作
                </th>
              </tr>
            </thead>
            <tbody>
              {works.map((work) => (
                <tr key={work.uuid} className="border-b border-silver hover:bg-graphite/50">
                  <td className="py-4 px-6">
                    <Link to={`/works/${work.uuid}`} className="text-ivory hover:text-champagne">
                      {work.title}
                    </Link>
                  </td>
                  <td className="py-4 px-6">
                    <span className={`px-2 py-1 rounded-full text-xs ${work.status === 'published' ? 'bg-emerald/20 text-emerald' : 'bg-amber/20 text-amber'}`}>
                      {work.status === 'published' ? '已发布' : '草稿'}
                    </span>
                  </td>
                  <td className="py-4 px-6">
                    <span className="text-sm text-ash">
                      {work.visibility === 'public' ? '公开' : '私有'}
                    </span>
                  </td>
                  <td className="py-4 px-6">
                    <span className="text-sm text-ash">
                      {new Date(work.created_at).toLocaleDateString()}
                    </span>
                  </td>
                  <td className="py-4 px-6 text-right">
                    <div className="flex justify-end gap-2">
                      <Link to={`/works/${work.uuid}/edit`} className="btn-secondary text-xs py-1 px-3">
                        编辑
                      </Link>
                      <button
                        onClick={() => handleDelete(work.uuid)}
                        className="btn-danger text-xs py-1 px-3"
                      >
                        删除
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {works.length === 0 && (
          <div className="text-center py-12">
            <p className="text-ash mb-4">还没有作品</p>
            <Link to="/works/create" className="btn-primary">
              创建第一个作品
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}

export default WorkList