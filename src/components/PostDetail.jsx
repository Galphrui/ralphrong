import { motion } from 'framer-motion'
import { useBlogStore } from '../store/useStore'
import { likePost } from '../utils/api'
import Guestbook from './Guestbook'

function parseInline(text) {
  const parts = String(text).split(/(`[^`]+`)/g)
  return parts.map((part, index) => {
    if (part.startsWith('`') && part.endsWith('`')) {
      return (
        <code key={index} className="bg-primary-50 px-1.5 py-0.5 text-primary-700">
          {part.slice(1, -1)}
        </code>
      )
    }
    return part
  })
}

function MarkdownContent({ content }) {
  const lines = String(content || '').split('\n')
  const blocks = []
  let paragraph = []
  let listItems = []
  let codeLines = []
  let isCode = false

  const flushParagraph = () => {
    if (!paragraph.length) return
    blocks.push({ type: 'p', text: paragraph.join(' ') })
    paragraph = []
  }

  const flushList = () => {
    if (!listItems.length) return
    blocks.push({ type: 'ul', items: listItems })
    listItems = []
  }

  lines.forEach((line) => {
    if (line.startsWith('```')) {
      if (isCode) {
        blocks.push({ type: 'code', text: codeLines.join('\n') })
        codeLines = []
        isCode = false
      } else {
        flushParagraph()
        flushList()
        isCode = true
      }
      return
    }

    if (isCode) {
      codeLines.push(line)
      return
    }

    if (!line.trim()) {
      flushParagraph()
      flushList()
      return
    }

    if (line.startsWith('## ')) {
      flushParagraph()
      flushList()
      blocks.push({ type: 'h2', text: line.slice(3).trim() })
      return
    }

    if (line.startsWith('- ')) {
      flushParagraph()
      listItems.push(line.slice(2).trim())
      return
    }

    paragraph.push(line.trim())
  })

  flushParagraph()
  flushList()
  if (codeLines.length) blocks.push({ type: 'code', text: codeLines.join('\n') })

  return (
    <div className="space-y-6">
      {blocks.map((block, index) => {
        if (block.type === 'h2') {
          return (
            <h2 key={index} className="pt-4 text-2xl font-black text-slate-950">
              {block.text}
            </h2>
          )
        }

        if (block.type === 'ul') {
          return (
            <ul key={index} className="list-disc space-y-2 pl-6 text-slate-700">
              {block.items.map((item) => (
                <li key={item} className="leading-8">
                  {parseInline(item)}
                </li>
              ))}
            </ul>
          )
        }

        if (block.type === 'code') {
          return (
            <pre
              key={index}
              className="overflow-x-auto border border-slate-800 bg-slate-950 p-5 text-sm leading-7 text-slate-100"
            >
              <code>{block.text}</code>
            </pre>
          )
        }

        return (
          <p key={index} className="text-base leading-8 text-slate-700">
            {parseInline(block.text)}
          </p>
        )
      })}
    </div>
  )
}

export default function PostDetail({ post }) {
  const { isLoading, postMetrics, setPostMetrics } = useBlogStore()

  if (isLoading) {
    return (
      <div className="border border-slate-200 bg-white p-8 text-slate-600 shadow-soft">
        正在加载 Ra 文章...
      </div>
    )
  }

  if (!post) {
    return (
      <section className="border border-slate-200 bg-white p-8 shadow-soft">
        <a href="#" className="text-sm font-bold text-primary-700">
          返回 Ra 文章列表
        </a>
        <h1 className="mt-6 text-3xl font-black text-slate-950">没有找到这篇文章</h1>
        <p className="mt-3 text-slate-600">这篇 Ra 笔记可能已被移动或删除。</p>
      </section>
    )
  }

  const metrics = postMetrics?.[post.slug] || { views: 0, likes: 0 }
  const onLike = async () => {
    try {
      const next = await likePost(post.slug)
      setPostMetrics(next)
    } catch (error) {
      console.warn(error)
    }
  }

  return (
    <motion.article
      className="border border-slate-200 bg-white px-6 py-8 shadow-soft sm:px-10 lg:px-12"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
    >
      <a href="#" className="text-sm font-bold text-primary-700 hover:text-primary-500">
        返回 Ra 文章列表
      </a>

      <header className="mt-8 border-b border-slate-200 pb-8">
        <div className="mb-4 flex flex-wrap gap-2">
          {post.tags?.map((tag) => (
            <span key={tag} className="bg-primary-50 px-3 py-1 text-xs font-bold text-primary-700">
              {tag}
            </span>
          ))}
        </div>
        <h1 className="max-w-4xl text-4xl font-black leading-tight text-slate-950">
          {post.title}
        </h1>
        <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm font-medium text-slate-500">
          <span>作者：Ralph Rong / Ra</span>
          <span>{post.date}</span>
          <span>{post.readingMinutes || 3} 分钟阅读</span>
          <span>{metrics.views || 0} 点击</span>
          <span>{metrics.likes || 0} 赞</span>
          <button
            type="button"
            onClick={onLike}
            className="border border-primary-100 bg-primary-50 px-3 py-1.5 text-xs font-black text-primary-700 hover:border-primary-300"
          >
            点赞 {metrics.likes || 0}
          </button>
        </div>
        {post.summary && <p className="mt-5 max-w-3xl text-lg leading-8 text-slate-600">{post.summary}</p>}
      </header>

      <div className="mt-8">
        <MarkdownContent content={post.content} />
      </div>

      <div className="mt-10">
        <Guestbook postSlug={post.slug} title="文章留言" />
      </div>
    </motion.article>
  )
}
