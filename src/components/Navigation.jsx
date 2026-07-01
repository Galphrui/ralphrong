import { motion } from 'framer-motion'
import { splitTopModules } from '../utils/moduleConfig'
import { useBlogStore } from '../store/useStore'

export default function Navigation() {
  const { moduleSettings } = useBlogStore()
  const { visible, overflow } = splitTopModules(moduleSettings)

  return (
    <motion.nav
      className="print-hide sticky top-0 z-50 border-b border-slate-200 bg-white/90 backdrop-blur-md"
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
    >
      <div className="mx-auto flex max-w-[1600px] items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        {/* Brand */}
        <motion.a
          href="#posts"
          aria-label="返回 Ra 文章首页"
          className="flex items-center gap-3"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <div className="flex h-10 w-10 items-center justify-center bg-gradient-brand text-lg font-black text-white shadow-brand">
            RA
          </div>
          <div>
            <div className="text-lg font-black text-slate-950">Ra Android Notes</div>
            <p className="text-xs font-medium text-slate-500">工程实践与调试笔记</p>
          </div>
        </motion.a>

        {/* Nav Links */}
        <nav className="flex min-w-0 flex-wrap items-center justify-end gap-3 sm:gap-5 lg:gap-8">
          {visible.map((link) => (
            <motion.a
              key={link.id}
              href={link.href}
              className="whitespace-nowrap text-sm font-bold text-slate-600 transition-colors hover:text-primary-700 sm:text-base"
              whileHover={{ y: -2 }}
            >
              {link.label}
            </motion.a>
          ))}
          {overflow.length > 0 && (
            <select
              aria-label="更多模块"
              className="h-9 border border-slate-200 bg-white px-2 text-sm font-bold text-slate-600 outline-none hover:border-primary-300 focus:border-primary-500"
              defaultValue=""
              onChange={(event) => {
                const href = event.target.value
                event.target.value = ''
                if (href) window.location.href = href
              }}
            >
              <option value="">更多</option>
              {overflow.map((link) => (
                <option key={link.id} value={link.href}>
                  {link.label}
                </option>
              ))}
            </select>
          )}
        </nav>
      </div>
    </motion.nav>
  )
}
