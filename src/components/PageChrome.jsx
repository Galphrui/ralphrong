import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import Guestbook from './Guestbook'
import VisitStats from './VisitStats'
import { useBlogStore } from '../store/useStore'
import { SORT_OPTIONS, sortLabel } from '../utils/postSort'
import { sortContentItems } from '../utils/listing'

export function AuthorPanel() {
  const { profile } = useBlogStore()

  return (
    <aside className="grid content-start gap-5">
      <section data-animate-section className="border border-slate-200 bg-white p-4 shadow-sm">
        <p className="mb-3 text-xs font-black uppercase text-primary-700">Ra Profile</p>
        <div className="mb-4 flex h-11 w-11 items-center justify-center bg-gradient-brand text-base font-black text-white">
          RA
        </div>
        <h2 className="text-lg font-black leading-tight text-slate-950">{profile?.name || 'Ralph Rong'}</h2>
        <p className="mt-2 text-sm font-medium leading-6 text-slate-600">
          {profile?.headline || 'Android 系统工程师｜智能穿戴 / 安卓系统'}
        </p>
        <a
          href="#profile"
          className="mt-4 inline-flex border border-primary-100 bg-primary-50 px-3 py-2 text-xs font-bold text-primary-700 hover:border-primary-300"
        >
          查看 Ra 个人页
        </a>
      </section>
      <Guestbook compact />
      <VisitStats />
    </aside>
  )
}

export function SortPanel({ sortMode = 'date-desc', onSortModeChange, options = SORT_OPTIONS }) {
  if (!onSortModeChange) return null

  return (
    <section data-animate-section className="border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase text-primary-700">Ra Sort</p>
          <p className="mt-1 text-xs font-medium text-slate-500">{sortLabel(sortMode)}</p>
        </div>
        <span className="bg-primary-50 px-2 py-1 text-[11px] font-black text-primary-700">排序</span>
      </div>
      <div className="grid gap-2">
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => onSortModeChange(option.value)}
            className={`w-full border px-3 py-2 text-left text-xs font-black transition-all ${
              sortMode === option.value
                ? 'border-primary-700 bg-primary-700 text-white shadow-brand'
                : 'border-slate-200 bg-white text-slate-700 hover:border-primary-300 hover:bg-primary-50 hover:text-primary-700'
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>
    </section>
  )
}

export function IndexPanel({ stats = [], focusText }) {
  return (
    <aside className="grid content-start gap-5">
      <section data-animate-section className="border border-slate-200 bg-white p-4 shadow-sm">
        <p className="mb-3 text-xs font-black uppercase text-primary-700">Ra Index</p>
        <div className="grid gap-4">
          {stats.map((stat) => (
            <div key={stat.label} className="border-b border-slate-100 pb-4 last:border-0 last:pb-0">
              <div className="text-xl font-black text-primary-700">{stat.value}</div>
              <div className="text-xs font-medium text-slate-500">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>
      {focusText && (
        <section data-animate-section className="border border-slate-200 bg-white p-4 text-sm leading-6 text-slate-600 shadow-sm">
          <p className="mb-2 text-xs font-black uppercase text-primary-700">Ra Focus</p>
          <p>{focusText}</p>
        </section>
      )}
    </aside>
  )
}

export function PageScaffold({ children, stats, focusText, sortMode, onSortModeChange }) {
  return (
    <div className="grid items-start gap-5 xl:grid-cols-[240px_minmax(0,1fr)_240px] 2xl:grid-cols-[260px_minmax(0,900px)_260px]">
      <AuthorPanel />
      <div className="min-w-0">{children}</div>
      <aside className="grid content-start gap-5">
        <SortPanel sortMode={sortMode} onSortModeChange={onSortModeChange} />
        <IndexPanel stats={stats} focusText={focusText} />
      </aside>
    </div>
  )
}

const DEFAULT_PROMO_TABS = [
  { key: 'latest', label: '最近发布', sortMode: 'date-desc' },
  { key: 'updated', label: '最近修改', sortMode: 'updated-desc' },
  { key: 'tags', label: '标签最多', sort: (items) => [...items].sort((a, b) => (b.tags?.length || 0) - (a.tags?.length || 0)) },
]

export function FeatureHero({
  eyebrow,
  title,
  description,
  items = [],
  baseHash,
  getId = (item) => item.slug || item.id,
  getTitle = (item) => item.title || item.name,
  getSummary = (item) => item.summary || item.description || item.notes,
  getMeta = () => [],
  tabs = DEFAULT_PROMO_TABS,
}) {
  const [promoMode, setPromoMode] = useState(tabs[0]?.key || 'latest')
  const [promoIndex, setPromoIndex] = useState(0)

  const promotedItems = useMemo(() => {
    const tab = tabs.find((item) => item.key === promoMode) || tabs[0]
    const sorted = tab?.sort ? tab.sort(items) : sortContentItems(items, tab?.sortMode || 'date-desc')
    return sorted.slice(0, 5)
  }, [items, promoMode, tabs])

  useEffect(() => {
    setPromoIndex(0)
  }, [promoMode, items.length])

  useEffect(() => {
    if (promotedItems.length <= 1) return undefined
    const timer = window.setInterval(() => {
      setPromoIndex((current) => (current + 1) % promotedItems.length)
    }, 4200)
    return () => window.clearInterval(timer)
  }, [promotedItems.length])

  const promotedItem = promotedItems[promoIndex] || null
  const currentTabLabel = tabs.find((tab) => tab.key === promoMode)?.label || ''

  return (
    <section data-hero-motion data-animate-section className="ra-hero-motion relative overflow-hidden border border-slate-200 bg-hero-panel px-5 py-8 shadow-soft sm:px-8 lg:px-10">
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-brand" />
      <div className="absolute inset-0 bg-grid-pattern opacity-45" />
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="relative z-10 grid gap-6">
        <div>
          <p className="mb-3 text-xs font-black uppercase text-primary-600">{eyebrow}</p>
          <h1 data-animate-text className="mb-4 max-w-4xl text-3xl font-black leading-tight text-slate-950 sm:text-4xl">{title}</h1>
          <p className="max-w-3xl text-base leading-7 text-slate-600">{description}</p>
        </div>
        {promotedItem && (
          <div className="border-t border-primary-100 pt-5">
            <div className="mb-4 flex flex-wrap gap-2">
              {tabs.map((tab) => (
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
            <a
              data-animate-card
              key={`${promoMode}-${getId(promotedItem)}`}
              href={`#${baseHash}/${encodeURIComponent(getId(promotedItem))}`}
              className="block w-full overflow-hidden border border-primary-100 bg-white/80 p-4 text-left transition hover:border-primary-300 hover:bg-white"
            >
              <div>
                <div className="mb-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-black uppercase text-primary-700">
                  <span>{currentTabLabel}</span>
                  {getMeta(promotedItem).map((item) => (
                    <span key={item}>{item}</span>
                  ))}
                </div>
                <h2 className="line-clamp-2 text-xl font-black leading-tight text-slate-950 sm:text-2xl">{getTitle(promotedItem)}</h2>
                <p className="mt-2 line-clamp-2 text-sm font-medium leading-6 text-slate-600">{getSummary(promotedItem)}</p>
              </div>
            </a>
            {promotedItems.length > 1 && (
              <div className="mt-3 flex items-center gap-2">
                {promotedItems.map((item, index) => (
                  <button
                    key={getId(item)}
                    type="button"
                    onClick={() => setPromoIndex(index)}
                    className={`h-2 transition-all ${index === promoIndex ? 'w-8 bg-primary-700' : 'w-2 bg-primary-100 hover:bg-primary-300'}`}
                    aria-label={`切换到第 ${index + 1} 个精选条目`}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </motion.div>
    </section>
  )
}

export function LoadingPanel({ children = '正在加载 Ra 数据...' }) {
  return <div className="border border-slate-200 bg-white p-8 text-slate-600 shadow-soft">{children}</div>
}
