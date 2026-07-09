import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import MarkdownContent from './MarkdownContent'
import ScrollPositionControls from './ScrollPositionControls'
import { sortPosts } from '../utils/postSort'

function formatBytes(size) {
  const value = Number(size || 0)
  if (value < 1024) return `${value} B`
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`
  return `${(value / 1024 / 1024).toFixed(1)} MB`
}

function AttachmentList({ attachments = [], title = '附件' }) {
  if (!attachments.length) return null
  return (
    <section className="mt-8 border border-slate-200 bg-slate-50 p-5">
      <p className="text-xs font-black uppercase text-primary-700">Ra Attachments</p>
      <h2 className="mt-1 text-xl font-black text-slate-950">{title}</h2>
      <div className="mt-4 grid gap-3">
        {attachments.map((item) => {
          const href = item.url || item.dataUrl
          return (
            <a
              key={item.id || item.fileName}
              href={href}
              download={item.fileName || item.name}
              target={item.url ? '_blank' : undefined}
              rel={item.url ? 'noreferrer' : undefined}
              className="flex flex-col gap-2 border border-slate-200 bg-white p-4 transition hover:border-primary-300 hover:bg-primary-50 sm:flex-row sm:items-center sm:justify-between"
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

export default function CollectionPage({ items = [], selectedSlug = '', baseHash, title, eyebrow, description, emptyText, detailBackLabel, attachmentTitle }) {
  const selected = useMemo(() => items.find((item) => item.slug === selectedSlug), [items, selectedSlug])
  if (selectedSlug) {
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

  return <CollectionList items={items} baseHash={baseHash} title={title} eyebrow={eyebrow} description={description} emptyText={emptyText} />
}

function CollectionList({ items, baseHash, title, eyebrow, description, emptyText }) {
  const [query, setQuery] = useState('')
  const [tag, setTag] = useState('全部')
  const tags = useMemo(() => ['全部', ...Array.from(new Set(items.flatMap((item) => item.tags || []))).sort()], [items])
  const filtered = useMemo(() => {
    const keyword = query.trim().toLowerCase()
    return sortPosts(items)
      .filter((item) => tag === '全部' || item.tags?.includes(tag))
      .filter((item) => {
        if (!keyword) return true
        return [item.title, item.summary, item.content, ...(item.tags || [])].join(' ').toLowerCase().includes(keyword)
      })
  }, [items, query, tag])

  return (
    <section className="mx-auto max-w-6xl py-4">
      <div className="mb-6 border border-slate-200 bg-hero-panel p-5 shadow-soft sm:p-7">
        <p className="mb-2 text-xs font-black uppercase text-primary-700">{eyebrow}</p>
        <h1 className="text-3xl font-black leading-tight text-slate-950">{title}</h1>
        <p className="mt-3 max-w-3xl text-sm font-medium leading-6 text-slate-600">{description}</p>
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={`搜索${title}、标签、内容...`}
          className="mt-5 w-full border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-800 shadow-sm outline-none placeholder:text-slate-400 focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
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

      {filtered.length ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {filtered.map((item, index) => (
            <motion.a
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
              {item.summary && <p className="mt-3 line-clamp-3 text-sm leading-6 text-slate-600">{item.summary}</p>}
              <div className="mt-4 flex flex-wrap gap-2">
                {(item.tags || []).slice(0, 4).map((tagItem) => (
                  <span key={tagItem} className="bg-primary-50 px-3 py-1 text-xs font-bold text-primary-700">{tagItem}</span>
                ))}
              </div>
            </motion.a>
          ))}
        </div>
      ) : (
        <div className="border border-slate-200 bg-white p-8 text-center text-sm font-bold text-slate-500 shadow-sm">
          {emptyText}
        </div>
      )}
    </section>
  )
}

function CollectionDetail({ item, baseHash, backLabel, attachmentTitle }) {
  return (
    <>
      <ScrollPositionControls ariaLabelPrefix={backLabel} />
      <article className="mx-auto max-w-5xl border border-slate-200 bg-white p-5 shadow-soft sm:p-8">
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
          {item.summary && <p className="mt-5 text-base leading-8 text-slate-700">{item.summary}</p>}
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
