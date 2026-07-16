import { motion } from 'framer-motion'
import { useDeferredValue, useEffect, useMemo, useState } from 'react'
import { useBlogStore } from '../store/useStore'
import { FeatureHero, LoadingPanel, PageScaffold } from './PageChrome'
import {
  CODE_DISPLAY_STYLES,
  CODE_LANGUAGE_PRESETS,
  codeDownloadHref,
  codeFileName,
  formatCodeByLanguage,
} from '../utils/codeLibrary'
import { displayStyleForModule, normalizeDisplayStyle } from '../utils/moduleConfig'
import { attachmentDirectUrl, attachmentName, downloadAttachment, formatAttachmentBytes, isChunkedAttachment } from '../utils/attachments'
import { PAGE_SIZE_OPTIONS, formatDateDot, getPageRange, itemUpdatedAt, sortContentItems, uniqueTags } from '../utils/listing'
import { sortLabel } from '../utils/postSort'
import ScrollPositionControls from './ScrollPositionControls'

export default function CodeRepositoryPage({ selectedId = '' }) {
  const { repositories, moduleSettings, isLoading } = useBlogStore()
  const [sortMode, setSortMode] = useState('updated-desc')
  const selectedRepo = useMemo(
    () => repositories.find((repo) => repo.id === selectedId),
    [repositories, selectedId],
  )
  const tags = useMemo(() => uniqueTags(repositories), [repositories])
  const latestRepo = useMemo(() => sortContentItems(repositories, 'updated-desc')[0], [repositories])
  const stats = [
    { label: '代码总数', value: repositories.length },
    { label: '标签数量', value: tags.length },
    { label: '最近更新', value: formatDateDot(itemUpdatedAt(latestRepo)) },
  ]

  if (selectedId) {
    if (isLoading && !selectedRepo) return <LoadingPanel>正在加载代码库...</LoadingPanel>
    return <CodeRepositoryDetail repo={selectedRepo} />
  }

  return (
    <PageScaffold
      stats={stats}
      focusText="可复用脚本、排查命令、工程模板、仓库说明和代码附件。"
      sortMode={sortMode}
      onSortModeChange={setSortMode}
    >
      <CodeRepositoryList repositories={repositories} moduleSettings={moduleSettings} sortMode={sortMode} />
    </PageScaffold>
  )
}

function CodeRepositoryList({ repositories, moduleSettings, sortMode }) {
  const [query, setQuery] = useState('')
  const [tag, setTag] = useState('全部')
  const [language, setLanguage] = useState('全部')
  const [styleOverride, setStyleOverride] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)
  const deferredQuery = useDeferredValue(query)
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
    const keyword = deferredQuery.trim().toLowerCase()
    return sortContentItems(repositories, sortMode)
      .filter((repo) => tag === '全部' || repo.tags?.includes(tag))
      .filter((repo) => language === '全部' || repo.language === language)
      .filter((repo) => {
        if (!keyword) return true
        return [repo.name, repo.fileName, repo.description, repo.language, repo.sourcePath, repo.notes, ...(repo.tags || [])]
          .join(' ')
          .toLowerCase()
          .includes(keyword)
      })
  }, [deferredQuery, language, repositories, sortMode, tag])

  useEffect(() => {
    setCurrentPage(1)
  }, [tag, language, deferredQuery, sortMode, itemsPerPage])

  const totalPages = Math.max(1, Math.ceil(filtered.length / itemsPerPage))

  useEffect(() => {
    setCurrentPage((page) => Math.min(page, totalPages))
  }, [totalPages])

  const pageStartIndex = (currentPage - 1) * itemsPerPage
  const pageEndIndex = Math.min(pageStartIndex + itemsPerPage, filtered.length)
  const currentItems = filtered.slice(pageStartIndex, pageEndIndex)
  const pageRange = useMemo(() => getPageRange(currentPage, totalPages), [currentPage, totalPages])
  const pageSummary = filtered.length > 0 ? `${pageStartIndex + 1}-${pageEndIndex} / ${filtered.length}` : `0 / ${filtered.length}`

  const goToPage = (page) => {
    const nextPage = Math.min(Math.max(page, 1), totalPages)
    setCurrentPage(nextPage)
    window.requestAnimationFrame(() => {
      document.querySelector('#code')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  }

  return (
    <section id="code" className="py-4">
      <FeatureHero
        eyebrow="Ra Code Library"
        title="代码库"
        description="存放可复用代码片段、排查脚本、工程模板和项目仓库说明，和文章同级展示，后续可以继续扩展成更多模块。"
        items={repositories}
        baseHash="code"
        getId={(item) => item.id}
        getTitle={(item) => item.name}
        getSummary={(item) => item.description || item.notes || item.sourcePath}
        getMeta={(item) => [
          item.language,
          item.updatedAt ? formatDateDot(item.updatedAt) : '',
          item.attachments?.length ? `${item.attachments.length} 个附件` : '',
        ].filter(Boolean)}
        tabs={[
          { key: 'updated', label: '最近更新', sortMode: 'updated-desc' },
          { key: 'attachments', label: '附件最多', sort: (value) => [...value].sort((a, b) => (b.attachments?.length || 0) - (a.attachments?.length || 0)) },
          { key: 'tags', label: '标签最多', sort: (value) => [...value].sort((a, b) => (b.tags?.length || 0) - (a.tags?.length || 0)) },
        ]}
      />

      <div className="mt-6 mb-6 grid gap-2">
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

      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl font-black text-slate-950">代码库列表</h2>
          <p className="mt-1 text-xs font-bold uppercase tracking-wide text-slate-500">
            {filtered.length} 条 · {sortLabel(sortMode)}
          </p>
        </div>

        <label className="flex items-center gap-2 text-xs font-black uppercase tracking-wide text-slate-500">
          每页
          <select
            value={itemsPerPage}
            onChange={(event) => setItemsPerPage(Number(event.target.value))}
            className="h-10 border border-slate-200 bg-white px-3 text-sm font-black text-slate-800 shadow-sm outline-none transition-all hover:border-primary-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
          >
            {PAGE_SIZE_OPTIONS.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </label>
      </div>

      {filtered.length ? (
        <>
          <div className={layoutClass(displayStyle)}>
            {currentItems.map((repo, index) => (
            <CodeRepositoryCard key={repo.id} repo={repo} index={index} displayStyle={displayStyle} />
            ))}
          </div>
          <PaginationBar
            currentPage={currentPage}
            totalPages={totalPages}
            pageRange={pageRange}
            pageSummary={pageSummary}
            onPageChange={goToPage}
          />
        </>
      ) : (
        <div className="border border-slate-200 bg-white p-8 text-center text-sm font-bold text-slate-500 shadow-sm">
          暂无匹配的代码库
        </div>
      )}
    </section>
  )
}

function PaginationBar({ currentPage, totalPages, pageRange, pageSummary, onPageChange }) {
  return (
    <nav className="mt-6 border border-slate-200 bg-white p-3 shadow-sm" aria-label="代码库分页">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm font-bold text-slate-500">
          第 {currentPage} / {totalPages} 页 · {pageSummary}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="h-10 border border-slate-200 bg-white px-3 text-sm font-black text-slate-700 shadow-sm transition-all hover:border-primary-300 hover:bg-primary-50 hover:text-primary-700 disabled:cursor-not-allowed disabled:border-slate-100 disabled:bg-slate-50 disabled:text-slate-300"
          >
            上一页
          </button>
          {pageRange.map((page, index) =>
            page === 'ellipsis' ? (
              <span key={`ellipsis-${index}`} className="flex h-10 w-10 items-center justify-center text-sm font-black text-slate-400">
                ...
              </span>
            ) : (
              <button
                key={page}
                type="button"
                onClick={() => onPageChange(page)}
                aria-current={currentPage === page ? 'page' : undefined}
                className={`h-10 min-w-10 border px-3 text-sm font-black shadow-sm transition-all ${
                  currentPage === page
                    ? 'border-primary-700 bg-primary-700 text-white shadow-brand'
                    : 'border-slate-200 bg-white text-slate-700 hover:border-primary-300 hover:bg-primary-50 hover:text-primary-700'
                }`}
              >
                {page}
              </button>
            ),
          )}
          <button
            type="button"
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="h-10 border border-slate-200 bg-white px-3 text-sm font-black text-slate-700 shadow-sm transition-all hover:border-primary-300 hover:bg-primary-50 hover:text-primary-700 disabled:cursor-not-allowed disabled:border-slate-100 disabled:bg-slate-50 disabled:text-slate-300"
          >
            下一页
          </button>
        </div>
      </div>
    </nav>
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
        {attachments.map((item) => <AttachmentDownloadItem key={item.id || item.fileName} item={item} />)}
      </div>
    </section>
  )
}

function AttachmentDownloadItem({ item }) {
  const [downloading, setDownloading] = useState(false)
  const [progress, setProgress] = useState('')
  const chunked = isChunkedAttachment(item)
  const handleDownload = async () => {
    if (!chunked) {
      const href = attachmentDirectUrl(item)
      if (href) window.open(href, '_blank', 'noreferrer')
      return
    }
    try {
      setDownloading(true)
      setProgress('')
      await downloadAttachment(item, ({ index, total }) => setProgress(` ${Math.min(index + 1, total)}/${total}`))
    } catch (error) {
      setProgress(` 失败：${error.message || '请稍后重试'}`)
    } finally {
      setDownloading(false)
    }
  }
  return (
    <button
      type="button"
      onClick={handleDownload}
      className="flex flex-col gap-2 border border-slate-200 bg-white p-4 text-left transition hover:border-primary-300 hover:bg-primary-50 sm:flex-row sm:items-center sm:justify-between"
    >
      <span className="min-w-0">
        <span className="block break-words text-sm font-black text-slate-950">{item.name || item.fileName}</span>
        <span className="mt-1 block text-xs font-bold text-slate-500">
          {attachmentName(item)}{item.size ? ` · ${formatAttachmentBytes(item.size)}` : ''}{chunked ? ` · ${item.chunkCount || item.chunks.length} 个分包` : ''}
        </span>
      </span>
      <span className="shrink-0 text-xs font-black text-primary-700">{downloading ? `合并中${progress}` : `下载${progress}`}</span>
    </button>
  )
}

function layoutClass(style) {
  if (style === 'list') return 'grid gap-4'
  if (style === 'compact') return 'grid gap-3'
  if (style === 'timeline') return 'grid gap-4 border-l border-primary-100 pl-4'
  if (style === 'gallery') return 'grid gap-4 sm:grid-cols-2 xl:grid-cols-3'
  return 'grid gap-4 lg:grid-cols-2'
}
