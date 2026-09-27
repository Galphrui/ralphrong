const SESSION_TOKEN_KEY = 'RaBlogAdminSessionToken'
const WORKER_API_BASE = 'https://ralphrong-blog-admin.ralphrong.workers.dev'
const API_BASE =
  window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? window.location.origin
    : WORKER_API_BASE

async function adminRequest(path, options = {}) {
  const token = window.localStorage.getItem(SESSION_TOKEN_KEY)
  const headers = { Accept: 'application/json', ...(options.headers || {}) }
  if (token) headers.Authorization = `Bearer ${token}`
  const response = await fetch(`${API_BASE}${path}`, { ...options, headers, credentials: 'include', cache: 'no-store' })
  const result = await response.json().catch(() => ({}))
  if (!response.ok || result.ok === false) {
    const error = new Error(result.error || '管理员服务暂时不可用')
    error.status = response.status
    throw error
  }
  return result
}

export const checkAdminSession = () => adminRequest('/api/session')
export const fetchAdminData = () => adminRequest('/api/posts')
export const publishAdminData = (data) =>
  adminRequest('/api/posts', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ data }),
  })

export { SESSION_TOKEN_KEY }
