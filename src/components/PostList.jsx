import { useDeferredValue, useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import PostCard from './PostCard'
import TagFilter from './TagFilter'
import { useBlogStore } from '../store/useStore'
import { sortLabel, sortPosts } from '../utils/postSort'
import { displayStyleForModule } from '../utils/moduleConfig'
import { PAGE_SIZE_OPTIONS, getPageRange } from '../utils/listing'

export default function PostList() {
  const {
    posts,
    searchQuery,
    selectedTag,
    sortMode,
    moduleSettings,
    setSearchQuery,
  } = useBlogStore()

  const [filteredPosts, setFilteredPosts] = useState([])
  const [currentPage, setCurrentPage] = useState(1)
  const [postsPerPage, setPostsPerPage] = useState(10)
  const deferredSearchQuery = useDeferredValue(searchQuery)

  // Filter posts
  useEffect(() => {
    let result = posts

    if (selectedTag !== '全部') {
      result = result.filter((post) => post.tags?.includes(selectedTag))
    }

    if (deferredSearchQuery) {
      const query = deferredSearchQuery.toLowerCase()
      result = result.filter(
        (post) =>
          post.title.toLowerCase().includes(query) ||
          post.summary.toLowerCase().includes(query) ||
          post.tags?.some((tag) => tag.toLowerCase().includes(query)),
      )
    }

    setFilteredPosts(sortPosts(result, sortMode))
  }, [posts, selectedTag, deferredSearchQuery, sortMode])

  useEffect(() => {
    setCurrentPage(1)
  }, [selectedTag, searchQuery, sortMode, postsPerPage])

  const totalPages = Math.max(1, Math.ceil(filteredPosts.length / postsPerPage))

  useEffect(() => {
    setCurrentPage((page) => Math.min(page, totalPages))
  }, [totalPages])

  const pageStartIndex = (currentPage - 1) * postsPerPage
  const pageEndIndex = Math.min(pageStartIndex + postsPerPage, filteredPosts.length)
  const currentPosts = filteredPosts.slice(pageStartIndex, pageEndIndex)
  const pageRange = useMemo(() => getPageRange(currentPage, totalPages), [currentPage, totalPages])
  const displayStyle = displayStyleForModule(moduleSettings, 'posts')

  const goToPage = (page) => {
    const nextPage = Math.min(Math.max(page, 1), totalPages)
    setCurrentPage(nextPage)
    window.requestAnimationFrame(() => {
      document.querySelector('#posts')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  }

  const pageSummary =
    filteredPosts.length > 0
      ? `${pageStartIndex + 1}-${pageEndIndex} / ${filteredPosts.length}`
      : `0 / ${filteredPosts.length}`

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
          <div>
            <h2 className="text-2xl font-black text-slate-950">文章列表</h2>
            <p className="mt-1 text-xs font-bold uppercase tracking-wide text-slate-500">
              {filteredPosts.length} 篇 · {sortLabel(sortMode)}
            </p>
          </div>

          <label className="flex items-center gap-2 text-xs font-black uppercase tracking-wide text-slate-500">
            每页
            <select
              value={postsPerPage}
              onChange={(event) => setPostsPerPage(Number(event.target.value))}
              className="h-10 border border-slate-200 bg-white px-3 text-sm font-black text-slate-800 shadow-sm outline-none transition-all hover:border-primary-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
            >
              {PAGE_SIZE_OPTIONS.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </label>
        </div>

        {filteredPosts.length > 0 ? (
          <>
            <AnimatePresence mode="wait">
              <motion.div
                key={`${currentPage}-${postsPerPage}-${selectedTag}-${searchQuery}-${sortMode}`}
                className={postLayoutClass(displayStyle)}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.26, ease: 'easeOut' }}
              >
                {currentPosts.map((post) => (
                  <PostCard
                    key={post.slug}
                    post={post}
                    displayStyle={displayStyle}
                    onClick={() => {
                      window.location.hash = `post/${encodeURIComponent(post.slug)}`
                    }}
                  />
                ))}
              </motion.div>
            </AnimatePresence>

            <motion.nav
              className="mt-6 border border-slate-200 bg-white p-3 shadow-sm"
              aria-label="文章分页"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              layout
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm font-bold text-slate-500">
                  第 {currentPage} / {totalPages} 页 · {pageSummary}
                </p>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => goToPage(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="h-10 border border-slate-200 bg-white px-3 text-sm font-black text-slate-700 shadow-sm transition-all hover:border-primary-300 hover:bg-primary-50 hover:text-primary-700 disabled:cursor-not-allowed disabled:border-slate-100 disabled:bg-slate-50 disabled:text-slate-300"
                  >
                    上一页
                  </button>

                  {pageRange.map((page, index) =>
                    page === 'ellipsis' ? (
                      <span
                        key={`ellipsis-${index}`}
                        className="flex h-10 w-10 items-center justify-center text-sm font-black text-slate-400"
                      >
                        ...
                      </span>
                    ) : (
                      <button
                        key={page}
                        type="button"
                        onClick={() => goToPage(page)}
                        aria-current={currentPage === page ? 'page' : undefined}
                        className={`h-10 min-w-10 border px-3 text-sm font-black shadow-sm transition-all ${
                          currentPage === page
                            ? 'border-primary-700 bg-primary-700 text-white shadow-brand'
                            : 'border-slate-200 bg-white text-slate-700 hover:border-primary-300 hover:bg-primary-50 hover:text-primary-700'
                        }`}
                      >
                        {page}
                      </button>
                    ),
                  )}

                  <button
                    type="button"
                    onClick={() => goToPage(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="h-10 border border-slate-200 bg-white px-3 text-sm font-black text-slate-700 shadow-sm transition-all hover:border-primary-300 hover:bg-primary-50 hover:text-primary-700 disabled:cursor-not-allowed disabled:border-slate-100 disabled:bg-slate-50 disabled:text-slate-300"
                  >
                    下一页
                  </button>
                </div>
              </div>
            </motion.nav>
          </>
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

function postLayoutClass(style) {
  if (style === 'gallery') return 'grid gap-4 sm:grid-cols-2 xl:grid-cols-3'
  if (style === 'compact') return 'grid gap-3'
  if (style === 'timeline') return 'grid gap-4 border-l border-primary-100 pl-4'
  if (style === 'magazine') return 'grid gap-5'
  if (style === 'code-block') return 'grid gap-4 lg:grid-cols-2'
  return 'grid gap-4'
}
