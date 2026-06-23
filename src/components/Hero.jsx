import { motion } from 'framer-motion'
import { useBlogStore } from '../store/useStore'

export default function Hero() {
  const { posts, totalPosts, allTags } = useBlogStore()

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

  const latestPostDate = posts[0]?.date?.replaceAll('-', '.')

  const stats = [
    { label: '篇文章', value: totalPosts },
    { label: '个标签', value: allTags.length },
    { label: '最近更新', value: latestPostDate || '-' },
  ]

  return (
    <section className="relative overflow-hidden border border-slate-200 bg-hero-panel px-6 py-14 shadow-soft sm:px-10 lg:px-12">
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-brand" />
      <div className="absolute inset-0 bg-grid-pattern opacity-45" />
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="relative z-10"
      >
        {/* Main heading */}
        <motion.div variants={itemVariants} className="mb-8">
          <p className="mb-3 text-sm font-bold uppercase text-primary-600">
            Android Engineering Notes
          </p>
          <h1 className="mb-5 max-w-4xl text-4xl font-black leading-tight text-slate-950 sm:text-5xl">
            拆解 Android 工程现场，沉淀可复现答案
          </h1>
          <p className="max-w-3xl text-lg leading-8 text-slate-600">
            记录 Framework、调试、构建发布与系统适配中的真实问题，把零散经验整理成下次能直接拿来用的排查路径。
          </p>
        </motion.div>

        {/* Stats cards */}
        <motion.div variants={itemVariants} className="mt-12 grid gap-4 sm:grid-cols-3">
          {stats.map((stat, idx) => (
            <motion.div
              key={idx}
              className="border border-slate-200 bg-white/85 p-5 shadow-sm"
              whileHover={{ y: -4 }}
            >
              <div className="mb-2 text-3xl font-black text-primary-700 sm:text-4xl">{stat.value}</div>
              <div className="text-sm font-medium text-slate-500">{stat.label}</div>
            </motion.div>
          ))}
        </motion.div>
      </motion.div>
    </section>
  )
}
