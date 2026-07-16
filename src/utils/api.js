import { sortPosts } from './postSort'
import { validateGuestMessage } from './moderation'
import { visitorId } from './visitor'
import { mergeSiteModuleSettings } from './moduleConfig'

const DATA_PATH = 'data/posts.json'
const DATA_URL = `${import.meta.env.BASE_URL}${DATA_PATH}`
const WORKER_API_BASE = 'https://ralphrong-blog-admin.ralphrong.workers.dev'
const MESSAGE_API_BASE =
  window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? window.location.origin
    : WORKER_API_BASE

const dataUrl = () => `${DATA_URL}?t=${Date.now()}`
let siteDataRequest = null

export const fetchSiteData = async ({ force = false } = {}) => {
  if (!force && siteDataRequest) return siteDataRequest

  siteDataRequest = loadSiteData().catch((error) => {
    siteDataRequest = null
    throw error
  })

  return siteDataRequest
}

const loadSiteData = async () => {
  const response = await fetch(dataUrl(), {
    cache: 'no-store',
    headers: {
      Accept: 'application/json',
    },
  })

  if (!response.ok) throw new Error('Failed to fetch site data')

  const data = await response.json()
  const posts = sortPosts((data.posts || []).map(normalizePostAccess))
  const tools = sortPosts((data.tools || []).map(normalizeCollectionItem))
  const devLogs = sortPosts((data.devLogs || []).map(normalizeCollectionItem))

  return {
    site: data.site || {},
    profile: data.profile || null,
    repositories: Array.isArray(data.repositories) ? data.repositories.map(normalizeRepository) : [],
    tools,
    devLogs,
    moduleSettings: mergeSiteModuleSettings(data.modules),
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

const normalizePostAccess = (post) => ({
  ...post,
  visibility: post.visibility === 'password' || post.visibility === 'private' ? 'password' : 'public',
  accessPassword: post.accessPassword || post.password || '',
  attachments: normalizeAttachments(post.attachments),
})

const normalizeCollectionItem = (item) => ({
  title: item.title || item.name || '未命名条目',
  slug: item.slug || item.id || item.title || item.name || `item-${Math.random().toString(36).slice(2)}`,
  date: item.date || item.createdAt?.slice?.(0, 10) || '',
  createdAt: item.createdAt || item.date || '',
  updatedAt: item.updatedAt || item.modifiedAt || item.lastModified || item.date || '',
  tags: Array.isArray(item.tags) ? item.tags : [],
  visibility: item.visibility === 'password' || item.visibility === 'private' ? 'password' : 'public',
  accessPassword: item.accessPassword || item.password || '',
  summary: item.summary || item.description || '',
  content: item.content || item.notes || '',
  contentFormat: ['plain', 'markdown', 'rich'].includes(item.contentFormat) ? item.contentFormat : 'markdown',
  readingMinutes: item.readingMinutes || 1,
  attachments: normalizeAttachments(item.attachments),
})

const normalizeAttachments = (attachments) =>
  (Array.isArray(attachments) ? attachments : [])
    .map((item) => ({
      id: item.id || item.fileName || item.name || `att-${Math.random().toString(36).slice(2)}`,
      name: item.name || item.fileName || '附件',
      fileName: item.fileName || item.name || 'attachment',
      mimeType: item.mimeType || 'application/octet-stream',
      size: Number(item.size || 0),
      url: item.url || '',
      rawUrl: item.rawUrl || '',
      path: item.path || '',
      dataUrl: item.dataUrl || '',
      chunked: Boolean(item.chunked),
      chunkSize: Number(item.chunkSize || 0),
      chunkCount: Number(item.chunkCount || (Array.isArray(item.chunks) ? item.chunks.length : 0)),
      chunks: Array.isArray(item.chunks)
        ? item.chunks
            .map((chunk, index) => ({
              index: Number(chunk.index ?? index),
              path: chunk.path || '',
              url: chunk.url || '',
              rawUrl: chunk.rawUrl || '',
              size: Number(chunk.size || 0),
            }))
            .filter((chunk) => chunk.url || chunk.rawUrl || chunk.path)
            .sort((a, b) => a.index - b.index)
        : [],
      createdAt: item.createdAt || '',
    }))
    .filter((item) => item.url || item.rawUrl || item.dataUrl || (item.chunked && item.chunks.length))

const normalizeRepository = (repo) => ({
  id: repo.id || repo.slug || repo.name || `repo-${Math.random().toString(36).slice(2)}`,
  name: repo.name || '未命名代码库',
  fileName: repo.fileName || '',
  description: repo.description || '',
  language: repo.language || 'Code',
  tags: Array.isArray(repo.tags) ? repo.tags : [],
  url: repo.url || '',
  sourcePath: repo.sourcePath || '',
  updatedAt: repo.updatedAt || repo.date || '',
  snippet: repo.snippet || '',
  notes: repo.notes || '',
  attachments: normalizeAttachments(repo.attachments),
  visibility: repo.visibility === 'private' ? 'private' : 'public',
})

export const fetchMessages = async (postSlug = '') => {
  const query = postSlug ? `?postSlug=${encodeURIComponent(postSlug)}` : ''
  const response = await fetch(`${MESSAGE_API_BASE}/api/messages${query}`, {
    cache: 'no-store',
    headers: { Accept: 'application/json' },
  })
  const result = await response.json().catch(() => ({}))
  if (!response.ok || result.ok === false) {
    throw new Error(result.error || '留言服务暂时不可用')
  }
  return Array.isArray(result.data) ? result.data : []
}

export const createMessage = async ({ name, message, postSlug = '' }) => {
  const validation = validateGuestMessage({ name, message })
  if (!validation.ok) throw new Error(validation.error)

  const response = await fetch(`${MESSAGE_API_BASE}/api/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...validation, postSlug }),
  })
  const result = await response.json().catch(() => ({}))
  if (!response.ok || result.ok === false) {
    throw new Error(result.error || '留言发布失败')
  }
  return Array.isArray(result.data) ? result.data : []
}

export const fetchPostMetrics = async () => {
  const response = await fetch(`${MESSAGE_API_BASE}/api/post-metrics`, {
    cache: 'no-store',
    headers: { Accept: 'application/json' },
  })
  const result = await response.json().catch(() => ({}))
  if (!response.ok || result.ok === false) {
    throw new Error(result.error || '文章指标服务暂时不可用')
  }
  return result.data || {}
}

export const recordPostView = async (slug) => {
  if (!slug) return {}
  const response = await fetch(`${MESSAGE_API_BASE}/api/post-view`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ slug }),
  })
  const result = await response.json().catch(() => ({}))
  if (!response.ok || result.ok === false) throw new Error(result.error || '点击记录失败')
  return result.data || {}
}

export const likePost = async (slug) => {
  if (!slug) return {}
  const response = await fetch(`${MESSAGE_API_BASE}/api/post-like`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ slug, visitorId: visitorId() }),
  })
  const result = await response.json().catch(() => ({}))
  if (!response.ok || result.ok === false) throw new Error(result.error || '点赞失败')
  return result.data || {}
}

export default {
  fetchPosts,
  fetchSiteData,
  createPost,
  updatePost,
  deletePost,
  extractPdf,
  fetchTags,
  fetchMessages,
  createMessage,
  fetchPostMetrics,
  recordPostView,
  likePost,
}
