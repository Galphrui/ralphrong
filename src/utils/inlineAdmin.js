export const INLINE_MODULES = {
  posts: { collection: 'posts', id: 'slug', title: '文章' },
  repositories: { collection: 'repositories', id: 'id', title: '代码' },
  tools: { collection: 'tools', id: 'slug', title: '工具' },
  devLogs: { collection: 'devLogs', id: 'slug', title: '开发日志' },
  profile: { collection: 'profile', id: '', title: '个人页', singleton: true },
}

export function inlineItemId(type, item = {}) {
  const config = INLINE_MODULES[type]
  return config?.singleton ? 'profile' : String(item?.[config?.id] || '')
}

export function slugifyInline(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, '-')
    .replace(/[^a-z0-9\u4e00-\u9fa5-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

function clone(value) {
  return typeof structuredClone === 'function' ? structuredClone(value) : JSON.parse(JSON.stringify(value))
}

function ordered(items) {
  return items.map((item, index) => ({ ...item, sortOrder: index }))
}

export function upsertInlineItem(data, type, originalId, item) {
  const config = INLINE_MODULES[type]
  if (!config) throw new Error('不支持的内容模块')
  const next = clone(data)
  if (config.singleton) {
    next.profile = { ...(next.profile || {}), ...item }
    return next
  }
  const values = Array.isArray(next[config.collection]) ? next[config.collection] : []
  const index = values.findIndex((value) => String(value?.[config.id] || '') === String(originalId || ''))
  if (index >= 0) values[index] = { ...values[index], ...item }
  else values.push(item)
  next[config.collection] = ordered(values)
  return next
}

export function deleteInlineItem(data, type, id) {
  const config = INLINE_MODULES[type]
  if (!config || config.singleton) return clone(data)
  const next = clone(data)
  next[config.collection] = ordered(
    (next[config.collection] || []).filter((item) => String(item?.[config.id] || '') !== String(id || '')),
  )
  return next
}

export function moveInlineItem(data, type, id, direction) {
  const config = INLINE_MODULES[type]
  if (!config || config.singleton) return clone(data)
  const next = clone(data)
  const values = [...(next[config.collection] || [])]
  const index = values.findIndex((item) => String(item?.[config.id] || '') === String(id || ''))
  const target = index + direction
  if (index < 0 || target < 0 || target >= values.length) return next
  ;[values[index], values[target]] = [values[target], values[index]]
  next[config.collection] = ordered(values)
  return next
}
