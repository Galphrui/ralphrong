import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import PostCard from './PostCard'
import TagFilter from './TagFilter'
import { useBlogStore } from '../store/useStore'
import { fetchPosts } from '../utils/api'

export default function PostList() {
  const {
    posts,
    searchQuery,
    selectedTag,
    setSearchQuery,
    setSelectedTag,
    setPosts,
    setAllTags,
    setIsLoading,
  } = useBlogStore()

  const [filteredPosts, setFilteredPosts] = useState([])

  // Load posts on mount
  useEffect(() => {
    const loadPosts = async () => {
      setIsLoading(true)
      try {
        const data = await fetchPosts()
        setPosts(data.posts)
        const allTags = [...new Set(data.posts.flatMap((p) => p.tags))].sort()
        setAllTags(allTags)
      } catch (error) {
        console.error('Failed to load posts:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadPosts()
  }, [])

  // Filter posts
  useEffect(() => {
    let result = posts

    if (selectedTag !== '全部') {
      result = result.filter((post) => post.tags.includes(selectedTag))
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      result = result.filter(
        (post) =>
          post.title.toLowerCase().includes(query) ||
          post.summary.toLowerCase().includes(query) ||
          post.tags.some((tag) => tag.toLowerCase().includes(query)),
      )
    }

    setFilteredPosts(result)
  }, [posts, selectedTag, searchQuery])

  return (
    <section className="py-12">
      {/* Search and filter */}
      <motion.div
        className="mb-8"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
      >
        <div className="flex gap-4 mb-6">
          <input
            type="search"
            placeholder="搜索文章、标签..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 px-4 py-3 rounded-lg border border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-100 outline-none transition-all"
          />
        </div>

        <TagFilter />
      </motion.div>

      {/* Posts grid */}
      <div>
        <div className="mb-6">
          <h2 className="text-3xl font-bold text-gray-900">最新文章</h2>
        </div>

        {filteredPosts.length > 0 ? (
          <motion.div
            className="grid gap-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ staggerChildren: 0.1 }}
          >
            {filteredPosts.map((post) => (
              <PostCard key={post.slug} post={post} onClick={() => {}} />
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
