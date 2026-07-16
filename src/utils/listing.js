const collator = new Intl.Collator('zh-Hans-CN', {
  numeric: true,
  sensitivity: 'base',
})

export const PAGE_SIZE_OPTIONS = [10, 20, 50, 100]

export function getPageRange(currentPage, totalPages) {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1)
  }

  const pages = new Set([1, totalPages, currentPage])
  if (currentPage > 2) pages.add(currentPage - 1)
  if (currentPage < totalPages - 1) pages.add(currentPage + 1)
  if (currentPage <= 3) pages.add(2).add(3)
  if (currentPage >= totalPages - 2) pages.add(totalPages - 1).add(totalPages - 2)

  const ordered = [...pages].filter((page) => page >= 1 && page <= totalPages).sort((a, b) => a - b)
  return ordered.reduce((range, page, index) => {
    if (index > 0 && page - ordered[index - 1] > 1) range.push('ellipsis')
    range.push(page)
    return range
  }, [])
}

export function itemTitle(item = {}) {
  return item.title || item.name || item.slug || item.id || ''
}

export function itemDate(item = {}) {
  return item.date || item.createdAt || item.updatedAt || ''
}

export function itemUpdatedAt(item = {}) {
  return item.updatedAt || item.modifiedAt || item.lastModified || item.date || item.createdAt || ''
}

export function timeValue(value) {
  const time = Date.parse(value || '')
  return Number.isNaN(time) ? 0 : time
}

export function sortContentItems(items, mode = 'date-desc') {
  return [...(items || [])].sort((left, right) => {
    if (mode === 'date-asc') {
      return timeValue(itemDate(left)) - timeValue(itemDate(right)) || collator.compare(itemTitle(left), itemTitle(right))
    }
    if (mode === 'title-asc') {
      return collator.compare(itemTitle(left), itemTitle(right)) || timeValue(itemDate(right)) - timeValue(itemDate(left))
    }
    if (mode === 'title-desc') {
      return collator.compare(itemTitle(right), itemTitle(left)) || timeValue(itemDate(right)) - timeValue(itemDate(left))
    }
    if (mode === 'updated-desc') {
      return timeValue(itemUpdatedAt(right)) - timeValue(itemUpdatedAt(left)) || timeValue(itemDate(right)) - timeValue(itemDate(left))
    }
    return timeValue(itemDate(right)) - timeValue(itemDate(left)) || collator.compare(itemTitle(left), itemTitle(right))
  })
}

export function uniqueTags(items) {
  return Array.from(new Set((items || []).flatMap((item) => item.tags || []))).sort()
}

export function formatDateDot(value) {
  return String(value || '').slice(0, 10).replaceAll('-', '.') || '-'
}
