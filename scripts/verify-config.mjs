import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('..', import.meta.url))
const dataDir = join(root, 'data')
const postsPath = join(dataDir, 'posts.json')
const adminUsersPath = join(dataDir, 'admin-users.json')
const messagesPath = join(dataDir, 'messages.json')
const metricsPath = join(dataDir, 'post-metrics.json')
const androidOfflinePath = join(root, 'RaAndroidNotesApp', 'app', 'src', 'main', 'assets', 'offline-posts.json')
const iosOfflinePath = join(root, 'RaIosNotesApp', 'RaIosNotesApp', 'Resources', 'offline-posts.json')

const defaultModules = {
  settings: { maxTopModules: 6 },
  modules: [
    { id: 'posts', label: '文章', href: '#posts', enabled: true, order: 10, surface: 'top' },
    { id: 'code', label: '代码库', href: '#code', enabled: true, order: 20, surface: 'top' },
    { id: 'profile', label: '个人', href: '#profile', enabled: true, order: 30, surface: 'top' },
    { id: 'guestbook', label: '留言', href: '#guestbook', enabled: true, order: 40, surface: 'top' },
    { id: 'modules', label: '设置', href: '#modules', enabled: true, order: 90, surface: 'top' },
    { id: 'admin', label: '管理', href: './admin.html', enabled: true, order: 100, surface: 'top', external: true },
  ],
}

const defaultRepositories = [
  {
    id: 'blog-module-registry',
    name: 'Ra 站点模块注册表',
    description: '管理文章、代码库、留言、简历、管理后台等入口的显隐、排序和最大显示数量。',
    language: 'JavaScript',
    tags: ['Web', 'Module', 'Config'],
    url: 'https://github.com/Galphrui/ralphrong',
    sourcePath: 'src/utils/moduleConfig.js',
    updatedAt: new Date().toISOString().slice(0, 10),
    snippet: "export const DEFAULT_MODULES = [\n  { id: 'posts', label: '文章', enabled: true, order: 10 },\n  { id: 'code', label: '代码库', enabled: true, order: 20 },\n]",
    notes: '后续新增模块只需要注册配置，页面入口不再硬编码。',
  },
]

const changes = []

await ensureJsonFile(adminUsersPath, { version: 1, users: [] }, '后台账号存储')
await ensureJsonFile(messagesPath, [], '本地留言存储')
await ensureJsonFile(metricsPath, {}, '文章指标存储')

const posts = await readRequiredJson(postsPath, '站点数据')
let postsChanged = false

if (!posts.site) {
  posts.site = {
    title: 'Ra Android Notes',
    subtitle: '工程实践与调试笔记',
    author: { name: 'Ralph Rong', bio: '', links: [] },
  }
  postsChanged = mark('补齐 site 配置')
}

if (!Array.isArray(posts.posts)) {
  posts.posts = []
  postsChanged = mark('补齐 posts 数组')
}

if (!posts.modules || !Array.isArray(posts.modules.modules)) {
  posts.modules = defaultModules
  postsChanged = mark('补齐 modules 模块配置')
} else {
  const moduleIds = new Set(posts.modules.modules.map((item) => item.id))
  for (const module of defaultModules.modules) {
    if (!moduleIds.has(module.id)) {
      posts.modules.modules.push(module)
      postsChanged = mark(`补齐模块 ${module.id}`)
    }
  }
  if (!posts.modules.settings) {
    posts.modules.settings = defaultModules.settings
    postsChanged = mark('补齐 modules.settings')
  }
  if (!Number.isFinite(Number(posts.modules.settings.maxTopModules))) {
    posts.modules.settings.maxTopModules = defaultModules.settings.maxTopModules
    postsChanged = mark('补齐 maxTopModules')
  }
}

if (!Array.isArray(posts.repositories)) {
  posts.repositories = defaultRepositories
  postsChanged = mark('补齐 repositories 代码库数组')
}

if (postsChanged) await writeJson(postsPath, posts)

await syncOfflineData(posts, androidOfflinePath, 'Android 离线数据')
await syncOfflineData(posts, iosOfflinePath, 'iOS 离线数据')

if (changes.length) {
  console.log(`配置检查完成，已自动补齐：\n- ${changes.join('\n- ')}`)
} else {
  console.log('配置检查完成，所有本地开发配置已完整。')
}

async function ensureJsonFile(file, fallback, label) {
  await mkdir(dirname(file), { recursive: true })
  if (!existsSync(file)) {
    await writeJson(file, fallback)
    mark(`创建 ${label}`)
    return
  }
  try {
    JSON.parse(await readFile(file, 'utf8'))
  } catch (error) {
    throw new Error(`${label} JSON 无法解析：${file}`)
  }
}

async function readRequiredJson(file, label) {
  if (!existsSync(file)) throw new Error(`${label} 不存在：${file}`)
  try {
    return JSON.parse(await readFile(file, 'utf8'))
  } catch (error) {
    throw new Error(`${label} JSON 无法解析：${file}`)
  }
}

async function syncOfflineData(posts, file, label) {
  if (!existsSync(dirname(file))) return
  const next = `${JSON.stringify(posts, null, 2)}\n`
  const current = existsSync(file) ? await readFile(file, 'utf8') : ''
  if (current !== next) {
    await mkdir(dirname(file), { recursive: true })
    await writeFile(file, next)
    mark(`同步 ${label}`)
  }
}

async function writeJson(file, value) {
  await mkdir(dirname(file), { recursive: true })
  await writeFile(file, `${JSON.stringify(value, null, 2)}\n`)
}

function mark(message) {
  changes.push(message)
  return true
}
