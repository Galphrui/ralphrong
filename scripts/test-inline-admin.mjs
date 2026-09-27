import assert from 'node:assert/strict'
import { deleteInlineItem, moveInlineItem, upsertInlineItem } from '../src/utils/inlineAdmin.js'

const source = {
  posts: [
    { slug: 'visible', title: '公开', custom: 'keep' },
    { slug: 'hidden', title: '隐藏', hidden: true },
    { slug: 'third', title: '第三篇' },
  ],
  repositories: [],
  tools: [],
  devLogs: [],
  profile: { name: 'Ra', sections: [{ title: '保留' }] },
}

const updated = upsertInlineItem(source, 'posts', 'visible', { slug: 'visible', title: '新标题' })
assert.equal(updated.posts[0].custom, 'keep', '更新必须保留未知字段')
assert.equal(updated.posts[1].hidden, true, '更新公开内容不能丢失隐藏内容')
assert.equal(source.posts[0].title, '公开', '操作不能修改输入对象')

const moved = moveInlineItem(updated, 'posts', 'third', -1)
assert.deepEqual(moved.posts.map((item) => item.slug), ['visible', 'third', 'hidden'])
assert.deepEqual(moved.posts.map((item) => item.sortOrder), [0, 1, 2])

const removed = deleteInlineItem(moved, 'posts', 'visible')
assert.deepEqual(removed.posts.map((item) => item.slug), ['third', 'hidden'])
assert.equal(removed.posts[1].hidden, true)

const profile = upsertInlineItem(source, 'profile', 'profile', { name: 'Ralph' })
assert.equal(profile.profile.name, 'Ralph')
assert.deepEqual(profile.profile.sections, [{ title: '保留' }])

console.log('inline admin tests passed')
