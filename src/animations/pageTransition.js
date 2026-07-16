import { gsap } from 'gsap'

export function initPageTransition({ root, profile }) {
  if (!profile.enabled) return () => {}
  const shell = root?.matches?.('[data-route-shell]') ? root : root?.querySelector?.('[data-route-shell]')
  if (!shell) return () => {}

  const ctx = gsap.context(() => {
    gsap.fromTo(
      shell,
      { autoAlpha: 0, y: 42, filter: 'blur(10px)' },
      {
        autoAlpha: 1,
        y: 0,
        filter: 'blur(0px)',
        duration: profile.complex ? 0.8 : 0.35,
        ease: 'power3.out',
        clearProps: 'transform,filter,opacity,visibility',
      },
    )
  }, shell)

  return () => ctx.revert()
}
