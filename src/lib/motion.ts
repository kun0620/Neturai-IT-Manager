import type { Transition, Variants } from 'motion/react';

const easeOut: Transition['ease'] = 'easeOut';

export const MOTION_DURATION = 0.4;
export const MOTION_Y = 12;

function prefersReducedMotion() {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function createFadeSlideUp(delay = 0, y = MOTION_Y) {
  const reduced = prefersReducedMotion();

  return {
    initial: reduced ? { opacity: 1, y: 0 } : { opacity: 0, y },
    animate: { opacity: 1, y: 0 },
    transition: {
      duration: reduced ? 0 : MOTION_DURATION,
      ease: easeOut,
      delay: reduced ? 0 : delay,
    },
  };
}

export const cardRevealVariants: Variants = {
  hidden: prefersReducedMotion() ? { opacity: 1, y: 0 } : { opacity: 0, y: MOTION_Y },
  visible: (index: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: {
      duration: prefersReducedMotion() ? 0 : 0.35,
      ease: easeOut,
      delay: prefersReducedMotion() ? 0 : index * 0.04,
    },
  }),
};

export const hoverLift = prefersReducedMotion() ? undefined : { scale: 1.02 };
