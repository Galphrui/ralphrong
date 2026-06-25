import { motion } from 'framer-motion'
import { postUpdatedAt } from '../utils/postSort'

export default function PostCard({ post, onClick }) {
  const updatedAt = postUpdatedAt(post)
  const showUpdatedAt = updatedAt && updatedAt !== post.date

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
        {showUpdatedAt && <span>修改 {updatedAt.slice(0, 10)}</span>}
      </div>

      {/* Title */}
      <h3 className="mb-3 line-clamp-2 text-xl font-black leading-tight text-slate-950">
        {post.title}
      </h3>

      {/* Summary */}
      <p className="mb-4 line-clamp-3 text-sm leading-6 text-slate-600">{post.summary}</p>

      {/* Tags */}
      <div className="flex flex-wrap gap-2">
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
      </div>
    </motion.article>
  )
}
