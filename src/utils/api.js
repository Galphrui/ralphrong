import { sortPosts } from './postSort'

const DATA_PATH = 'data/posts.json'
const DATA_URL = `${import.meta.env.BASE_URL}${DATA_PATH}`

const dataUrl = () => `${DATA_URL}?t=${Date.now()}`

export const fetchSiteData = async () => {
  const response = await fetch(dataUrl(), {
    cache: 'no-store',
    headers: {
      Accept: 'application/json',
    },
  })

  if (!response.ok) throw new Error('Failed to fetch site data')

  const data = await response.json()
  const posts = sortPosts(data.posts || [])

  return {
    site: data.site || {},
    profile: data.profile || null,
    posts,
    total: posts.length,
  }
}

export const fetchPosts = async (page = 1, limit = 20, filters = {}) => {
  try {
    const data = await fetchSiteData()
    let posts = data.posts

    // Apply filters
    if (filters.tag && filters.tag !== '全部') {
      posts = posts.filter((p) => p.tags?.includes(filters.tag))
    }

    if (filters.search) {
      const query = filters.search.toLowerCase()
      posts = posts.filter(
        (p) =>
          p.title?.toLowerCase().includes(query) ||
          p.summary?.toLowerCase().includes(query) ||
          p.tags?.some((t) => t.toLowerCase().includes(query)),
      )
    }

    posts = sortPosts(posts, filters.sortMode || 'date-desc')

    // Paginate
    const startIdx = (page - 1) * limit
    const paginatedPosts = posts.slice(startIdx, startIdx + limit)

    return {
      posts: paginatedPosts,
      total: posts.length,
      page,
      limit,
    }
  } catch (error) {
    console.error('Error fetching posts:', error)
    return { posts: [], total: 0, page: 1, limit: 20 }
  }
}

export const createPost = async (post) => {
  console.warn('Create not available - read-only mode')
  return { ok: false }
}

export const updatePost = async (id, post) => {
  console.warn('Update not available - read-only mode')
  return { ok: false }
}

export const deletePost = async (id) => {
  console.warn('Delete not available - read-only mode')
  return { ok: false }
}

export const extractPdf = async (file) => {
  console.warn('PDF extraction not available in read-only mode')
  return { ok: false }
}

export const fetchTags = async () => {
  try {
    const response = await fetch(dataUrl(), { cache: 'no-store' })
    const data = await response.json()
    const tags = [...new Set(data.posts?.flatMap((p) => p.tags) || [])].sort()
    return tags
  } catch (error) {
    console.error('Error fetching tags:', error)
    return []
  }
}

export default {
  fetchPosts,
  fetchSiteData,
  createPost,
  updatePost,
  deletePost,
  extractPdf,
  fetchTags,
}
