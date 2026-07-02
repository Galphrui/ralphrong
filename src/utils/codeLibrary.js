export const CODE_DISPLAY_STYLES = [
  { id: 'list', label: '列表' },
  { id: 'code-block', label: '代码块' },
  { id: 'compact', label: '紧凑' },
  { id: 'gallery', label: '画廊' },
  { id: 'timeline', label: '时间线' },
  { id: 'magazine', label: '杂志' },
]

export const CODE_LANGUAGE_PRESETS = [
  { label: 'Plain Text', value: 'Plain Text', extension: 'txt' },
  { label: 'C', value: 'C', extension: 'c' },
  { label: 'C++', value: 'C++', extension: 'cpp' },
  { label: 'Python', value: 'Python', extension: 'py' },
  { label: 'Java', value: 'Java', extension: 'java' },
  { label: 'Kotlin / KT', value: 'Kotlin', extension: 'kt' },
  { label: 'JavaScript', value: 'JavaScript', extension: 'js' },
  { label: 'TypeScript', value: 'TypeScript', extension: 'ts' },
  { label: 'Shell', value: 'Shell', extension: 'sh' },
  { label: 'ADB', value: 'ADB', extension: 'sh' },
  { label: 'XML', value: 'XML', extension: 'xml' },
  { label: 'JSON', value: 'JSON', extension: 'json' },
  { label: 'Markdown', value: 'Markdown', extension: 'md' },
  { label: 'Gradle', value: 'Gradle', extension: 'gradle' },
  { label: 'SQL', value: 'SQL', extension: 'sql' },
  { label: 'YAML', value: 'YAML', extension: 'yml' },
  { label: 'Swift', value: 'Swift', extension: 'swift' },
  { label: 'Dart', value: 'Dart', extension: 'dart' },
  { label: 'Go', value: 'Go', extension: 'go' },
  { label: 'Rust', value: 'Rust', extension: 'rs' },
]

const EXTENSION_BY_LANGUAGE = new Map(
  CODE_LANGUAGE_PRESETS.flatMap((item) => [
    [item.value.toLowerCase(), item.extension],
    [item.label.toLowerCase(), item.extension],
  ]),
)

export function normalizeCodeLanguage(language) {
  const clean = String(language || '').trim()
  if (!clean) return 'Plain Text'
  const lower = clean.toLowerCase()
  if (lower === 'kt') return 'Kotlin'
  if (lower === 'cpp' || lower === 'cxx') return 'C++'
  if (lower === 'js') return 'JavaScript'
  if (lower === 'ts') return 'TypeScript'
  if (lower === 'md') return 'Markdown'
  return clean
}

export function codeLanguageExtension(language) {
  const normalized = normalizeCodeLanguage(language).toLowerCase()
  return EXTENSION_BY_LANGUAGE.get(normalized) || normalized.replace(/[^a-z0-9]+/g, '').slice(0, 8) || 'txt'
}

export function codeFileName(repo) {
  const name = slugify(repo?.name || repo?.id || 'code-snippet')
  return `${name}.${codeLanguageExtension(repo?.language)}`
}

export function codeDownloadHref(repo) {
  return `data:text/plain;charset=utf-8,${encodeURIComponent(formatCodeByLanguage(repo?.snippet || '', repo?.language))}`
}

export function formatCodeByLanguage(source, language) {
  const code = String(source || '').replace(/\r\n?/g, '\n').trim()
  if (!code) return ''
  const normalized = normalizeCodeLanguage(language).toLowerCase()

  if (normalized === 'json') {
    try {
      return JSON.stringify(JSON.parse(code), null, 2)
    } catch {
      return normalizeLines(code)
    }
  }

  if (normalized === 'xml' || normalized === 'html') return formatXml(code)

  if (
    ['c', 'c++', 'java', 'kotlin', 'javascript', 'typescript', 'swift', 'go', 'rust', 'gradle'].includes(normalized)
  ) {
    return formatBracedCode(code)
  }

  return normalizeLines(code)
}

function normalizeLines(code) {
  return code
    .split('\n')
    .map((line) => line.replace(/\s+$/g, ''))
    .join('\n')
}

function formatXml(code) {
  const tokens = code.replace(/>\s*</g, '>\n<').split('\n')
  let level = 0
  return tokens
    .map((token) => {
      const clean = token.trim()
      if (!clean) return ''
      if (/^<\//.test(clean)) level = Math.max(level - 1, 0)
      const line = `${'  '.repeat(level)}${clean}`
      if (/^<[^!?/][^>]*[^/]?>$/.test(clean) && !/^<[^>]+>.*<\/[^>]+>$/.test(clean)) level += 1
      return line
    })
    .filter(Boolean)
    .join('\n')
}

function formatBracedCode(code) {
  let level = 0
  const expanded = code
    .replace(/\{\s*/g, '{\n')
    .replace(/\s*\}/g, '\n}')
    .replace(/;\s*/g, ';\n')
    .replace(/\n{2,}/g, '\n')
  return expanded
    .split('\n')
    .map((line) => {
      const clean = line.trim()
      if (!clean) return ''
      if (clean.startsWith('}')) level = Math.max(level - 1, 0)
      const output = `${'  '.repeat(level)}${clean}`
      if (clean.endsWith('{')) level += 1
      return output
    })
    .filter(Boolean)
    .join('\n')
}

function slugify(value) {
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'code-snippet'
}
