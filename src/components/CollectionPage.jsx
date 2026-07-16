import { useDeferredValue, useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import MarkdownContent from './MarkdownContent'
import { FeatureHero, LoadingPanel, PageScaffold } from './PageChrome'
import ScrollPositionControls from './ScrollPositionControls'
import { useBlogStore } from '../store/useStore'
import { attachmentDirectUrl, attachmentName, downloadAttachment, formatAttachmentBytes, isChunkedAttachment } from '../utils/attachments'
import { PAGE_SIZE_OPTIONS, formatDateDot, getPageRange, itemDate, itemUpdatedAt, plainTextFromMarkdown, sortContentItems, uniqueTags } from '../utils/listing'
import { sortLabel } from '../utils/postSort'

function AttachmentList({ attachments = [], title = '附件' }) {
  if (!attachments.length) return null
  return (
    <section className="mt-8 border border-slate-200 bg-slate-50 p-5">
      <p className="text-xs font-black uppercase text-primary-700">Ra Attachments</p>
      <h2 className="mt-1 text-xl font-black text-slate-950">{title}</h2>
      <div className="mt-4 grid gap-3">
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

export default function CollectionPage({ items = [], selectedSlug = '', baseHash, title, eyebrow, description, emptyText, detailBackLabel, attachmentTitle }) {
  const { isLoading } = useBlogStore()
  const [sortMode, setSortMode] = useState('date-desc')
  const selected = useMemo(() => items.find((item) => item.slug === selectedSlug), [items, selectedSlug])
  const tags = useMemo(() => uniqueTags(items), [items])
  const latestItem = useMemo(() => sortContentItems(items, 'updated-desc')[0] || sortContentItems(items, 'date-desc')[0], [items])
  const stats = [
    { label: `${title}总数`, value: items.length },
    { label: '标签数量', value: tags.length },
    { label: '最近更新', value: formatDateDot(itemUpdatedAt(latestItem) || itemDate(latestItem)) },
  ]

  if (selectedSlug) {
    if (isLoading && !selected) return <LoadingPanel>正在加载 {title}...</LoadingPanel>
    if (!selected) {
      return (
        <section className="border border-slate-200 bg-white p-8 shadow-soft">
          <a href={`#${baseHash}`} className="text-sm font-bold text-primary-700">{detailBackLabel}</a>
          <h1 className="mt-6 text-3xl font-black text-slate-950">没有找到这个条目</h1>
          <p className="mt-3 text-slate-600">它可能已被移动或删除。</p>
        </section>
      )
    }
    return <CollectionDetail item={selected} baseHash={baseHash} backLabel={detailBackLabel} attachmentTitle={attachmentTitle} />
  }

  return (
    <PageScaffold
      stats={stats}
      focusText={baseHash === 'tools' ? '脚本包、安装包、说明文档、附件下载和常用工具沉淀。' : '开发记录、部署过程、问题复盘和版本演进。'}
      sortMode={sortMode}
      onSortModeChange={setSortMode}
    >
      <CollectionList
        items={items}
        baseHash={baseHash}
        title={title}
        eyebrow={eyebrow}
        description={description}
        emptyText={emptyText}
        sortMode={sortMode}
      />
    </PageScaffold>
  )
}

function CollectionList({ items, baseHash, title, eyebrow, description, emptyText, sortMode }) {
  const [query, setQuery] = useState('')
  const [tag, setTag] = useState('全部')
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)
  const deferredQuery = useDeferredValue(query)
  const tags = useMemo(() => ['全部', ...uniqueTags(items)], [items])

  const filtered = useMemo(() => {
    const keyword = deferredQuery.trim().toLowerCase()
    return sortContentItems(items, sortMode)
      .filter((item) => tag === '全部' || item.tags?.includes(tag))
      .filter((item) => {
        if (!keyword) return true
        const metadata = [
          item.title,
          item.summary,
          item.date,
          item.updatedAt,
          ...(item.tags || []),
          ...(item.attachments || []).map((attachment) => attachment.name || attachment.fileName),
        ]
          .join(' ')
          .toLowerCase()
        return metadata.includes(keyword) || (keyword.length >= 3 && String(item.content || '').toLowerCase().includes(keyword))
      })
  }, [deferredQuery, items, sortMode, tag])

  useEffect(() => {
    setCurrentPage(1)
  }, [tag, deferredQuery, sortMode, itemsPerPage])

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
      document.querySelector(`#${baseHash}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  }

  return (
    <section id={baseHash} data-animate-section className="py-4">
      <FeatureHero
        eyebrow={eyebrow}
        title={title}
        description={description}
        items={items}
        baseHash={baseHash}
        getMeta={(item) => [
          itemDate(item) ? formatDateDot(itemDate(item)) : '',
          item.attachments?.length ? `${item.attachments.length} 个附件` : '',
        ].filter(Boolean)}
        getSummary={(item) => plainTextFromMarkdown(item.summary || item.content)}
        tabs={[
          { key: 'latest', label: '最近发布', sortMode: 'date-desc' },
          { key: 'attachments', label: '附件最多', sort: (value) => [...value].sort((a, b) => (b.attachments?.length || 0) - (a.attachments?.length || 0)) },
          { key: 'tags', label: '标签最多', sort: (value) => [...value].sort((a, b) => (b.tags?.length || 0) - (a.tags?.length || 0)) },
        ]}
      />

      <div className="mt-6 mb-6">
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={`搜索${title}、标签、内容...`}
          className="w-full border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-800 shadow-sm outline-none placeholder:text-slate-400 focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
        />
        <div className="mt-4 flex flex-wrap gap-2">
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
          <h2 className="text-2xl font-black text-slate-950">{title}列表</h2>
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
          <div className="grid gap-4 lg:grid-cols-2">
            {currentItems.map((item, index) => (
            <motion.a
              data-animate-card
              key={item.slug}
              href={`#${baseHash}/${encodeURIComponent(item.slug)}`}
              className="block border border-slate-200 bg-white p-5 shadow-sm transition hover:border-primary-300 hover:shadow-soft"
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.035 }}
            >
              <div className="flex flex-wrap gap-x-3 gap-y-1 text-sm font-bold text-slate-500">
                <span>{item.date || item.createdAt?.slice?.(0, 10) || '-'}</span>
                {item.attachments?.length > 0 && <span>{item.attachments.length} 个附件</span>}
              </div>
              <h2 className="mt-2 text-xl font-black leading-tight text-slate-950">{item.title}</h2>
              {item.summary && <p className="mt-3 line-clamp-3 text-sm leading-6 text-slate-600">{plainTextFromMarkdown(item.summary)}</p>}
              <div className="mt-4 flex flex-wrap gap-2">
                {(item.tags || []).slice(0, 4).map((tagItem) => (
                  <span key={tagItem} className="bg-primary-50 px-3 py-1 text-xs font-bold text-primary-700">{tagItem}</span>
                ))}
              </div>
            </motion.a>
            ))}
          </div>
          <PaginationBar
            currentPage={currentPage}
            totalPages={totalPages}
            pageRange={pageRange}
            pageSummary={pageSummary}
            onPageChange={goToPage}
            label={title}
          />
        </>
      ) : (
        <div className="border border-slate-200 bg-white p-8 text-center text-sm font-bold text-slate-500 shadow-sm">
          {emptyText}
        </div>
      )}
    </section>
  )
}

function PaginationBar({ currentPage, totalPages, pageRange, pageSummary, onPageChange, label }) {
  return (
    <nav className="mt-6 border border-slate-200 bg-white p-3 shadow-sm" aria-label={`${label}分页`}>
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

function CollectionDetail({ item, baseHash, backLabel, attachmentTitle }) {
  return (
    <>
      <ScrollPositionControls ariaLabelPrefix={backLabel} />
      <article data-animate-section className="mx-auto max-w-5xl border border-slate-200 bg-white p-5 shadow-soft sm:p-8">
        <a href={`#${baseHash}`} className="text-sm font-bold text-primary-700">{backLabel}</a>
        <header className="mt-6 border-b border-slate-200 pb-6">
          <div className="flex flex-wrap gap-2">
            {(item.tags || []).map((tag) => <span key={tag} className="bg-primary-50 px-3 py-1 text-xs font-bold text-primary-700">{tag}</span>)}
          </div>
          <h1 className="mt-4 text-3xl font-black leading-tight text-slate-950 sm:text-4xl">{item.title}</h1>
          <div className="mt-4 flex flex-wrap gap-3 text-sm font-bold text-slate-500">
            <span>{item.date || item.createdAt?.slice?.(0, 10) || '-'}</span>
            {item.updatedAt && <span>更新 {item.updatedAt.slice(0, 10)}</span>}
            {item.attachments?.length > 0 && <span>{item.attachments.length} 个附件</span>}
          </div>
          {item.summary && (
            <div className="mt-5">
              <MarkdownContent content={item.summary} mode="markdown" />
            </div>
          )}
        </header>
        {item.content && (
          <div className="mt-8">
            <MarkdownContent content={item.content} attachments={item.attachments || []} mode={item.contentFormat || 'markdown'} />
          </div>
        )}
        <AttachmentList attachments={item.attachments || []} title={attachmentTitle} />
      </article>
    </>
  )
}
