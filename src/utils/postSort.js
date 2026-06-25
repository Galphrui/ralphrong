const collator = new Intl.Collator('zh-Hans-CN', {
  numeric: true,
  sensitivity: 'base',
})

export const SORT_OPTIONS = [
  { value: 'date-desc', label: '最新发布' },
  { value: 'date-asc', label: '最早发布' },
  { value: 'title-asc', label: '标题 A-Z' },
  { value: 'title-desc', label: '标题 Z-A' },
  { value: 'updated-desc', label: '最近修改' },
]

export function postUpdatedAt(post) {
  return post?.updatedAt || post?.modifiedAt || post?.lastModified || post?.date || ''
}

function timeValue(value) {
  const time = Date.parse(value || '')
  return Number.isNaN(time) ? 0 : time
}

function titleValue(post) {
  return post?.title || post?.slug || ''
}

export function sortPosts(posts, mode = 'date-desc') {
  return [...(posts || [])].sort((left, right) => {
    if (mode === 'date-asc') {
      return timeValue(left.date) - timeValue(right.date) || collator.compare(titleValue(left), titleValue(right))
    }
    if (mode === 'title-asc') {
      return collator.compare(titleValue(left), titleValue(right)) || timeValue(right.date) - timeValue(left.date)
    }
    if (mode === 'title-desc') {
      return collator.compare(titleValue(right), titleValue(left)) || timeValue(right.date) - timeValue(left.date)
    }
    if (mode === 'updated-desc') {
      return timeValue(postUpdatedAt(right)) - timeValue(postUpdatedAt(left)) || timeValue(right.date) - timeValue(left.date)
    }
    return timeValue(right.date) - timeValue(left.date) || collator.compare(titleValue(left), titleValue(right))
  })
}

export function sortLabel(mode) {
  return SORT_OPTIONS.find((option) => option.value === mode)?.label || SORT_OPTIONS[0].label
}
