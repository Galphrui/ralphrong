import { useEffect, useState } from 'react'

const VISITOR_KEY = 'ra-android-notes-visitor-id'
const VISIT_API_BASE = 'https://ralphrong-blog-admin.ralphrong.workers.dev'

function createVisitorId() {
  return `RA-${Math.random().toString(36).slice(2, 10).toUpperCase()}`
}

function formatDateTime(value) {
  if (!value) return '-'
  return new Intl.DateTimeFormat('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

export default function VisitStats() {
  const [record, setRecord] = useState({
    visitorId: '-',
    visits: 0,
    visitors: 0,
    lastVisitAt: '',
    status: 'loading',
  })

  useEffect(() => {
    let visitorId = localStorage.getItem(VISITOR_KEY)
    if (!visitorId) {
      visitorId = createVisitorId()
      localStorage.setItem(VISITOR_KEY, visitorId)
    }

    let cancelled = false
    const syncVisit = async () => {
      try {
        const response = await fetch(`${VISIT_API_BASE}/api/visits`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ visitorId }),
        })
        const result = await response.json()
        if (!response.ok || result.ok === false) {
          throw new Error(result.error || 'visit api failed')
        }
        if (!cancelled) {
          setRecord({
            visitorId,
            visits: Number(result.data?.visits || 0),
            visitors: Number(result.data?.visitors || 0),
            lastVisitAt: result.data?.lastVisitAt || '',
            status: 'ready',
          })
        }
      } catch (error) {
        if (!cancelled) {
          setRecord((current) => ({
            ...current,
            visitorId,
            status: 'offline',
          }))
        }
      }
    }

    syncVisit()
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <section className="border border-slate-200 bg-white p-4 shadow-sm">
      <p className="mb-3 text-xs font-black uppercase text-primary-700">Ra Visit Record</p>
      <div className="grid gap-3">
        <div>
          <div className="text-xl font-black text-slate-950">{record.visits}</div>
          <div className="text-xs font-medium text-slate-500">全站访问次数</div>
        </div>
        <div>
          <div className="text-xl font-black text-slate-950">{record.visitors}</div>
          <div className="text-xs font-medium text-slate-500">全站访客数</div>
        </div>
        <div>
          <div className="text-base font-black text-slate-950">{formatDateTime(record.lastVisitAt)}</div>
          <div className="text-xs font-medium text-slate-500">最近访问时间</div>
        </div>
        <div className="border-t border-slate-100 pt-3 text-xs font-medium text-slate-500">
          访客标识：{record.visitorId}
        </div>
        {record.status === 'offline' && (
          <div className="text-xs font-medium text-amber-700">访问统计服务暂时不可用</div>
        )}
      </div>
    </section>
  )
}
