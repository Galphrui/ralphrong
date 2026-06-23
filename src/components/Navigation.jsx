import { motion } from 'framer-motion'

export default function Navigation() {
  return (
    <motion.nav
      className="sticky top-0 z-50 glass-effect border-b border-gray-100/20"
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
    >
      <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
        {/* Brand */}
        <motion.div
          className="flex items-center gap-3"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <div className="w-10 h-10 rounded-lg bg-gradient-brand flex items-center justify-center text-white font-bold text-lg">
            T
          </div>
          <div>
            <h1 className="text-lg font-bold gradient-text">Tech Notes</h1>
            <p className="text-xs text-gray-500">个人技术博客</p>
          </div>
        </motion.div>

        {/* Nav Links */}
        <nav className="flex gap-8">
          {[
            { label: '文章', href: '#posts' },
            { label: '关于', href: '#about' },
            { label: '管理', href: './admin.html' },
          ].map((link) => (
            <motion.a
              key={link.label}
              href={link.href}
              className="text-gray-600 font-semibold hover:text-gray-900 transition-colors"
              whileHover={{ y: -2 }}
            >
              {link.label}
            </motion.a>
          ))}
        </nav>
      </div>
    </motion.nav>
  )
}
