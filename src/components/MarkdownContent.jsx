import { Fragment } from 'react'

function parseTokenAttributes(value = '') {
  const attrs = {}
  String(value).replace(/([a-zA-Z]+)="([^"]*)"/g, (_, key, attrValue) => {
    attrs[key] = attrValue.replace(/&quot;/g, '"')
    return ''
  })
  return attrs
}

function isSafeColor(value) {
  return /^#[0-9a-fA-F]{3,8}$/.test(String(value || ''))
}

function sanitizeRichHtml(html) {
  if (typeof document === 'undefined') return String(html || '')
  const template = document.createElement('template')
  template.innerHTML = String(html || '')
  template.content.querySelectorAll('script, iframe, object, embed, style').forEach((node) => node.remove())
  template.content.querySelectorAll('*').forEach((node) => {
    ;[...node.attributes].forEach((attr) => {
      const name = attr.name.toLowerCase()
      const value = attr.value || ''
      if (name.startsWith('on')) node.removeAttribute(attr.name)
      if ((name === 'href' || name === 'src') && !/^(https?:|data:image\/|data:application\/|#|\.\/|\/)/i.test(value)) {
        node.removeAttribute(attr.name)
      }
    })
  })
  return template.innerHTML
}

function parseBasicInline(text) {
  const parts = String(text).split(/(`[^`]+`|\*\*[^*]+\*\*)/g)
  return parts.map((part, index) => {
    if (part.startsWith('`') && part.endsWith('`')) {
      return (
        <code key={index} className="bg-primary-50 px-1.5 py-0.5 text-primary-700">
          {part.slice(1, -1)}
        </code>
      )
    }
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={index} className="font-black text-slate-900">
          {part.slice(2, -2)}
        </strong>
      )
    }
    return <Fragment key={index}>{part}</Fragment>
  })
}

function parseInline(text) {
  const source = String(text || '')
  const richPattern = /\[\[ra-style\s+([^\]]+)\]\]([\s\S]*?)\[\[\/ra-style\]\]/g
  const nodes = []
  let lastIndex = 0
  let key = 0

  for (const match of source.matchAll(richPattern)) {
    if (match.index > lastIndex) {
      nodes.push(<Fragment key={`t-${key++}`}>{parseBasicInline(source.slice(lastIndex, match.index))}</Fragment>)
    }
    const attrs = parseTokenAttributes(match[1])
    const style = {}
    if (attrs.size) style.fontSize = `${Number(attrs.size) || 16}px`
    if (isSafeColor(attrs.color)) style.color = attrs.color
    if (isSafeColor(attrs.bg)) style.backgroundColor = attrs.bg
    if (attrs.font) style.fontFamily = attrs.font
    if (attrs.underline === '1') style.textDecoration = 'underline'
    nodes.push(
      <span key={`r-${key++}`} className="rounded px-0.5" style={style}>
        {parseBasicInline(match[2])}
      </span>,
    )
    lastIndex = match.index + match[0].length
  }

  if (lastIndex < source.length) {
    nodes.push(<Fragment key={`t-${key++}`}>{parseBasicInline(source.slice(lastIndex))}</Fragment>)
  }
  return nodes
}

export function parseMarkdownBlocks(content) {
  const lines = String(content || '').replace(/\r\n?/g, '\n').split('\n')
  const blocks = []
  let paragraph = []
  let listItems = []
  let codeLines = []
  let isCode = false

  const flushParagraph = () => {
    if (!paragraph.length) return
    blocks.push({ type: 'p', text: paragraph.join('\n') })
    paragraph = []
  }

  const flushList = () => {
    if (!listItems.length) return
    blocks.push({ type: 'ul', items: listItems })
    listItems = []
  }

  const pushHeading = (level, text) => {
    const clean = String(text || '').trim()
    if (!clean) return
    blocks.push({ type: `h${Math.min(Math.max(level, 1), 6)}`, text: clean })
  }

  lines.forEach((line) => {
    const trimmed = line.trim()

    if (trimmed.startsWith('```')) {
      if (isCode) {
        blocks.push({ type: 'code', text: codeLines.join('\n') })
        codeLines = []
        isCode = false
      } else {
        flushParagraph()
        flushList()
        isCode = true
      }
      return
    }

    if (isCode) {
      codeLines.push(line)
      return
    }

    const setextMatch = trimmed.match(/^(=+|-+)$/)
    if (setextMatch) {
      flushList()
      if (paragraph.length) {
        pushHeading(setextMatch[1][0] === '=' ? 1 : 2, paragraph.join(' '))
        paragraph = []
      } else if (trimmed.length >= 3) {
        blocks.push({ type: 'hr' })
      }
      return
    }

    if (!trimmed) {
      flushParagraph()
      flushList()
      return
    }

    const imageMatch = trimmed.match(/^\[\[ra-image\s+(.+)\]\]$/)
    if (imageMatch) {
      flushParagraph()
      flushList()
      blocks.push({ type: 'image', ...parseTokenAttributes(imageMatch[1]) })
      return
    }

    const attachmentMatch = trimmed.match(/^\[\[ra-attachment:([^\]]+)\]\]$/)
    if (attachmentMatch) {
      flushParagraph()
      flushList()
      blocks.push({ type: 'attachment', id: attachmentMatch[1].trim() })
      return
    }

    const atxMatch = trimmed.match(/^(#{1,6})\s+(.+)$/)
    if (atxMatch) {
      flushParagraph()
      flushList()
      pushHeading(atxMatch[1].length, atxMatch[2].replace(/\s+#+$/, ''))
      return
    }

    if (/^[-*+]\s+/.test(trimmed)) {
      flushParagraph()
      listItems.push(trimmed.replace(/^[-*+]\s+/, ''))
      return
    }

    paragraph.push(trimmed)
  })

  flushParagraph()
  flushList()
  if (codeLines.length) blocks.push({ type: 'code', text: codeLines.join('\n') })

  return blocks
}

export default function MarkdownContent({ content, attachments = [], mode = 'markdown' }) {
  if (mode === 'plain') {
    return <p className="whitespace-pre-wrap break-words text-base leading-8 text-slate-700">{content}</p>
  }

  if (mode === 'rich') {
    return (
      <div
        className="space-y-6 break-words text-base leading-8 text-slate-700 [&_a]:text-primary-700 [&_img]:max-w-full [&_img]:border [&_img]:border-slate-200 [&_pre]:overflow-x-auto [&_pre]:border [&_pre]:border-slate-800 [&_pre]:bg-slate-950 [&_pre]:p-5 [&_pre]:text-sm [&_pre]:leading-7 [&_pre]:text-slate-100"
        dangerouslySetInnerHTML={{ __html: sanitizeRichHtml(content) }}
      />
    )
  }

  const blocks = parseMarkdownBlocks(content)
  const attachmentMap = new Map((attachments || []).map((item) => [item.id, item]))

  return (
    <div className="space-y-6">
      {blocks.map((block, index) => {
        if (block.type === 'h1') {
          return (
            <h2 key={index} className="border-b border-slate-200 pb-3 pt-5 text-3xl font-black leading-tight text-slate-950">
              {parseInline(block.text)}
            </h2>
          )
        }

        if (block.type === 'h2') {
          return (
            <h2 key={index} className="border-b border-slate-200 pb-2 pt-4 text-2xl font-black leading-tight text-slate-950">
              {parseInline(block.text)}
            </h2>
          )
        }

        if (block.type === 'h3') {
          return (
            <h3 key={index} className="pt-3 text-xl font-black leading-tight text-slate-950">
              {parseInline(block.text)}
            </h3>
          )
        }

        if (['h4', 'h5', 'h6'].includes(block.type)) {
          return (
            <h3 key={index} className="pt-2 text-lg font-black leading-tight text-slate-950">
              {parseInline(block.text)}
            </h3>
          )
        }

        if (block.type === 'hr') {
          return <hr key={index} className="border-slate-200" />
        }

        if (block.type === 'ul') {
          return (
            <ul key={index} className="list-disc space-y-2 pl-6 text-slate-700">
              {block.items.map((item) => (
                <li key={item} className="leading-8">
                  {parseInline(item)}
                </li>
              ))}
            </ul>
          )
        }

        if (block.type === 'code') {
          return (
            <pre
              key={index}
              className="overflow-x-auto border border-slate-800 bg-slate-950 p-5 text-sm leading-7 text-slate-100"
            >
              <code>{block.text}</code>
            </pre>
          )
        }

        if (block.type === 'image') {
          return (
            <img
              key={index}
              src={block.src}
              alt={block.alt || '插入图片'}
              className="max-w-full border border-slate-200"
            />
          )
        }

        if (block.type === 'attachment') {
          const item = attachmentMap.get(block.id)
          return (
            <a
              key={index}
              href={item?.dataUrl || '#'}
              download={item?.fileName || item?.name || 'attachment'}
              className="flex items-center justify-between gap-4 border border-blue-200 bg-blue-50 p-4 text-slate-900 no-underline"
            >
              <span>
                <strong className="block font-black">{item?.name || item?.fileName || `附件不存在：${block.id}`}</strong>
                {item && <small className="mt-1 block text-sm text-slate-500">{[item.fileName, item.size ? `${Math.ceil(item.size / 1024)} KB` : ''].filter(Boolean).join(' · ')}</small>}
              </span>
              {item && <strong className="text-sm text-primary-700">下载</strong>}
            </a>
          )
        }

        return (
          <p key={index} className="whitespace-pre-wrap break-words text-base leading-8 text-slate-700">
            {parseInline(block.text)}
          </p>
        )
      })}
    </div>
  )
}
