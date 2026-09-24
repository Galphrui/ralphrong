import { useLayoutEffect, useRef } from 'react'
import { animate, createLayout } from 'animejs'
import { plainTextFromMarkdown } from '../utils/listing'

const motionDuration = () => (window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 620)

export default function ArticlePreviewDialog({ post, sourceElement, onClose, onRead }) {
  const dialogRef = useRef(null)
  const layoutRef = useRef(null)
  const closingRef = useRef(false)

  useLayoutEffect(() => {
    const dialog = dialogRef.current
    const root = dialog?.closest('#posts')
    if (!dialog || !root || !sourceElement) return undefined

    const duration = motionDuration()
    const layout = createLayout(root, {
      children: ['.ra-layout-card', '.ra-layout-title', '.ra-layout-summary', '.ra-layout-tags'],
      duration,
      ease: 'out(4)',
    })
    layoutRef.current = layout
    layout.update(() => {
      dialog.showModal()
      sourceElement.classList.add('is-open')
      document.body.classList.add('ra-dialog-open')
    })
    animate(dialog, {
      '--ra-modal-overlay': [0, 0.82],
      duration,
      ease: 'out(3)',
    })

    return () => {
      document.body.classList.remove('ra-dialog-open')
      sourceElement.classList.remove('is-open')
      layout.revert()
    }
  }, [sourceElement])

  const close = (afterClose) => {
    const dialog = dialogRef.current
    if (!dialog || closingRef.current) return
    closingRef.current = true
    const duration = motionDuration()
    animate(dialog, {
      '--ra-modal-overlay': 0,
      duration: Math.min(duration, 420),
      ease: 'in(3)',
    })
    layoutRef.current?.update(
      () => {
        sourceElement?.classList.remove('is-open')
        dialog.close()
        document.body.classList.remove('ra-dialog-open')
      },
      {
        duration,
        ease: 'inOut(4)',
        onComplete: () => {
          sourceElement?.focus({ preventScroll: true })
          onClose()
          afterClose?.()
        },
      },
    )
  }

  const excerpt = plainTextFromMarkdown(post.content || post.summary).slice(0, 520)
  const layoutId = `article-${post.slug}`

  return (
    <dialog
      ref={dialogRef}
      className="ra-article-dialog"
      aria-labelledby="ra-dialog-title"
      onCancel={(event) => {
        event.preventDefault()
        close()
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) close()
      }}
    >
      <article className="ra-layout-card ra-dialog-card" data-layout-id={layoutId}>
        <header className="ra-dialog-header">
          <div>
            <p className="ra-dialog-kicker">Article preview · {post.date}</p>
            <h2 id="ra-dialog-title" className="ra-layout-title ra-dialog-title" data-layout-id={`${layoutId}-title`}>
              {post.title}
            </h2>
          </div>
          <button type="button" className="ra-dialog-close" onClick={() => close()} aria-label="关闭详情弹窗">
            <span aria-hidden="true">×</span>
          </button>
        </header>

        <p className="ra-layout-summary ra-dialog-summary" data-layout-id={`${layoutId}-summary`}>
          {post.summary}
        </p>
        <div className="ra-layout-tags ra-dialog-tags" data-layout-id={`${layoutId}-tags`}>
          {post.tags?.map((tag) => <span key={tag}>{tag}</span>)}
        </div>
        <div className="ra-dialog-body">
          <p>{excerpt}{String(post.content || '').length > excerpt.length ? '…' : ''}</p>
        </div>
        <footer className="ra-dialog-footer">
          <span>{post.readingMinutes || 3} 分钟阅读</span>
          <div>
            <button type="button" className="ra-dialog-secondary" onClick={() => close()}>继续浏览</button>
            <button type="button" className="ra-dialog-primary" onClick={() => close(onRead)}>阅读完整文章 <span aria-hidden="true">↗</span></button>
          </div>
        </footer>
      </article>
    </dialog>
  )
}
