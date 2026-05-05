import { Variants, Transition } from 'framer-motion'

// ============================================
// EASING CURVES
// ============================================

export const easings = {
  smooth: [0.4, 0, 0.2, 1],
  bounce: [0.68, -0.55, 0.265, 1.55],
  spring: [0.175, 0.885, 0.32, 1.275],
  snappy: [0.25, 0.46, 0.45, 0.94],
  gentle: [0.33, 1, 0.68, 1],
} as const

// ============================================
// TRANSITIONS
// ============================================

export const transitions = {
  fast: {
    duration: 0.2,
    ease: easings.smooth,
  },
  medium: {
    duration: 0.3,
    ease: easings.smooth,
  },
  slow: {
    duration: 0.5,
    ease: easings.smooth,
  },
  spring: {
    type: 'spring',
    stiffness: 300,
    damping: 30,
  },
  springBouncy: {
    type: 'spring',
    stiffness: 400,
    damping: 20,
  },
  springGentle: {
    type: 'spring',
    stiffness: 200,
    damping: 25,
  },
} as const

// ============================================
// VARIANTS
// ============================================

// Fade animations
export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: { 
    opacity: 1,
    transition: transitions.medium,
  },
}

export const fadeInUp: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: transitions.medium,
  },
}

export const fadeInDown: Variants = {
  hidden: { opacity: 0, y: -20 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: transitions.medium,
  },
}

export const fadeInScale: Variants = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: { 
    opacity: 1, 
    scale: 1,
    transition: transitions.spring,
  },
}

// Slide animations
export const slideInRight: Variants = {
  hidden: { opacity: 0, x: 30 },
  visible: { 
    opacity: 1, 
    x: 0,
    transition: transitions.medium,
  },
}

export const slideInLeft: Variants = {
  hidden: { opacity: 0, x: -30 },
  visible: { 
    opacity: 1, 
    x: 0,
    transition: transitions.medium,
  },
}

// Scale animations
export const scaleIn: Variants = {
  hidden: { scale: 0.8, opacity: 0 },
  visible: { 
    scale: 1, 
    opacity: 1,
    transition: transitions.springBouncy,
  },
}

export const scaleInCenter: Variants = {
  hidden: { scale: 0, opacity: 0 },
  visible: { 
    scale: 1, 
    opacity: 1,
    transition: transitions.spring,
  },
}

// Stagger container
export const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.05,
    },
  },
}

export const staggerContainerFast: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.02,
    },
  },
}

// Stagger item
export const staggerItem: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: transitions.medium,
  },
}

// Upload preview transition
export const uploadPreview: Variants = {
  hidden: { 
    opacity: 0, 
    scale: 0.8,
    rotateX: -15,
  },
  visible: { 
    opacity: 1, 
    scale: 1,
    rotateX: 0,
    transition: {
      ...transitions.spring,
      duration: 0.6,
    },
  },
  exit: {
    opacity: 0,
    scale: 0.9,
    y: -20,
    transition: transitions.fast,
  },
}

// Button press
export const buttonPress: Variants = {
  rest: { scale: 1 },
  hover: { 
    scale: 1.02,
    y: -2,
    transition: transitions.fast,
  },
  tap: { 
    scale: 0.98,
    y: 0,
    transition: transitions.fast,
  },
}

// Card hover
export const cardHover: Variants = {
  rest: { 
    scale: 1,
    y: 0,
  },
  hover: { 
    scale: 1.02,
    y: -4,
    transition: transitions.medium,
  },
}

// Image zoom
export const imageZoom: Variants = {
  rest: { scale: 1 },
  hover: { 
    scale: 1.1,
    transition: {
      duration: 0.5,
      ease: easings.smooth,
    },
  },
}

// Progress bar
export const progressBar: Variants = {
  hidden: { width: '0%' },
  visible: (progress: number) => ({
    width: `${progress}%`,
    transition: {
      duration: 0.5,
      ease: easings.smooth,
    },
  }),
}

// Shimmer effect
export const shimmer = {
  animate: {
    x: ['0%', '100%'],
    transition: {
      duration: 2,
      repeat: Infinity,
      ease: 'linear',
      repeatDelay: 1,
    },
  },
}

// Pulse effect
export const pulse = {
  animate: {
    scale: [1, 1.05, 1],
    opacity: [1, 0.8, 1],
    transition: {
      duration: 2,
      repeat: Infinity,
      ease: easings.smooth,
    },
  },
}

// Glow effect
export const glow = {
  animate: {
    opacity: [0.5, 0.8, 0.5],
    scale: [1, 1.05, 1],
    transition: {
      duration: 2,
      repeat: Infinity,
      ease: 'easeInOut',
    },
  },
}

// Spin effect
export const spin = {
  animate: {
    rotate: [0, 360],
    transition: {
      duration: 2,
      repeat: Infinity,
      ease: 'linear',
    },
  },
}

// Float effect
export const float = {
  animate: {
    y: [0, -10, 0],
    transition: {
      duration: 3,
      repeat: Infinity,
      ease: easings.gentle,
    },
  },
}

// Ripple effect (for button clicks)
export const ripple = {
  initial: { scale: 0, opacity: 1 },
  animate: { 
    scale: 4, 
    opacity: 0,
    transition: {
      duration: 0.6,
      ease: easings.smooth,
    },
  },
}

// Modal backdrop
export const modalBackdrop: Variants = {
  hidden: { opacity: 0 },
  visible: { 
    opacity: 1,
    transition: transitions.fast,
  },
}

// Modal content
export const modalContent: Variants = {
  hidden: { 
    opacity: 0, 
    scale: 0.95,
    y: 20,
  },
  visible: { 
    opacity: 1, 
    scale: 1,
    y: 0,
    transition: transitions.spring,
  },
}

// Toast notification
export const toast: Variants = {
  hidden: { 
    opacity: 0, 
    y: -20,
    scale: 0.95,
  },
  visible: { 
    opacity: 1, 
    y: 0,
    scale: 1,
    transition: transitions.springBouncy,
  },
  exit: {
    opacity: 0,
    y: -20,
    scale: 0.95,
    transition: transitions.fast,
  },
}

// Loading dots
export const loadingDots = {
  animate: {
    scale: [1, 1.5, 1],
    opacity: [0.3, 1, 0.3],
  },
}

// ============================================
// GESTURE ANIMATIONS
// ============================================

export const tapAnimation = {
  scale: 0.95,
  transition: transitions.fast,
}

export const hoverAnimation = {
  scale: 1.02,
  y: -2,
  transition: transitions.fast,
}

export const dragAnimation = {
  scale: 1.05,
  rotate: 5,
  transition: transitions.fast,
}

// ============================================
// LAYOUT ANIMATIONS
// ============================================

export const layoutTransition: Transition = {
  type: 'spring',
  stiffness: 300,
  damping: 30,
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

export const getStaggerDelay = (index: number, baseDelay: number = 0.05): number => {
  return index * baseDelay
}

export const createStaggerVariants = (
  staggerDelay: number = 0.1,
  childDelay: number = 0.05
): Variants => ({
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: staggerDelay,
      delayChildren: childDelay,
    },
  },
})

export const createFadeInVariant = (
  direction: 'up' | 'down' | 'left' | 'right' | 'none' = 'up',
  distance: number = 20
): Variants => {
  const getInitialPosition = () => {
    switch (direction) {
      case 'up': return { y: distance }
      case 'down': return { y: -distance }
      case 'left': return { x: distance }
      case 'right': return { x: -distance }
      case 'none': return {}
    }
  }

  return {
    hidden: { 
      opacity: 0, 
      ...getInitialPosition(),
    },
    visible: { 
      opacity: 1, 
      x: 0,
      y: 0,
      transition: transitions.medium,
    },
  }
}
