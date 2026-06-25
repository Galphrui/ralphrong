import { motion } from 'framer-motion'
import { useEffect, useMemo, useState } from 'react'
import { useBlogStore } from '../store/useStore'

const PROMO_TABS = [
  { key: 'latest', label: '最近发布' },
  { key: 'views', label: '点击最多' },
  { key: 'likes', label: '点赞最多' },
]

function metricFor(metrics, slug) {
  return metrics?.[slug] || { views: 0, likes: 0 }
}

export default function Hero() {
  const { posts, postMetrics } = useBlogStore()
  const [promoMode, setPromoMode] = useState('latest')
  const [promoIndex, setPromoIndex] = useState(0)

  const promotedPosts = useMemo(() => {
    if (!posts.length) return []
    const sorted = [...posts]
    if (promoMode === 'views') {
      sorted.sort((a, b) => metricFor(postMetrics, b.slug).views - metricFor(postMetrics, a.slug).views)
    } else if (promoMode === 'likes') {
      sorted.sort((a, b) => metricFor(postMetrics, b.slug).likes - metricFor(postMetrics, a.slug).likes)
    }
    return sorted.slice(0, 5)
  }, [postMetrics, posts, promoMode])

  useEffect(() => {
    setPromoIndex(0)
  }, [promoMode])

  useEffect(() => {
    if (promotedPosts.length <= 1) return undefined
    const timer = window.setInterval(() => {
      setPromoIndex((current) => (current + 1) % promotedPosts.length)
    }, 4200)
    return () => window.clearInterval(timer)
  }, [promotedPosts.length])

  const promotedPost = promotedPosts[promoIndex] || null

  const metrics = metricFor(postMetrics, promotedPost?.slug)

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2,
        delayChildren: 0.3,
      },
    },
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.8, ease: 'easeOut' },
    },
  }

  return (
    <section className="relative overflow-hidden border border-slate-200 bg-hero-panel px-5 py-8 shadow-soft sm:px-8 lg:px-10">
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-brand" />
      <div className="absolute inset-0 bg-grid-pattern opacity-45" />
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="relative z-10 grid gap-6"
      >
        {/* Main heading */}
        <motion.div variants={itemVariants}>
          <p className="mb-3 text-xs font-black uppercase text-primary-600">
            Android Engineering Notes
          </p>
          <h1 className="mb-4 max-w-4xl text-3xl font-black leading-tight text-slate-950 sm:text-4xl">
            拆解 Android 工程现场，沉淀可复现答案
          </h1>
          <p className="max-w-3xl text-base leading-7 text-slate-600">
            记录 Framework、调试、构建发布与系统适配中的真实问题，把零散经验整理成下次能直接拿来用的排查路径。
          </p>
        </motion.div>
        {promotedPost && (
          <motion.div variants={itemVariants} className="border-t border-primary-100 pt-5">
            <div className="mb-4 flex flex-wrap gap-2">
              {PROMO_TABS.map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setPromoMode(tab.key)}
                  className={`border px-3 py-2 text-xs font-black transition ${
                    promoMode === tab.key
                      ? 'border-primary-700 bg-primary-700 text-white shadow-brand'
                      : 'border-slate-200 bg-white/80 text-slate-700 hover:border-primary-300 hover:text-primary-700'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            <button
              key={`${promoMode}-${promotedPost.slug}`}
              type="button"
              onClick={() => {
                window.location.hash = `post/${encodeURIComponent(promotedPost.slug)}`
              }}
              className="block w-full overflow-hidden border border-primary-100 bg-white/80 p-4 text-left transition hover:border-primary-300 hover:bg-white"
            >
              <motion.div
                initial={{ opacity: 0, x: 28 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.45, ease: 'easeOut' }}
              >
                <div className="mb-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-black uppercase text-primary-700">
                <span>{PROMO_TABS.find((tab) => tab.key === promoMode)?.label}</span>
                <span>{metrics.views || 0} 点击</span>
                <span>{metrics.likes || 0} 赞</span>
                </div>
                <h2 className="line-clamp-2 text-xl font-black leading-tight text-slate-950 sm:text-2xl">
                  {promotedPost.title}
                </h2>
                <p className="mt-2 line-clamp-2 text-sm font-medium leading-6 text-slate-600">
                  {promotedPost.summary}
                </p>
              </motion.div>
            </button>
            {promotedPosts.length > 1 && (
              <div className="mt-3 flex items-center gap-2">
                {promotedPosts.map((post, index) => (
                  <button
                    key={post.slug}
                    type="button"
                    onClick={() => setPromoIndex(index)}
                    className={`h-2 transition-all ${
                      index === promoIndex ? 'w-8 bg-primary-700' : 'w-2 bg-primary-100 hover:bg-primary-300'
                    }`}
                    aria-label={`切换到第 ${index + 1} 篇推广文章`}
                  />
                ))}
              </div>
            )}
          </motion.div>
        )}
      </motion.div>
    </section>
  )
}
