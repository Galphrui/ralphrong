import axios from 'axios'

const API_BASE = process.env.VITE_API_BASE || 'http://localhost:3001'

const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Posts
export const fetchPosts = async (page = 1, limit = 20, filters = {}) => {
  try {
    const response = await api.get('/api/posts', {
      params: { page, limit, ...filters },
    })
    return response.data
  } catch (error) {
    console.error('Error fetching posts:', error)
    // Fallback to local data
    const response = await fetch('./data/posts.json')
    const data = await response.json()
    return { posts: data.posts, total: data.posts.length }
  }
}

export const createPost = async (post) => {
  const response = await api.post('/api/posts', post)
  return response.data
}

export const updatePost = async (id, post) => {
  const response = await api.put(`/api/posts/${id}`, post)
  return response.data
}

export const deletePost = async (id) => {
  const response = await api.delete(`/api/posts/${id}`)
  return response.data
}

// PDF
export const extractPdf = async (file) => {
  const formData = new FormData()
  formData.append('file', file)

  try {
    const response = await api.post('/api/extract-pdf', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return response.data
  } catch (error) {
    console.error('Error extracting PDF:', error)
    throw error
  }
}

// Tags
export const fetchTags = async () => {
  try {
    const response = await api.get('/api/tags')
    return response.data
  } catch (error) {
    console.error('Error fetching tags:', error)
    return []
  }
}

export default api
