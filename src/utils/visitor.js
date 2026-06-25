const VISITOR_KEY = 'ra-android-notes-visitor-id'

export function createVisitorId() {
  return `RA-${Math.random().toString(36).slice(2, 10).toUpperCase()}`
}

export function visitorId() {
  let id = localStorage.getItem(VISITOR_KEY)
  if (!id) {
    id = createVisitorId()
    localStorage.setItem(VISITOR_KEY, id)
  }
  return id
}
