import express from 'express'
import cors from 'cors'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()

// Middleware
app.use(cors({
  origin: ['https://galphrui.github.io', 'http://localhost:5173', 'http://localhost:3000'],
  credentials: true,
}))
app.use(express.json())

// Data file path - 在 Vercel 上使用临时目录
const DATA_FILE = process.env.DATA_PATH || path.join(__dirname, '../data/posts.json')

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

// Health check
app.get('/api/health', (req, res) => {
  res.json({ ok: true, timestamp: new Date().toISOString() })
})

// Export for Vercel
export default app
