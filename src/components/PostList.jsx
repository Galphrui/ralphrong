import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import PostCard from './PostCard'
import TagFilter from './TagFilter'
import { useBlogStore } from '../store/useStore'
import { sortLabel, sortPosts } from '../utils/postSort'

export default function PostList() {
  const {
    posts,
    searchQuery,
    selectedTag,
    sortMode,
    setSearchQuery,
  } = useBlogStore()

  const [filteredPosts, setFilteredPosts] = useState([])

  // Filter posts
  useEffect(() => {
    let result = posts

    if (selectedTag !== '全部') {
      result = result.filter((post) => post.tags?.includes(selectedTag))
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      result = result.filter(
        (post) =>
          post.title.toLowerCase().includes(query) ||
          post.summary.toLowerCase().includes(query) ||
          post.tags?.some((tag) => tag.toLowerCase().includes(query)),
      )
    }

    setFilteredPosts(sortPosts(result, sortMode))
  }, [posts, selectedTag, searchQuery, sortMode])

  return (
    <section id="posts" className="py-8">
      {/* Search and filter */}
      <motion.div
        className="mb-6"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
      >
        <div className="mb-4">
          <input
            type="search"
            placeholder="搜索文章、标签..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-800 shadow-sm outline-none transition-all placeholder:text-slate-400 focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
          />
        </div>

        <TagFilter />
      </motion.div>

      {/* Posts grid */}
      <div>
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <h2 className="text-2xl font-black text-slate-950">文章列表</h2>
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
            {filteredPosts.length} 篇 · {sortLabel(sortMode)}
          </p>
        </div>

        {filteredPosts.length > 0 ? (
          <motion.div
            className="grid gap-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ staggerChildren: 0.1 }}
          >
            {filteredPosts.map((post) => (
              <PostCard
                key={post.slug}
                post={post}
                onClick={() => {
                  window.location.hash = `post/${encodeURIComponent(post.slug)}`
                }}
              />
            ))}
          </motion.div>
        ) : (
          <motion.div
            className="py-12 text-center text-gray-500"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <p>没有匹配的文章</p>
          </motion.div>
        )}
      </div>
    </section>
  )
}
