import { motion } from 'framer-motion'

export default function PostCard({ post, onClick }) {
  return (
    <motion.article
      className="glass-effect p-6 rounded-lg cursor-pointer border border-gray-100 hover:border-primary-300"
      whileHover={{ y: -4, boxShadow: '0 20px 40px rgba(99, 102, 241, 0.2)' }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      {/* Meta */}
      <div className="text-sm text-gray-500 mb-3">
        {post.date} · {post.readingMinutes || 3} 分钟阅读
      </div>

      {/* Title */}
      <h3 className="text-2xl font-bold text-gray-900 mb-3 line-clamp-2">
        {post.title}
      </h3>

      {/* Summary */}
      <p className="text-gray-600 text-sm mb-4 line-clamp-3">{post.summary}</p>

      {/* Tags */}
      <div className="flex flex-wrap gap-2">
        {post.tags?.slice(0, 3).map((tag) => (
          <span
            key={tag}
            className="inline-block px-3 py-1 bg-primary-100 text-primary-700 rounded-full text-xs font-semibold"
          >
            {tag}
          </span>
        ))}
        {post.tags?.length > 3 && (
          <span className="text-xs text-gray-500 py-1">+{post.tags.length - 3}</span>
        )}
      </div>
    </motion.article>
  )
}
