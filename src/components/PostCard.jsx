import { motion } from 'framer-motion'
import { postUpdatedAt } from '../utils/postSort'
import { likePost } from '../utils/api'
import { useBlogStore } from '../store/useStore'

export default function PostCard({ post, onClick, displayStyle = 'list' }) {
  const { postMetrics, setPostMetrics } = useBlogStore()
  const updatedAt = postUpdatedAt(post)
  const showUpdatedAt = updatedAt && updatedAt !== post.date
  const metrics = postMetrics?.[post.slug] || { views: 0, likes: 0 }
  const isPasswordProtected = post.visibility === 'password'
  const attachmentCount = post.attachments?.length || 0
  const isCompact = displayStyle === 'compact'
  const isTimeline = displayStyle === 'timeline'
  const isMagazine = displayStyle === 'magazine'
  const isCodeBlock = displayStyle === 'code-block'
  const isGallery = displayStyle === 'gallery'
  const cardTone = isCodeBlock
    ? 'border-slate-800 bg-slate-950 text-slate-100 shadow-soft hover:border-primary-400'
    : 'border-slate-200 bg-white text-slate-900 hover:border-primary-300 hover:shadow-soft'

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
      data-animate-card
      className={`cursor-pointer border shadow-sm ${cardTone} ${
        isCompact ? 'p-4' : 'p-5'
      } ${isTimeline ? 'border-l-4 border-l-primary-600' : ''} ${
        isMagazine ? 'grid gap-4 lg:grid-cols-[0.85fr_1.15fr]' : ''
      }`}
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      {/* Meta */}
      <div className={`mb-2 flex flex-wrap gap-x-3 gap-y-1 text-sm font-medium ${isCodeBlock ? 'text-slate-300' : 'text-slate-500'}`}>
        <span>{post.date}</span>
        {!isCompact && <span>{post.readingMinutes || 3} 分钟阅读</span>}
        {!isCompact && <span>{metrics.views || 0} 点击</span>}
        {!isCompact && <span>{metrics.likes || 0} 赞</span>}
        {isPasswordProtected && <span>密码可见</span>}
        {attachmentCount > 0 && <span>{attachmentCount} 个附件</span>}
        {showUpdatedAt && <span>修改 {updatedAt.slice(0, 10)}</span>}
      </div>

      {/* Title */}
      <h3 className={`mb-3 line-clamp-2 font-black leading-tight ${isGallery ? 'text-lg' : 'text-xl'} ${isCodeBlock ? 'text-white' : 'text-slate-950'}`}>
        {post.title}
      </h3>

      {/* Summary */}
      {!isCompact && (
        <p className={`mb-4 line-clamp-3 text-sm leading-6 ${isCodeBlock ? 'text-slate-300' : 'text-slate-600'}`}>
          {post.summary}
        </p>
      )}

      {/* Tags */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 flex-wrap gap-2">
          {post.tags?.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className={`inline-block px-3 py-1 text-xs font-bold ${
                isCodeBlock ? 'border border-slate-700 bg-slate-900 text-primary-200' : 'bg-primary-50 text-primary-700'
              }`}
            >
              {tag}
            </span>
          ))}
          {post.tags?.length > 3 && (
            <span className={`py-1 text-xs ${isCodeBlock ? 'text-slate-300' : 'text-slate-500'}`}>+{post.tags.length - 3}</span>
          )}
          {isPasswordProtected && (
            <span className="inline-block bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700">
              需授权
            </span>
          )}
        </div>
        {!isMagazine && (
          <button
            type="button"
            onClick={onLike}
            className={`shrink-0 border px-3 py-1.5 text-xs font-black hover:border-primary-300 ${
              isCodeBlock ? 'border-slate-700 bg-slate-900 text-primary-200' : 'border-primary-100 bg-primary-50 text-primary-700'
            }`}
          >
            点赞 {metrics.likes || 0}
          </button>
        )}
      </div>
    </motion.article>
  )
}
