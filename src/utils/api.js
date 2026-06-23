// Direct GitHub API access - no backend needed
const GITHUB_OWNER = 'Galphrui'
const GITHUB_REPO = 'ralphrong'
const GITHUB_BRANCH = 'main'
const DATA_PATH = 'data/posts.json'

// GitHub raw content URL
const GITHUB_RAW_URL = `https://raw.githubusercontent.com/${GITHUB_OWNER}/${GITHUB_REPO}/${GITHUB_BRANCH}/${DATA_PATH}`

export const fetchPosts = async (page = 1, limit = 20, filters = {}) => {
  try {
    const response = await fetch(GITHUB_RAW_URL, {
      headers: {
        'Accept': 'application/vnd.github.v3.raw',
      },
    })

    if (!response.ok) throw new Error('Failed to fetch posts')

    const data = await response.json()
    let posts = data.posts || []

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

    // Sort by date
    posts.sort((a, b) => new Date(b.date) - new Date(a.date))

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
    const response = await fetch(GITHUB_RAW_URL)
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
  createPost,
  updatePost,
  deletePost,
  extractPdf,
  fetchTags,
}

