export const CONTENT_TYPES = ['posts', 'repositories', 'tools', 'devLogs']

export const DEFAULT_CONTENT_VISIBILITY = {
  hiddenTags: [],
  hiddenItems: { posts: [], repositories: [], tools: [], devLogs: [] },
}

const uniqueStrings = (values) =>
  [...new Set((Array.isArray(values) ? values : []).map((value) => String(value || '').trim()).filter(Boolean))]

export function normalizeContentVisibility(value = {}) {
  const hiddenItems = value?.hiddenItems && typeof value.hiddenItems === 'object' ? value.hiddenItems : {}
  return {
    hiddenTags: uniqueStrings(value?.hiddenTags),
    hiddenItems: Object.fromEntries(CONTENT_TYPES.map((type) => [type, uniqueStrings(hiddenItems[type])])),
  }
}

export function contentItemId(type, item = {}) {
  if (type === 'repositories') return String(item.id || item.slug || item.name || '').trim()
  return String(item.slug || item.id || item.title || item.name || '').trim()
}

export function isContentVisible(item, type, rules = DEFAULT_CONTENT_VISIBILITY) {
  const normalized = normalizeContentVisibility(rules)
  if (new Set(normalized.hiddenItems[type] || []).has(contentItemId(type, item))) return false
  const hiddenTags = new Set(normalized.hiddenTags)
  return !(Array.isArray(item?.tags) && item.tags.some((tag) => hiddenTags.has(String(tag || '').trim())))
}

export function filterVisibleContent(items, type, rules) {
  return (Array.isArray(items) ? items : []).filter((item) => isContentVisible(item, type, rules))
}
