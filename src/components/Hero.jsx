import { motion } from 'framer-motion'
import { useBlogStore } from '../store/useStore'

export default function Hero() {
  const { totalPosts, allTags } = useBlogStore()

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

  const stats = [
    { label: '篇文章', value: totalPosts },
    { label: '个标签', value: allTags.length },
    { label: '最近更新', value: '-' },
  ]

  return (
    <section className="py-16 relative overflow-hidden">
      {/* Decorative elements */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute w-96 h-96 bg-primary-500 rounded-full blur-3xl top-10 -left-48" />
        <div className="absolute w-96 h-96 bg-accent-400 rounded-full blur-3xl bottom-0 right-0" />
      </div>

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="relative z-10"
      >
        {/* Main heading */}
        <motion.div variants={itemVariants} className="mb-8">
          <p className="text-primary-600 font-bold text-sm uppercase tracking-wider mb-2">
            Engineering Journal
          </p>
          <h1 className="text-5xl font-bold text-gray-900 mb-4">
            把技术思考沉淀成可复用的知识资产
          </h1>
          <p className="text-xl text-gray-600">RA 个人技术总结与分享</p>
        </motion.div>

        {/* Stats cards */}
        <motion.div variants={itemVariants} className="grid grid-cols-3 gap-4 mt-12">
          {stats.map((stat, idx) => (
            <motion.div
              key={idx}
              className="glass-effect p-6 rounded-xl"
              whileHover={{ y: -4 }}
            >
              <div className="text-4xl font-bold gradient-text mb-2">{stat.value}</div>
              <div className="text-gray-600 text-sm">{stat.label}</div>
            </motion.div>
          ))}
        </motion.div>
      </motion.div>
    </section>
  )
}
