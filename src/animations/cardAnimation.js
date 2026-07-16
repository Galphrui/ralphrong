import { gsap } from 'gsap'

export function initCardAnimation({ root, profile }) {
  if (!profile.complex) return () => {}
  const cards = [...(root?.querySelectorAll?.('[data-animate-card]') || [])]
  const cleanups = []

  cards.forEach((card) => {
    const onEnter = () => {
      gsap.to(card, {
        scale: 1.015,
        y: -4,
        rotateX: 0.8,
        boxShadow: '0 22px 60px rgba(15, 23, 42, 0.16)',
        duration: 0.35,
        ease: 'power3.out',
        overwrite: true,
      })
    }
    const onLeave = () => {
      gsap.to(card, {
        scale: 1,
        y: 0,
        rotateX: 0,
        boxShadow: '',
        duration: 0.45,
        ease: 'power3.out',
        overwrite: true,
        clearProps: 'transform,boxShadow',
      })
    }
    card.addEventListener('pointerenter', onEnter)
    card.addEventListener('pointerleave', onLeave)
    cleanups.push(() => {
      card.removeEventListener('pointerenter', onEnter)
      card.removeEventListener('pointerleave', onLeave)
    })
  })

  return () => cleanups.forEach((cleanup) => cleanup())
}
