import { useEffect, useState } from 'react'
import { createMessage, fetchMessages } from '../utils/api'

function formatMessageTime(value) {
  if (!value) return ''
  return new Intl.DateTimeFormat('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

export default function Guestbook({ compact = false }) {
  const [messages, setMessages] = useState([])
  const [name, setName] = useState('')
  const [message, setMessage] = useState('')
  const [status, setStatus] = useState('正在同步留言...')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    let cancelled = false
    fetchMessages()
      .then((items) => {
        if (!cancelled) {
          setMessages(items)
          setStatus(items.length ? '' : '还没有留言，欢迎写下第一条。')
        }
      })
      .catch((error) => {
        if (!cancelled) setStatus(error.message || '留言服务暂时不可用')
      })
    return () => {
      cancelled = true
    }
  }, [])

  const submit = async (event) => {
    event.preventDefault()
    setSubmitting(true)
    setStatus('正在发布留言...')
    try {
      const nextMessages = await createMessage({ name, message })
      setMessages(nextMessages)
      setName('')
      setMessage('')
      setStatus('留言已发布，全站可见。')
    } catch (error) {
      setStatus(error.message || '留言发布失败')
    } finally {
      setSubmitting(false)
    }
  }

  const visibleMessages = compact ? messages.slice(0, 4) : messages

  return (
    <section className="border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase text-primary-700">Ra Guestbook</p>
          <h2 className="mt-1 text-base font-black text-slate-950">留言板</h2>
        </div>
        <span className="bg-primary-50 px-2 py-1 text-[11px] font-black text-primary-700">{messages.length}</span>
      </div>

      <form className="grid gap-2" onSubmit={submit}>
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          maxLength={24}
          className="w-full border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-900 outline-none transition focus:border-primary-500"
          placeholder="昵称，可留空"
        />
        <textarea
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          maxLength={240}
          rows={compact ? 3 : 4}
          className="w-full resize-none border border-slate-200 bg-white px-3 py-2 text-sm font-medium leading-6 text-slate-900 outline-none transition focus:border-primary-500"
          placeholder="给 Ra 留句话"
        />
        <button
          type="submit"
          disabled={submitting}
          className="border border-primary-700 bg-primary-700 px-3 py-2 text-xs font-black text-white transition hover:bg-primary-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? '发布中...' : '发布留言'}
        </button>
      </form>

      {status && <p className="mt-3 text-xs font-medium leading-5 text-amber-700">{status}</p>}

      <div className="mt-4 grid gap-3">
        {visibleMessages.map((item) => (
          <article key={item.id} className="border-t border-slate-100 pt-3">
            <div className="flex items-center justify-between gap-3">
              <strong className="min-w-0 truncate text-sm font-black text-slate-950">{item.name || '陌生朋友'}</strong>
              <time className="shrink-0 text-[11px] font-bold text-slate-400">{formatMessageTime(item.createdAt)}</time>
            </div>
            <p className="mt-1 break-words text-sm font-medium leading-6 text-slate-600">{item.message}</p>
          </article>
        ))}
      </div>
    </section>
  )
}
