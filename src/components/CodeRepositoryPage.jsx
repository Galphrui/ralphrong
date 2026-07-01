import { motion } from 'framer-motion'
import { useMemo, useState } from 'react'
import { useBlogStore } from '../store/useStore'

export default function CodeRepositoryPage() {
  const { repositories } = useBlogStore()
  const [query, setQuery] = useState('')
  const [tag, setTag] = useState('全部')

  const tags = useMemo(() => {
    const values = repositories.flatMap((repo) => repo.tags || [])
    return ['全部', ...Array.from(new Set(values)).sort()]
  }, [repositories])

  const filtered = useMemo(() => {
    const keyword = query.trim().toLowerCase()
    return repositories
      .filter((repo) => tag === '全部' || repo.tags?.includes(tag))
      .filter((repo) => {
        if (!keyword) return true
        return [repo.name, repo.description, repo.language, repo.sourcePath, repo.notes, ...(repo.tags || [])]
          .join(' ')
          .toLowerCase()
          .includes(keyword)
      })
      .sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''))
  }, [query, repositories, tag])

  return (
    <section className="mx-auto max-w-6xl py-4">
      <div className="mb-6 border border-slate-200 bg-hero-panel p-5 shadow-soft sm:p-7">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="mb-2 text-xs font-black uppercase text-primary-700">Ra Code Library</p>
            <h1 className="text-3xl font-black leading-tight text-slate-950">代码库</h1>
            <p className="mt-3 max-w-3xl text-sm font-medium leading-6 text-slate-600">
              存放可复用代码片段、排查脚本、工程模板和项目仓库说明，和文章同级展示，后续可以继续扩展成更多模块。
            </p>
          </div>
          <div className="grid gap-2 sm:min-w-[320px]">
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="搜索代码库、语言、标签..."
              className="w-full border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-800 shadow-sm outline-none placeholder:text-slate-400 focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
            />
            <div className="flex flex-wrap gap-2">
              {tags.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setTag(item)}
                  className={`border px-3 py-2 text-xs font-black transition ${
                    tag === item
                      ? 'border-primary-700 bg-primary-700 text-white shadow-brand'
                      : 'border-slate-200 bg-white text-slate-700 hover:border-primary-300 hover:bg-primary-50 hover:text-primary-700'
                  }`}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {filtered.length ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {filtered.map((repo, index) => (
            <motion.article
              key={repo.id}
              className="grid gap-4 border border-slate-200 bg-white p-5 shadow-sm"
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.04 }}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-black uppercase text-primary-700">{repo.language}</p>
                  <h2 className="mt-1 text-xl font-black leading-tight text-slate-950">{repo.name}</h2>
                </div>
                {repo.updatedAt && (
                  <span className="border border-primary-100 bg-primary-50 px-2 py-1 text-[11px] font-black text-primary-700">
                    {repo.updatedAt}
                  </span>
                )}
              </div>
              <p className="text-sm font-medium leading-6 text-slate-600">{repo.description}</p>
              {repo.snippet && (
                <pre className="max-h-64 overflow-auto border border-slate-200 bg-slate-950 p-4 text-xs leading-6 text-slate-100">
                  <code>{repo.snippet}</code>
                </pre>
              )}
              <div className="flex flex-wrap gap-2">
                {(repo.tags || []).map((item) => (
                  <span key={item} className="border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-bold text-slate-600">
                    {item}
                  </span>
                ))}
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs font-bold text-slate-500">
                {repo.sourcePath && <span>{repo.sourcePath}</span>}
                {repo.url && (
                  <a
                    href={repo.url}
                    target="_blank"
                    rel="noreferrer"
                    className="border border-primary-100 bg-primary-50 px-3 py-2 font-black text-primary-700 hover:border-primary-300"
                  >
                    打开仓库
                  </a>
                )}
              </div>
            </motion.article>
          ))}
        </div>
      ) : (
        <div className="border border-slate-200 bg-white p-8 text-center text-sm font-bold text-slate-500 shadow-sm">
          暂无匹配的代码库
        </div>
      )}
    </section>
  )
}
