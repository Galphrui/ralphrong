import { useEffect, useRef, useState, useCallback } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { motion } from 'framer-motion'
import PostCard from './PostCard'
import { useBlogStore } from '../store/useStore'
import { fetchPosts } from '../utils/api'

export default function VirtualPostList() {
  const {
    posts,
    searchQuery,
    selectedTag,
    setPosts,
    setAllTags,
    setIsLoading,
  } = useBlogStore()

  const parentRef = useRef(null)
  const [allPosts, setAllPosts] = useState([])
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)

  // Load initial posts
  useEffect(() => {
    const loadPosts = async () => {
      setIsLoading(true)
      try {
        const data = await fetchPosts(1, 100)
        setAllPosts(data.posts)
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
  const filteredPosts = useCallback(() => {
    let result = allPosts

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

    return result
  }, [allPosts, selectedTag, searchQuery])

  const displayedPosts = filteredPosts()

  // Virtual scrolling
  const virtualizer = useVirtualizer({
    count: displayedPosts.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 180,
    overscan: 10,
  })

  const virtualItems = virtualizer.getVirtualItems()
  const totalSize = virtualizer.getTotalSize()

  // Load more when scrolling near bottom
  const handleScroll = useCallback((e) => {
    const element = e.target
    if (
      element.scrollHeight - element.scrollTop < 800 &&
      !isLoadingMore &&
      displayedPosts.length < 1000
    ) {
      setIsLoadingMore(true)
      // Simulate loading more posts
      setTimeout(() => {
        setCurrentPage((prev) => prev + 1)
        setIsLoadingMore(false)
      }, 500)
    }
  }, [isLoadingMore, displayedPosts.length])

  return (
    <div
      ref={parentRef}
      onScroll={handleScroll}
      className="h-[calc(100vh-400px)] overflow-auto rounded-lg"
    >
      <div style={{ height: `${totalSize}px` }} className="relative">
        {virtualItems.map((virtualItem) => {
          const post = displayedPosts[virtualItem.index]
          return (
            <div
              key={virtualItem.key}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                transform: `translateY(${virtualItem.start}px)`,
              }}
            >
              <div className="px-4 py-2">
                <PostCard post={post} onClick={() => {}} />
              </div>
            </div>
          )
        })}
      </div>

      {/* Loading indicator */}
      {isLoadingMore && (
        <motion.div
          className="py-8 text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <div className="inline-flex items-center gap-2">
            <div className="w-2 h-2 bg-primary-500 rounded-full animate-bounce" />
            <span className="text-gray-600">加载更多...</span>
          </div>
        </motion.div>
      )}
    </div>
  )
}
