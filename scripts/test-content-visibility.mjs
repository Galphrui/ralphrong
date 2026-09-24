import assert from 'node:assert/strict'
import { filterVisibleContent, isContentVisible, normalizeContentVisibility } from '../src/utils/contentVisibility.js'

const rules = normalizeContentVisibility({
  hiddenTags: ['面试', '面试', ''],
  hiddenItems: { posts: ['private-post'], repositories: ['private-repo'] },
})

assert.deepEqual(rules.hiddenTags, ['面试'])
assert.deepEqual(rules.hiddenItems.tools, [])
assert.equal(isContentVisible({ slug: 'interview', tags: ['Android', '面试'] }, 'posts', rules), false)
assert.equal(isContentVisible({ slug: 'private-post', tags: ['Android'] }, 'posts', rules), false)
assert.equal(isContentVisible({ slug: 'public-post', tags: ['Android'] }, 'posts', rules), true)
assert.equal(isContentVisible({ id: 'private-repo', tags: [] }, 'repositories', rules), false)
assert.deepEqual(
  filterVisibleContent(
    [
      { slug: 'hidden-by-tag', tags: ['面试'] },
      { slug: 'private-post', tags: [] },
      { slug: 'visible', tags: ['调试'] },
    ],
    'posts',
    rules,
  ).map((item) => item.slug),
  ['visible'],
)

console.log('内容可见性过滤测试通过。')
