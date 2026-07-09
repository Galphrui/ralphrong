import { motion } from 'framer-motion'
import { useMemo, useState } from 'react'
import { useBlogStore } from '../store/useStore'
import {
  CODE_DISPLAY_STYLES,
  CODE_LANGUAGE_PRESETS,
  codeDownloadHref,
  codeFileName,
  formatCodeByLanguage,
} from '../utils/codeLibrary'
import { displayStyleForModule, normalizeDisplayStyle } from '../utils/moduleConfig'
import ScrollPositionControls from './ScrollPositionControls'

export default function CodeRepositoryPage({ selectedId = '' }) {
  const { repositories, moduleSettings } = useBlogStore()
  const selectedRepo = useMemo(
    () => repositories.find((repo) => repo.id === selectedId),
    [repositories, selectedId],
  )

  if (selectedId) return <CodeRepositoryDetail repo={selectedRepo} />
  return <CodeRepositoryList repositories={repositories} moduleSettings={moduleSettings} />
}

function CodeRepositoryList({ repositories, moduleSettings }) {
  const [query, setQuery] = useState('')
  const [tag, setTag] = useState('全部')
  const [language, setLanguage] = useState('全部')
  const [styleOverride, setStyleOverride] = useState('')
  const configuredStyle = displayStyleForModule(moduleSettings, 'code')
  const displayStyle = normalizeDisplayStyle(styleOverride || configuredStyle)

  const tags = useMemo(() => {
    const values = repositories.flatMap((repo) => repo.tags || [])
    return ['全部', ...Array.from(new Set(values)).sort()]
  }, [repositories])

  const languages = useMemo(() => {
    const values = repositories.map((repo) => repo.language).filter(Boolean)
    const presetValues = CODE_LANGUAGE_PRESETS.map((item) => item.value)
    return ['全部', ...Array.from(new Set([...presetValues, ...values])).sort()]
  }, [repositories])

  const filtered = useMemo(() => {
    const keyword = query.trim().toLowerCase()
    return repositories
      .filter((repo) => tag === '全部' || repo.tags?.includes(tag))
      .filter((repo) => language === '全部' || repo.language === language)
      .filter((repo) => {
        if (!keyword) return true
        return [repo.name, repo.description, repo.language, repo.sourcePath, repo.notes, ...(repo.tags || [])]
          .join(' ')
          .toLowerCase()
          .includes(keyword)
      })
      .sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''))
  }, [language, query, repositories, tag])

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
          <div className="grid gap-2 lg:min-w-[520px]">
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="搜索代码库、语言、标签..."
              className="w-full border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-800 shadow-sm outline-none placeholder:text-slate-400 focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
            />
            <div className="grid gap-2 sm:grid-cols-2">
              <select
                value={language}
                onChange={(event) => setLanguage(event.target.value)}
                className="h-10 border border-slate-200 bg-white px-3 text-xs font-black text-slate-700 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
              >
                {languages.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
              <select
                value={styleOverride || configuredStyle}
                onChange={(event) => setStyleOverride(event.target.value)}
                className="h-10 border border-slate-200 bg-white px-3 text-xs font-black text-slate-700 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
              >
                {CODE_DISPLAY_STYLES.map((style) => (
                  <option key={style.id} value={style.id}>
                    {style.label}
                  </option>
                ))}
              </select>
            </div>
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
        <div className={layoutClass(displayStyle)}>
          {filtered.map((repo, index) => (
            <CodeRepositoryCard key={repo.id} repo={repo} index={index} displayStyle={displayStyle} />
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

function CodeRepositoryCard({ repo, index, displayStyle }) {
  const formatted = formatCodeByLanguage(repo.snippet, repo.language)
  const isCompact = displayStyle === 'compact'
  const isTimeline = displayStyle === 'timeline'
  const isMagazine = displayStyle === 'magazine'
  const showSnippet = ['code-block', 'gallery', 'magazine'].includes(displayStyle)

  return (
    <motion.article
      className={`border border-slate-200 bg-white shadow-sm transition hover:border-primary-300 hover:shadow-soft ${
        isTimeline ? 'relative border-l-4 border-l-primary-600' : ''
      } ${isMagazine ? 'lg:grid lg:grid-cols-[0.9fr_1.1fr]' : ''}`}
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.035 }}
    >
      <a href={`#code/${encodeURIComponent(repo.id)}`} className={`block p-5 ${isCompact ? 'py-4' : ''}`}>
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
        {!isCompact && <p className="mt-4 text-sm font-medium leading-6 text-slate-600">{repo.description}</p>}
        <div className="mt-4 flex flex-wrap gap-2">
          {(repo.tags || []).map((item) => (
            <span key={item} className="border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-bold text-slate-600">
              {item}
            </span>
          ))}
        </div>
      </a>
      {showSnippet && formatted && (
        <div className="px-5 pb-5">
          <pre className="max-h-72 overflow-auto border border-slate-200 bg-slate-950 p-4 text-xs leading-6 text-slate-100">
            <code>{formatted}</code>
          </pre>
        </div>
      )}
      <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 px-5 py-4 text-xs font-bold text-slate-500">
        {repo.sourcePath && <span className="min-w-0 flex-1 truncate">{repo.sourcePath}</span>}
        <a className="border border-slate-200 bg-white px-3 py-2 font-black text-slate-700 hover:border-primary-300" href={`#code/${encodeURIComponent(repo.id)}`}>
          查看详情
        </a>
        <a
          href={codeDownloadHref(repo)}
          download={codeFileName(repo)}
          className="border border-primary-100 bg-primary-50 px-3 py-2 font-black text-primary-700 hover:border-primary-300"
          onClick={(event) => event.stopPropagation()}
        >
          下载代码
        </a>
      </div>
    </motion.article>
  )
}

function CodeRepositoryDetail({ repo }) {
  if (!repo) {
    return (
      <section className="border border-slate-200 bg-white p-8 shadow-soft">
        <a href="#code" className="text-sm font-bold text-primary-700">
          返回代码库
        </a>
        <h1 className="mt-6 text-3xl font-black text-slate-950">没有找到这个代码条目</h1>
        <p className="mt-3 text-slate-600">这段代码可能已被移动或删除。</p>
      </section>
    )
  }

  const formatted = formatCodeByLanguage(repo.snippet, repo.language)

  return (
    <>
      <ScrollPositionControls ariaLabelPrefix="代码库详情" />
      <article className="mx-auto max-w-5xl border border-slate-200 bg-white p-5 shadow-soft sm:p-8">
        <a href="#code" className="text-sm font-bold text-primary-700">
          返回代码库
        </a>
        <header className="mt-6 border-b border-slate-200 pb-6">
          <p className="text-xs font-black uppercase text-primary-700">{repo.language}</p>
          <h1 className="mt-2 text-3xl font-black leading-tight text-slate-950 sm:text-4xl">{repo.name}</h1>
          <div className="mt-4 flex flex-wrap gap-3 text-sm font-bold text-slate-500">
            {repo.updatedAt && <span>{repo.updatedAt}</span>}
            {repo.sourcePath && <span>{repo.sourcePath}</span>}
            <span>{codeFileName(repo)}</span>
          </div>
          {repo.description && <p className="mt-5 text-base leading-8 text-slate-700">{repo.description}</p>}
          <div className="mt-5 flex flex-wrap gap-2">
            {(repo.tags || []).map((item) => (
              <span key={item} className="border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-bold text-slate-600">
                {item}
              </span>
            ))}
          </div>
        </header>

        <div className="mt-6 flex flex-wrap gap-2">
          <a
            href={codeDownloadHref(repo)}
            download={codeFileName(repo)}
            className="border border-primary-700 bg-primary-700 px-4 py-2 text-sm font-black text-white hover:bg-primary-800"
          >
            下载为 {codeFileName(repo)}
          </a>
          {repo.url && (
            <a
              href={repo.url}
              target="_blank"
              rel="noreferrer"
              className="border border-primary-100 bg-primary-50 px-4 py-2 text-sm font-black text-primary-700 hover:border-primary-300"
            >
              打开仓库
            </a>
          )}
        </div>

        {formatted && (
          <pre className="mt-6 overflow-auto border border-slate-800 bg-slate-950 p-5 text-sm leading-7 text-slate-100">
            <code>{formatted}</code>
          </pre>
        )}
        {repo.notes && (
          <section className="mt-8 border border-slate-200 bg-slate-50 p-5">
            <p className="text-xs font-black uppercase text-primary-700">Ra Notes</p>
            <p className="mt-3 whitespace-pre-wrap text-sm font-medium leading-7 text-slate-700">{repo.notes}</p>
          </section>
        )}
        <AttachmentList attachments={repo.attachments || []} title="代码附件" />
      </article>
    </>
  )
}

function AttachmentList({ attachments = [], title }) {
  if (!attachments.length) return null
  return (
    <section className="mt-10 border border-slate-200 bg-slate-50 p-5">
      <div className="mb-4">
        <p className="text-xs font-black uppercase text-primary-700">Ra Attachments</p>
        <h2 className="mt-1 text-xl font-black text-slate-950">{title}</h2>
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

function layoutClass(style) {
  if (style === 'list') return 'grid gap-4'
  if (style === 'compact') return 'grid gap-3'
  if (style === 'timeline') return 'grid gap-4 border-l border-primary-100 pl-4'
  if (style === 'gallery') return 'grid gap-4 sm:grid-cols-2 xl:grid-cols-3'
  return 'grid gap-4 lg:grid-cols-2'
}

function formatBytes(size) {
  const value = Number(size || 0)
  if (value < 1024) return `${value} B`
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`
  return `${(value / 1024 / 1024).toFixed(1)} MB`
}
