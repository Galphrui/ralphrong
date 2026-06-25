const BLOCKED_PATTERNS = [
  /傻[逼b屄比]/i,
  /煞笔/i,
  /蠢货/i,
  /废物/i,
  /去死/i,
  /滚(开|蛋)?/i,
  /妈的/i,
  /操你/i,
  /草你/i,
  /fuck/i,
  /shit/i,
  /bitch/i,
  /nazi/i,
  /恐怖主义/i,
  /炸弹/i,
  /枪支/i,
  /毒品/i,
  /博彩/i,
  /赌博/i,
  /色情/i,
]

export function normalizeMessageText(value) {
  return String(value || '').replace(/\s+/g, ' ').trim()
}

export function findBlockedTerm(value) {
  const text = normalizeMessageText(value)
  return BLOCKED_PATTERNS.find((pattern) => pattern.test(text)) || null
}

export function validateGuestMessage({ name, message }) {
  const cleanName = normalizeMessageText(name || '陌生朋友').slice(0, 24)
  const cleanMessage = normalizeMessageText(message)

  if (cleanMessage.length < 2) {
    return { ok: false, error: '留言至少需要 2 个字。' }
  }
  if (cleanMessage.length > 240) {
    return { ok: false, error: '留言最多 240 个字。' }
  }
  if (findBlockedTerm(`${cleanName} ${cleanMessage}`)) {
    return { ok: false, error: '留言包含明显不友好的词汇，请调整后再发布。' }
  }

  return { ok: true, name: cleanName || '陌生朋友', message: cleanMessage }
}
