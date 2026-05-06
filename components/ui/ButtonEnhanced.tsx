'use client'

import { type ComponentPropsWithoutRef, forwardRef, type MouseEvent, type ReactNode, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { buttonPress, ripple as rippleVariants } from '@/lib/animations'

type MotionButtonProps = ComponentPropsWithoutRef<typeof motion.button>

interface ButtonProps extends Omit<MotionButtonProps, 'children'> {
  variant?: 'primary' | 'secondary' | 'accent' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  isLoading?: boolean
  icon?: ReactNode
  showRipple?: boolean
  children?: ReactNode
}

interface RippleType {
  x: number
  y: number
  id: number
}

const ButtonEnhanced = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ 
    children, 
    variant = 'primary', 
    size = 'md', 
    isLoading = false,
    icon,
    disabled,
    className = '',
    showRipple = true,
    onClick,
    ...props 
  }, ref) => {
    const [ripples, setRipples] = useState<RippleType[]>([])

    const baseStyles = 'relative inline-flex items-center justify-center font-semibold rounded-lg transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 overflow-hidden'
    
    const variants = {
      primary: 'bg-primary-600 text-white hover:bg-primary-700 focus:ring-primary-500 shadow-soft hover:shadow-primary',
      secondary: 'bg-neutral-0 text-neutral-900 border-2 border-neutral-300 hover:border-neutral-400 hover:bg-neutral-50 focus:ring-neutral-500',
      accent: 'bg-gradient-to-r from-accent-600 to-accent-500 text-white hover:shadow-accent focus:ring-accent-500 shadow-soft',
      ghost: 'bg-transparent text-neutral-700 hover:bg-neutral-100 hover:text-neutral-900 focus:ring-neutral-500'
    }
    
    const sizes = {
      sm: 'px-3 py-1.5 text-sm gap-1.5',
      md: 'px-4 py-2.5 text-base gap-2',
      lg: 'px-6 py-3.5 text-lg gap-2.5'
    }

    const handleClick = (e: MouseEvent<HTMLButtonElement>) => {
      if (showRipple && !disabled && !isLoading) {
        const rect = e.currentTarget.getBoundingClientRect()
        const x = e.clientX - rect.left
        const y = e.clientY - rect.top
        const newRipple = { x, y, id: Date.now() }
        
        setRipples(prev => [...prev, newRipple])
        
        // Remove ripple after animation
        setTimeout(() => {
          setRipples(prev => prev.filter(r => r.id !== newRipple.id))
        }, 600)
      }
      
      onClick?.(e)
    }

    return (
      <motion.button
        ref={ref}
        variants={buttonPress}
        initial="rest"
        whileHover={!disabled && !isLoading ? "hover" : "rest"}
        whileTap={!disabled && !isLoading ? "tap" : "rest"}
        disabled={disabled || isLoading}
        onClick={handleClick}
        className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
        {...props}
      >
        {/* Ripple effects */}
        <AnimatePresence>
          {ripples.map((ripple) => (
            <motion.span
              key={ripple.id}
              variants={rippleVariants}
              initial="initial"
              animate="animate"
              exit={{ opacity: 0 }}
              className="absolute rounded-full bg-white/30 pointer-events-none"
              style={{
                left: ripple.x,
                top: ripple.y,
                width: 20,
                height: 20,
                marginLeft: -10,
                marginTop: -10,
              }}
            />
          ))}
        </AnimatePresence>

        {/* Button content */}
        <span className="relative z-10 flex items-center justify-center gap-2">
          {isLoading ? (
            <>
              <motion.svg 
                className="w-5 h-5"
                fill="none" 
                viewBox="0 0 24 24"
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              >
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </motion.svg>
              <span>Loading...</span>
            </>
          ) : (
            <>
              {icon && (
                <motion.span
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: 'spring', stiffness: 500 }}
                >
                  {icon}
                </motion.span>
              )}
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.05 }}
              >
                {children}
              </motion.span>
            </>
          )}
        </span>
      </motion.button>
    )
  }
)

ButtonEnhanced.displayName = 'ButtonEnhanced'

export default ButtonEnhanced
