import express from 'express'
import cors from 'cors'
import { fileURLToPath } from 'url'
import { dirname } from 'path'
import fs from 'fs'
import path from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const app = express()
const PORT = process.env.PORT || 3001

// Middleware
app.use(cors())
app.use(express.json())

// Data file path
const DATA_FILE = path.join(__dirname, '../data/posts.json')

// Helper functions
function loadData() {
  try {
    const data = fs.readFileSync(DATA_FILE, 'utf-8')
    return JSON.parse(data)
  } catch (error) {
    console.error('Error reading posts.json:', error)
    return { site: {}, posts: [] }
  }
}

function saveData(data) {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2))
  } catch (error) {
    console.error('Error saving posts.json:', error)
  }
}

// API Routes

// Get all posts with pagination
app.get('/api/posts', (req, res) => {
  const { page = 1, limit = 20, search = '', tag = '' } = req.query
  const data = loadData()
  let posts = data.posts || []

  // Filter by tag
  if (tag && tag !== '全部') {
    posts = posts.filter((post) => post.tags?.includes(tag))
  }

  // Filter by search
  if (search) {
    const query = search.toLowerCase()
    posts = posts.filter(
      (post) =>
        post.title?.toLowerCase().includes(query) ||
        post.summary?.toLowerCase().includes(query) ||
        post.tags?.some((t) => t.toLowerCase().includes(query)),
    )
  }

  // Sort by date
  posts.sort((a, b) => new Date(b.date) - new Date(a.date))

  // Paginate
  const pageNum = parseInt(page)
  const limitNum = parseInt(limit)
  const startIdx = (pageNum - 1) * limitNum
  const paginatedPosts = posts.slice(startIdx, startIdx + limitNum)

  res.json({
    total: posts.length,
    page: pageNum,
    limit: limitNum,
    posts: paginatedPosts,
  })
})

// Get all tags
app.get('/api/tags', (req, res) => {
  const data = loadData()
  const tags = [...new Set(data.posts?.flatMap((p) => p.tags) || [])].sort()
  res.json({ tags })
})

// Create a new post
app.post('/api/posts', (req, res) => {
  const data = loadData()
  const newPost = {
    slug: req.body.slug || Date.now().toString(),
    title: req.body.title || 'Untitled',
    date: req.body.date || new Date().toISOString().slice(0, 10),
    tags: req.body.tags || [],
    summary: req.body.summary || '',
    content: req.body.content || '',
    readingMinutes: req.body.readingMinutes || 1,
  }

  if (!data.posts) data.posts = []
  data.posts.push(newPost)
  saveData(data)

  res.status(201).json({ ok: true, post: newPost })
})

// Update a post
app.put('/api/posts/:slug', (req, res) => {
  const data = loadData()
  const index = data.posts?.findIndex((p) => p.slug === req.params.slug)

  if (index === -1) {
    return res.status(404).json({ ok: false, error: 'Post not found' })
  }

  data.posts[index] = { ...data.posts[index], ...req.body }
  saveData(data)

  res.json({ ok: true, post: data.posts[index] })
})

// Delete a post
app.delete('/api/posts/:slug', (req, res) => {
  const data = loadData()
  data.posts = data.posts?.filter((p) => p.slug !== req.params.slug) || []
  saveData(data)

  res.json({ ok: true })
})

// Extract PDF text
app.post('/api/extract-pdf', (req, res) => {
  // This would require a PDF parsing library
  // For now, return a placeholder response
  res.json({
    ok: true,
    text: 'PDF text extraction not yet implemented',
  })
})

// Health check
app.get('/api/health', (req, res) => {
  res.json({ ok: true })
})

// Start server
app.listen(PORT, () => {
  console.log(`Blog API server running on http://localhost:${PORT}`)
})
