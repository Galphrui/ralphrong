import { motion } from 'framer-motion'
import { postUpdatedAt } from '../utils/postSort'
import { likePost } from '../utils/api'
import { useBlogStore } from '../store/useStore'

export default function PostCard({ post, onClick }) {
  const { postMetrics, setPostMetrics } = useBlogStore()
  const updatedAt = postUpdatedAt(post)
  const showUpdatedAt = updatedAt && updatedAt !== post.date
  const metrics = postMetrics?.[post.slug] || { views: 0, likes: 0 }
  const isPasswordProtected = post.visibility === 'password'
  const attachmentCount = post.attachments?.length || 0

  const onLike = async (event) => {
    event.stopPropagation()
    try {
      const next = await likePost(post.slug)
      setPostMetrics(next)
    } catch (error) {
      console.warn(error)
    }
  }

  return (
    <motion.article
      className="cursor-pointer border border-slate-200 bg-white p-5 shadow-sm hover:border-primary-300 hover:shadow-soft"
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      {/* Meta */}
      <div className="mb-2 flex flex-wrap gap-x-3 gap-y-1 text-sm font-medium text-slate-500">
        <span>{post.date}</span>
        <span>{post.readingMinutes || 3} 分钟阅读</span>
        <span>{metrics.views || 0} 点击</span>
        <span>{metrics.likes || 0} 赞</span>
        {isPasswordProtected && <span>密码可见</span>}
        {attachmentCount > 0 && <span>{attachmentCount} 个附件</span>}
        {showUpdatedAt && <span>修改 {updatedAt.slice(0, 10)}</span>}
      </div>

      {/* Title */}
      <h3 className="mb-3 line-clamp-2 text-xl font-black leading-tight text-slate-950">
        {post.title}
      </h3>

      {/* Summary */}
      <p className="mb-4 line-clamp-3 text-sm leading-6 text-slate-600">{post.summary}</p>

      {/* Tags */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 flex-wrap gap-2">
          {post.tags?.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="inline-block bg-primary-50 px-3 py-1 text-xs font-bold text-primary-700"
            >
              {tag}
            </span>
          ))}
          {post.tags?.length > 3 && (
            <span className="py-1 text-xs text-slate-500">+{post.tags.length - 3}</span>
          )}
          {isPasswordProtected && (
            <span className="inline-block bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700">
              需授权
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={onLike}
          className="shrink-0 border border-primary-100 bg-primary-50 px-3 py-1.5 text-xs font-black text-primary-700 hover:border-primary-300"
        >
          点赞 {metrics.likes || 0}
        </button>
      </div>
    </motion.article>
  )
}
