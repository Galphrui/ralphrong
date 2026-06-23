import { motion } from 'framer-motion'

export default function PostCard({ post, onClick }) {
  return (
    <motion.article
      className="cursor-pointer border border-slate-200 bg-white p-6 shadow-sm hover:border-primary-300 hover:shadow-soft"
      whileHover={{ y: -3 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      {/* Meta */}
      <div className="mb-3 text-sm font-medium text-slate-500">
        {post.date} · {post.readingMinutes || 3} 分钟阅读
      </div>

      {/* Title */}
      <h3 className="mb-3 line-clamp-2 text-2xl font-black text-slate-950">
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
