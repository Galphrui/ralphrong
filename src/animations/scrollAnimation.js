import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

export function initScrollAnimation({ root, profile }) {
  if (!profile.complex) return () => {}
  const sections = [...(root?.querySelectorAll?.('[data-animate-section]') || [])]
  const cards = [...(root?.querySelectorAll?.('[data-animate-card]') || [])]
  const images = [...(root?.querySelectorAll?.('[data-animate-image]') || [])]
  const targets = [...sections, ...cards, ...images]
  if (!targets.length) return () => {}

  const ctx = gsap.context(() => {
    gsap.set(targets, { autoAlpha: 0, y: 54, willChange: 'transform, opacity' })
    ScrollTrigger.batch(targets, {
      start: 'top 88%',
      once: true,
      onEnter: (batch) => {
        gsap.to(batch, {
          autoAlpha: 1,
          y: 0,
          duration: 0.72,
          ease: 'power3.out',
          stagger: 0.08,
          clearProps: 'willChange,transform,opacity,visibility',
        })
      },
    })
  }, root)

  return () => {
    ctx.revert()
    ScrollTrigger.getAll().forEach((trigger) => {
      if (targets.includes(trigger.trigger)) trigger.kill()
    })
  }
}
