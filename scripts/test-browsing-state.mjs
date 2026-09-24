import assert from 'node:assert/strict'
import { readBrowsingState, saveBrowsingState } from '../src/utils/browsingState.js'

const values = new Map()
const storage = {
  getItem: (key) => values.get(key) ?? null,
  setItem: (key, value) => values.set(key, value),
}
const article = { pathname: '/ralphrong/', search: '', hash: '#post/article-a' }
const home = { pathname: '/ralphrong/', search: '', hash: '' }

saveBrowsingState(article, 0, 1480, storage, 1000)
saveBrowsingState(home, 0, 320, storage, 1001)

assert.equal(readBrowsingState(article, storage, 1002)?.scrollY, 1480)
assert.equal(readBrowsingState(home, storage, 1002)?.scrollY, 320)
assert.equal(readBrowsingState({ ...article, hash: '#post/article-b' }, storage, 1002), null)

console.log('Browsing positions stay isolated per route.')
