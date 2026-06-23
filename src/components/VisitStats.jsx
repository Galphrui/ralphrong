import { useEffect, useState } from 'react'

const VISIT_KEY = 'ra-android-notes-visit-record'

function createVisitorId() {
  return `RA-${Math.random().toString(36).slice(2, 6).toUpperCase()}`
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
  })

  useEffect(() => {
    const saved = JSON.parse(localStorage.getItem(VISIT_KEY) || '{}')
    const next = {
      visitorId: saved.visitorId || createVisitorId(),
      visits: Number(saved.visits || 0) + 1,
      visitors: 1,
      lastVisitAt: new Date().toISOString(),
    }
    localStorage.setItem(VISIT_KEY, JSON.stringify(next))
    setRecord(next)
  }, [])

  return (
    <section className="border border-slate-200 bg-white p-5 shadow-sm">
      <p className="mb-3 text-xs font-black uppercase text-primary-700">Ra Visit Record</p>
      <div className="grid gap-3">
        <div>
          <div className="text-2xl font-black text-slate-950">{record.visits}</div>
          <div className="text-xs font-medium text-slate-500">访问次数</div>
        </div>
        <div>
          <div className="text-2xl font-black text-slate-950">{record.visitors}</div>
          <div className="text-xs font-medium text-slate-500">访问人数（本机）</div>
        </div>
        <div>
          <div className="text-lg font-black text-slate-950">{formatDateTime(record.lastVisitAt)}</div>
          <div className="text-xs font-medium text-slate-500">最近访问时间</div>
        </div>
        <div className="border-t border-slate-100 pt-3 text-xs font-medium text-slate-500">
          访客标识：{record.visitorId}
        </div>
      </div>
    </section>
  )
}
