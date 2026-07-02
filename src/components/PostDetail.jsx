import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { useBlogStore } from '../store/useStore'
import { likePost } from '../utils/api'
import Guestbook from './Guestbook'
import MarkdownContent from './MarkdownContent'

function formatBytes(size) {
  const value = Number(size || 0)
  if (value < 1024) return `${value} B`
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`
  return `${(value / 1024 / 1024).toFixed(1)} MB`
}

function AttachmentList({ attachments = [] }) {
  if (!attachments.length) return null
  return (
    <section className="mt-10 border border-slate-200 bg-slate-50 p-5">
      <div className="mb-4">
        <p className="text-xs font-black uppercase text-primary-700">Ra Attachments</p>
        <h2 className="mt-1 text-xl font-black text-slate-950">文章附件</h2>
      </div>
      <div className="grid gap-3">
        {attachments.map((item) => {
          const href = item.url || item.dataUrl
          return (
            <a
              key={item.id || item.fileName}
              href={href}
              download={item.fileName || item.name}
              target={item.url ? '_blank' : undefined}
              rel={item.url ? 'noreferrer' : undefined}
              className="flex flex-col gap-2 border border-slate-200 bg-white p-4 text-left transition hover:border-primary-300 hover:bg-primary-50 sm:flex-row sm:items-center sm:justify-between"
            >
              <span className="min-w-0">
                <span className="block break-words text-sm font-black text-slate-950">{item.name || item.fileName}</span>
                <span className="mt-1 block text-xs font-bold text-slate-500">
                  {item.fileName || 'attachment'}{item.size ? ` · ${formatBytes(item.size)}` : ''}
                </span>
              </span>
              <span className="shrink-0 text-xs font-black text-primary-700">下载</span>
            </a>
          )
        })}
      </div>
    </section>
  )
}

export default function PostDetail({ post }) {
  const { isLoading, postMetrics, setPostMetrics } = useBlogStore()
  const [password, setPassword] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [unlockedPosts, setUnlockedPosts] = useState(() => {
    try {
      return JSON.parse(sessionStorage.getItem('RaUnlockedPosts') || '{}')
    } catch {
      return {}
    }
  })

  useEffect(() => {
    setPassword('')
    setPasswordError('')
  }, [post?.slug])

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
  const isPasswordProtected = post.visibility === 'password'
  const isUnlocked = !isPasswordProtected || unlockedPosts[post.slug] === true

  const unlockPost = (event) => {
    event.preventDefault()
    if (String(password) !== String(post.accessPassword || '')) {
      setPasswordError('密码不正确，请重新输入。')
      return
    }
    const next = { ...unlockedPosts, [post.slug]: true }
    setUnlockedPosts(next)
    sessionStorage.setItem('RaUnlockedPosts', JSON.stringify(next))
    setPassword('')
    setPasswordError('')
  }

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
          {isPasswordProtected && <span className="font-bold text-amber-700">密码可见</span>}
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

      {isUnlocked ? (
        <>
          <div className="mt-8">
            <MarkdownContent content={post.content} />
          </div>

          <AttachmentList attachments={post.attachments || []} />

          <div className="mt-10">
            <Guestbook postSlug={post.slug} title="文章留言" />
          </div>
        </>
      ) : (
        <form onSubmit={unlockPost} className="mt-8 border border-amber-200 bg-amber-50 p-6">
          <h2 className="text-xl font-black text-slate-950">这篇文章需要密码授权</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">输入发布者设置的访问密码后，可以在当前浏览会话中阅读正文。</p>
          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="min-h-11 flex-1 border border-amber-200 bg-white px-4 text-sm outline-none focus:border-primary-500"
              placeholder="访问密码"
            />
            <button type="submit" className="border border-primary-700 bg-primary-700 px-5 py-2 text-sm font-black text-white">
              授权阅读
            </button>
          </div>
          {passwordError && <p className="mt-3 text-sm font-bold text-red-600">{passwordError}</p>}
        </form>
      )}
    </motion.article>
  )
}
