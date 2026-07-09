export default function ScrollPositionControls({ ariaLabelPrefix = '页面' }) {
  const scrollToPosition = (position) => {
    const page = document.documentElement
    const maxScroll = Math.max(0, page.scrollHeight - window.innerHeight)
    const top =
      position === 'top'
        ? 0
        : position === 'middle'
          ? maxScroll / 2
          : maxScroll

    window.scrollTo({ top, behavior: 'smooth' })
  }

  const controls = [
    { id: 'top', label: '↑', title: '回到顶部' },
    { id: 'middle', label: '中', title: '跳到中部' },
    { id: 'bottom', label: '↓', title: '跳到底部' },
  ]

  return (
    <>
      {['left', 'right'].map((side) => (
        <nav
          key={side}
          className={`article-scroll-controls article-scroll-controls-${side}`}
          aria-label={`${ariaLabelPrefix}${side === 'left' ? '左侧' : '右侧'}快速滚动`}
        >
          {controls.map((control) => (
            <button
              key={control.id}
              type="button"
              title={control.title}
              aria-label={control.title}
              onClick={() => scrollToPosition(control.id)}
            >
              {control.label}
            </button>
          ))}
        </nav>
      ))}
    </>
  )
}
