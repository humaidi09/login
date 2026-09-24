import { useReducedMotion } from 'framer-motion'

// A single tasteful entrance used across pages. When the user prefers reduced
// motion we return no animation props at all, so nothing moves.
export function useEnter(y = 12) {
  const reduce = useReducedMotion()
  if (reduce) return {}
  return {
    initial: { opacity: 0, y },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] },
  }
}

// Staggered container/child pair for lists of cards.
export function useStagger() {
  const reduce = useReducedMotion()
  if (reduce) return { container: {}, item: {} }
  return {
    container: {
      initial: 'hidden',
      animate: 'show',
      variants: { hidden: {}, show: { transition: { staggerChildren: 0.06 } } },
    },
    item: {
      variants: {
        hidden: { opacity: 0, y: 10 },
        show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: [0.22, 1, 0.36, 1] } },
      },
    },
  }
}
