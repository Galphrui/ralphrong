import { Fragment } from 'react'

function parseInline(text) {
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
    blocks.push({ type: `h${Math.min(Math.max(level, 1), 3)}`, text: clean })
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

export default function MarkdownContent({ content }) {
  const blocks = parseMarkdownBlocks(content)

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

        return (
          <p key={index} className="whitespace-pre-wrap break-words text-base leading-8 text-slate-700">
            {parseInline(block.text)}
          </p>
        )
      })}
    </div>
  )
}
