import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { initPageTransition } from './pageTransition'
import { initScrollAnimation } from './scrollAnimation'
import { initTextAnimation } from './textAnimation'
import { initCardAnimation } from './cardAnimation'

gsap.registerPlugin(ScrollTrigger)

export function motionProfile() {
  if (typeof window === 'undefined') return { enabled: false, complex: false }
  const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  const disabled = window.localStorage?.getItem('RaMotionDisabled') === '1'
  const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection
  const saveData = Boolean(connection?.saveData)
  const lowMemory = Number(navigator.deviceMemory || 8) <= 4
  const lowCpu = Number(navigator.hardwareConcurrency || 8) <= 4
  const coarsePointer = window.matchMedia?.('(pointer: coarse)').matches

  if (reduce || disabled) return { enabled: false, complex: false }
  return {
    enabled: true,
    complex: !(saveData || lowMemory || lowCpu || coarsePointer),
  }
}

export function initAnimations({ routeKey, root = document } = {}) {
  const profile = motionProfile()
  if (!profile.enabled || typeof window === 'undefined') {
    root?.querySelectorAll?.('[data-animate-text]').forEach((item) => {
      item.style.opacity = '1'
    })
    return () => {}
  }

  const cleanups = [
    initPageTransition({ routeKey, root, profile }),
    initTextAnimation({ root, profile }),
    initScrollAnimation({ root, profile }),
    initCardAnimation({ root, profile }),
    initLazyImageAnimation({ root, profile }),
    initHeroPointer({ root, profile }),
  ].filter(Boolean)

  return () => {
    cleanups.forEach((cleanup) => cleanup?.())
  }
}

function initLazyImageAnimation({ root, profile }) {
  const images = [...(root?.querySelectorAll?.(root?.matches?.('main') ? 'img' : 'main img') || [])]
  const cleanups = []

  images.forEach((image) => {
    image.loading = image.loading || 'lazy'
    image.decoding = image.decoding || 'async'
    image.dataset.animateImage = image.dataset.animateImage || 'true'
    if (image.complete) {
      image.classList.remove('ra-image-pending')
      image.classList.add('ra-image-loaded')
    } else {
      const onLoad = () => {
        image.classList.remove('ra-image-pending')
        image.classList.add('ra-image-loaded')
      }
      image.classList.add('ra-image-pending')
      image.addEventListener('load', onLoad, { once: true })
      cleanups.push(() => image.removeEventListener('load', onLoad))
    }
  })

  if (!profile.complex) return () => cleanups.forEach((cleanup) => cleanup())

  const ctx = gsap.context(() => {
    gsap.fromTo(
      images.filter((image) => image.complete),
      { autoAlpha: 0, filter: 'blur(10px)', y: 18 },
      { autoAlpha: 1, filter: 'blur(0px)', y: 0, duration: 0.7, ease: 'power3.out', stagger: 0.04 },
    )
  }, root)

  return () => {
    cleanups.forEach((cleanup) => cleanup())
    ctx.revert()
  }
}

function initHeroPointer({ root, profile }) {
  if (!profile.complex) return () => {}
  const hero = root?.querySelector?.('[data-hero-motion]')
  if (!hero) return () => {}

  const setX = gsap.quickTo(hero, '--ra-hero-x', { duration: 0.6, ease: 'power3.out' })
  const setY = gsap.quickTo(hero, '--ra-hero-y', { duration: 0.6, ease: 'power3.out' })
  const onMove = (event) => {
    const rect = hero.getBoundingClientRect()
    setX(((event.clientX - rect.left) / rect.width - 0.5).toFixed(3))
    setY(((event.clientY - rect.top) / rect.height - 0.5).toFixed(3))
  }
  const onLeave = () => {
    setX(0)
    setY(0)
  }

  hero.addEventListener('pointermove', onMove)
  hero.addEventListener('pointerleave', onLeave)
  return () => {
    hero.removeEventListener('pointermove', onMove)
    hero.removeEventListener('pointerleave', onLeave)
  }
}
