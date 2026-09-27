import { useEffect, useMemo, useState } from 'react'
import { useBlogStore } from '../store/useStore'
import { normalizeSiteData } from '../utils/api'
import { publishAdminData } from '../utils/adminApi'
import {
  INLINE_MODULES,
  deleteInlineItem,
  inlineItemId,
  moveInlineItem,
  slugifyInline,
  upsertInlineItem,
} from '../utils/inlineAdmin'

const today = () => new Date().toISOString().slice(0, 10)

function blankItem(type) {
  if (type === 'repositories') {
    return { id: '', name: '', fileName: '', description: '', language: 'Plain Text', tags: [], url: '', sourcePath: '', updatedAt: today(), snippet: '', notes: '', attachments: [] }
  }
  return { title: '', slug: '', date: today(), updatedAt: today(), tags: [], visibility: 'public', accessPassword: '', summary: '', content: '', contentFormat: 'markdown', attachments: [] }
}

function tagsText(value) {
  return Array.isArray(value) ? value.join(', ') : String(value || '')
}

function parsedTags(value) {
  return [...new Set(String(value || '').split(/[,，\n]/).map((tag) => tag.trim()).filter(Boolean))]
}

function Field({ label, children, wide = false }) {
  return <label className={wide ? 'ra-inline-field ra-inline-field-wide' : 'ra-inline-field'}><span>{label}</span>{children}</label>
}

export default function InlineAdminEditor({ type, item = null, backHash = '' }) {
  const { adminUser, adminData, setAdminData, hydrateSiteData } = useBlogStore()
  const config = INLINE_MODULES[type]
  const currentId = inlineItemId(type, item)
  const rawItem = useMemo(() => {
    if (!adminData || !config) return null
    if (config.singleton) return adminData.profile || item
    return (adminData[config.collection] || []).find((value) => inlineItemId(type, value) === currentId) || item
  }, [adminData, config, currentId, item, type])
  const [editing, setEditing] = useState(false)
  const [isNew, setIsNew] = useState(false)
  const asDraft = (value) => config?.singleton ? JSON.stringify(value || {}, null, 2) : (value || blankItem(type))
  const [draft, setDraft] = useState(() => asDraft(rawItem))
  const [status, setStatus] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!editing) setDraft(asDraft(rawItem))
  }, [editing, rawItem, type])

  useEffect(() => {
    if (!adminUser || !adminData) return undefined
    document.body.classList.add('ra-inline-admin-active')
    return () => document.body.classList.remove('ra-inline-admin-active')
  }, [adminData, adminUser])

  if (!adminUser || !adminData || !config) return null

  const update = (key, value) => setDraft((current) => ({ ...current, [key]: value }))
  const normalizedDraft = () => {
    if (config.singleton) {
      const value = typeof draft === 'string' ? JSON.parse(draft) : draft
      if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('个人页 JSON 必须是对象')
      return value
    }
    if (type === 'repositories') {
      const id = slugifyInline(draft.id || draft.name)
      if (!id || !String(draft.name || '').trim()) throw new Error('代码名称和标识不能为空')
      return { ...draft, id, name: String(draft.name).trim(), tags: parsedTags(draft.tags), updatedAt: draft.updatedAt || today() }
    }
    const slug = slugifyInline(draft.slug || draft.title)
    if (!slug || !String(draft.title || '').trim()) throw new Error(`${config.title}标题和地址不能为空`)
    return { ...draft, slug, title: String(draft.title).trim(), tags: parsedTags(draft.tags), updatedAt: today() }
  }
  const buildNext = () => {
    const value = normalizedDraft()
    const nextId = inlineItemId(type, value)
    if (!config.singleton) {
      const duplicate = (adminData[config.collection] || []).some((candidate) => inlineItemId(type, candidate) === nextId && inlineItemId(type, candidate) !== (isNew ? '' : currentId))
      if (duplicate) throw new Error('标识已存在，请换一个地址或 ID')
    }
    return { data: upsertInlineItem(adminData, type, isNew ? '' : currentId, value), value }
  }
  const applyData = (next) => {
    setAdminData(next)
    hydrateSiteData(normalizeSiteData(next))
  }
  const save = () => {
    try {
      const next = buildNext()
      applyData(next.data)
      setEditing(false)
      setIsNew(false)
      setStatus('已保存到编辑会话；点击“发布”才会写入线上。')
      const id = inlineItemId(type, next.value)
      if (!config.singleton && id !== currentId) window.location.hash = `${backHash}/${encodeURIComponent(id)}`.replace(/^\//, '')
    } catch (error) {
      setStatus(error.message)
    }
  }
  const publish = async () => {
    try {
      setBusy(true)
      const prepared = editing ? buildNext() : { data: adminData, value: rawItem }
      const result = await publishAdminData(prepared.data)
      const published = result.data || prepared.data
      applyData(published)
      setEditing(false)
      setIsNew(false)
      setStatus('已发布，线上内容已更新。')
      const id = inlineItemId(type, prepared.value)
      if (editing && !config.singleton && id && id !== currentId) window.location.hash = `${backHash}/${encodeURIComponent(id)}`.replace(/^\//, '')
    } catch (error) {
      setStatus(`发布失败：${error.message}`)
    } finally {
      setBusy(false)
    }
  }
  const remove = () => {
    if (!currentId || config.singleton || !window.confirm(`确定删除这个${config.title}吗？删除后仍需点击“发布”才会写入线上。`)) return
    applyData(deleteInlineItem(adminData, type, currentId))
    setStatus('已从编辑会话删除；点击“发布”确认上线。')
    window.location.hash = backHash
  }
  const move = (direction) => {
    if (!currentId || config.singleton) return
    applyData(moveInlineItem(adminData, type, currentId, direction))
    setStatus(direction < 0 ? '已上移；点击“发布”确认上线。' : '已下移；点击“发布”确认上线。')
  }
  const beginEdit = () => { setDraft(asDraft(rawItem)); setIsNew(false); setEditing(true); setStatus('') }
  const beginNew = () => { setDraft(blankItem(type)); setIsNew(true); setEditing(true); setStatus('') }

  return (
    <section className="ra-inline-admin-shell RaNoPrint" aria-label={`${config.title}快捷管理`}>
      <div className="ra-inline-admin-rail ra-inline-admin-rail-left">
        <span className="ra-inline-admin-user">{adminUser} 在线</span>
        {rawItem && <button type="button" onClick={beginEdit}>编辑</button>}
        {!config.singleton && <button type="button" onClick={beginNew}>新增</button>}
        {!config.singleton && rawItem && <button type="button" className="danger" onClick={remove}>删除</button>}
      </div>
      <div className="ra-inline-admin-rail ra-inline-admin-rail-right">
        {editing && <button type="button" onClick={save}>保存</button>}
        <button type="button" className="primary" disabled={busy} onClick={publish}>{busy ? '发布中…' : '发布'}</button>
        {!config.singleton && rawItem && <button type="button" onClick={() => move(-1)}>上移</button>}
        {!config.singleton && rawItem && <button type="button" onClick={() => move(1)}>下移</button>}
        {editing && <button type="button" onClick={() => { setEditing(false); setIsNew(false); setStatus('已取消编辑。') }}>取消</button>}
      </div>
      {(editing || status) && (
        <div className="ra-inline-admin-editor">
          <div className="ra-inline-editor-heading">
            <div><p>Ra Inline Editor</p><h2>{isNew ? `新增${config.title}` : `编辑${config.title}`}</h2></div>
            <span>阅读页快捷编辑 · 后台管理保持独立</span>
          </div>
          {editing && (config.singleton ? (
            <Field label="完整个人页 JSON" wide><textarea rows="24" className="code" value={draft} onChange={(event) => { setDraft(event.target.value); setStatus('') }} /></Field>
          ) : type === 'repositories' ? (
            <div className="ra-inline-editor-grid">
              <Field label="名称"><input value={draft.name || ''} onChange={(e) => update('name', e.target.value)} /></Field>
              <Field label="标识 ID"><input value={draft.id || ''} onChange={(e) => update('id', e.target.value)} /></Field>
              <Field label="文件名"><input value={draft.fileName || ''} onChange={(e) => update('fileName', e.target.value)} /></Field>
              <Field label="语言"><input value={draft.language || ''} onChange={(e) => update('language', e.target.value)} /></Field>
              <Field label="标签"><input value={tagsText(draft.tags)} onChange={(e) => update('tags', e.target.value)} /></Field>
              <Field label="更新时间"><input type="date" value={String(draft.updatedAt || '').slice(0, 10)} onChange={(e) => update('updatedAt', e.target.value)} /></Field>
              <Field label="源码路径" wide><input value={draft.sourcePath || ''} onChange={(e) => update('sourcePath', e.target.value)} /></Field>
              <Field label="外部地址" wide><input value={draft.url || ''} onChange={(e) => update('url', e.target.value)} /></Field>
              <Field label="说明" wide><textarea rows="4" value={draft.description || ''} onChange={(e) => update('description', e.target.value)} /></Field>
              <Field label="代码正文" wide><textarea rows="18" className="code" value={draft.snippet || ''} onChange={(e) => update('snippet', e.target.value)} /></Field>
              <Field label="补充笔记" wide><textarea rows="8" value={draft.notes || ''} onChange={(e) => update('notes', e.target.value)} /></Field>
            </div>
          ) : (
            <div className="ra-inline-editor-grid">
              <Field label="标题"><input value={draft.title || ''} onChange={(e) => update('title', e.target.value)} /></Field>
              <Field label="访问地址"><input value={draft.slug || ''} onChange={(e) => update('slug', e.target.value)} /></Field>
              <Field label="日期"><input type="date" value={String(draft.date || '').slice(0, 10)} onChange={(e) => update('date', e.target.value)} /></Field>
              <Field label="标签"><input value={tagsText(draft.tags)} onChange={(e) => update('tags', e.target.value)} /></Field>
              <Field label="可见性"><select value={draft.visibility || 'public'} onChange={(e) => update('visibility', e.target.value)}><option value="public">公开</option><option value="password">密码访问</option></select></Field>
              <Field label="访问密码"><input value={draft.accessPassword || ''} onChange={(e) => update('accessPassword', e.target.value)} /></Field>
              <Field label="摘要" wide><textarea rows="4" value={draft.summary || ''} onChange={(e) => update('summary', e.target.value)} /></Field>
              <Field label="正文 Markdown" wide><textarea rows="28" className="code" value={draft.content || ''} onChange={(e) => update('content', e.target.value)} /></Field>
            </div>
          ))}
          {status && <p className="ra-inline-admin-status" role="status">{status}</p>}
        </div>
      )}
    </section>
  )
}
