import { motion, AnimatePresence } from 'framer-motion'
import { useState } from 'react'
import { useBlogStore } from '../store/useStore'

export default function TagFilter() {
  const { allTags, selectedTag, setSelectedTag } = useBlogStore()
  const [showAll, setShowAll] = useState(false)

  const displayedTags = showAll ? allTags : allTags.slice(0, 5)
  const hasMore = allTags.length > 5

  return (
    <div>
      <motion.div
        className="flex flex-wrap gap-2 mb-4"
        layout
      >
        {/* All tag */}
        <motion.button
          onClick={() => setSelectedTag('全部')}
          className={`px-4 py-2 rounded-full font-semibold transition-all ${
            selectedTag === '全部'
              ? 'bg-gradient-brand text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          全部
        </motion.button>

        {/* Tag chips */}
        <AnimatePresence>
          {displayedTags.map((tag) => (
            <motion.button
              key={tag}
              onClick={() => setSelectedTag(tag)}
              className={`px-4 py-2 rounded-full font-semibold transition-all ${
                selectedTag === tag
                  ? 'bg-primary-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              {tag}
            </motion.button>
          ))}
        </AnimatePresence>

        {/* View all button */}
        {hasMore && (
          <motion.button
            onClick={() => setShowAll(!showAll)}
            className="px-4 py-2 rounded-full font-semibold bg-gray-100 text-gray-700 hover:bg-gray-200 transition-all"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            {showAll ? '收起' : `查看全部 (${allTags.length})`}
          </motion.button>
        )}
      </motion.div>
    </div>
  )
}
