import { gsap } from 'gsap'

export function initTextAnimation({ root, profile }) {
  if (!profile.complex) return () => {}
  const elements = [...(root?.querySelectorAll?.('[data-animate-text]') || [])].filter((item) => !item.dataset.textAnimated)
  if (!elements.length) return () => {}

  elements.forEach(splitTextNode)

  const ctx = gsap.context(() => {
    elements.forEach((element) => {
      const chars = element.querySelectorAll('[data-char]')
      gsap.fromTo(
        chars,
        { autoAlpha: 0, yPercent: 90, filter: 'blur(8px)' },
        {
          autoAlpha: 1,
          yPercent: 0,
          filter: 'blur(0px)',
          duration: 0.6,
          ease: 'power3.out',
          stagger: 0.025,
          delay: Number(element.dataset.animateDelay || 0),
        },
      )
    })
  }, root)

  return () => ctx.revert()
}

function splitTextNode(element) {
  const text = element.textContent || ''
  if (!text.trim()) return
  element.dataset.textAnimated = '1'
  element.setAttribute('aria-label', text)
  element.textContent = ''
  const wrapper = document.createElement('span')
  wrapper.setAttribute('aria-hidden', 'true')
  wrapper.className = 'ra-split-text'
  Array.from(text).forEach((char) => {
    const span = document.createElement('span')
    span.dataset.char = char === ' ' ? 'space' : char
    span.textContent = char
    span.className = 'ra-split-char'
    wrapper.appendChild(span)
  })
  element.appendChild(wrapper)
}
