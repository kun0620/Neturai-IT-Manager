import type { Transition, Variants } from 'motion/react';

export const MOTION_PRESET = {
  duration: {
    fast: 0.18,
    base: 0.28,
    slow: 0.4,
  },
  y: 12,
  hoverScale: 1.02,
} as const;

const easeOutCubic: Transition['ease'] = [0.22, 1, 0.36, 1];

export const appMotionTransition: Transition = {
  duration: MOTION_PRESET.duration.base,
  ease: easeOutCubic,
};

function prefersReducedMotion() {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function createFadeSlideUp(delay = 0, y = MOTION_PRESET.y) {
  const reduced = prefersReducedMotion();

  return {
    initial: reduced ? { opacity: 1, y: 0 } : { opacity: 0, y },
    animate: { opacity: 1, y: 0 },
    transition: {
      duration: reduced ? 0 : MOTION_PRESET.duration.slow,
      ease: easeOutCubic,
      delay: reduced ? 0 : delay,
    },
  };
}

export const cardRevealVariants: Variants = {
  hidden: prefersReducedMotion() ? { opacity: 1, y: 0 } : { opacity: 0, y: MOTION_PRESET.y },
  visible: (index: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: {
      duration: prefersReducedMotion() ? 0 : MOTION_PRESET.duration.base,
      ease: easeOutCubic,
      delay: prefersReducedMotion() ? 0 : index * 0.04,
    },
  }),
};

export const hoverLift = prefersReducedMotion()
  ? undefined
  : { scale: MOTION_PRESET.hoverScale };
