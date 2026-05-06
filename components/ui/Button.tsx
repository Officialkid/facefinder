'use client'

import { type ComponentPropsWithoutRef, forwardRef, type ReactNode } from 'react'
import { motion } from 'framer-motion'

type MotionButtonProps = ComponentPropsWithoutRef<typeof motion.button>

interface ButtonProps extends Omit<MotionButtonProps, 'children'> {
  variant?: 'primary' | 'secondary' | 'accent' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  isLoading?: boolean
  icon?: ReactNode
  children?: ReactNode
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ 
    children, 
    variant = 'primary', 
    size = 'md', 
    isLoading = false,
    icon,
    disabled,
    className = '',
    ...props 
  }, ref) => {
    const baseStyles = 'inline-flex items-center justify-center font-semibold rounded-lg transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60'
    
    const variants = {
      primary: 'bg-primary-600 text-white hover:bg-primary-700 focus:ring-primary-500 shadow-soft hover:shadow-primary hover:-translate-y-0.5',
      secondary: 'bg-neutral-0 text-neutral-900 border-2 border-neutral-300 hover:border-neutral-400 hover:bg-neutral-50 focus:ring-neutral-500',
      accent: 'bg-gradient-to-r from-accent-600 to-accent-500 text-white hover:shadow-accent focus:ring-accent-500 shadow-soft hover:-translate-y-0.5',
      ghost: 'bg-transparent text-neutral-700 hover:bg-neutral-100 hover:text-neutral-900 focus:ring-neutral-500'
    }
    
    const sizes = {
      sm: 'px-3 py-1.5 text-sm gap-1.5',
      md: 'px-4 py-2.5 text-base gap-2',
      lg: 'px-6 py-3.5 text-lg gap-2.5'
    }

    return (
      <motion.button
        ref={ref}
        whileHover={!disabled && !isLoading ? { scale: 1.02 } : {}}
        whileTap={!disabled && !isLoading ? { scale: 0.98 } : {}}
        disabled={disabled || isLoading}
        className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
        {...props}
      >
        {isLoading ? (
          <>
            <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <span>Loading...</span>
          </>
        ) : (
          <>
            {icon && <span>{icon}</span>}
            {children}
          </>
        )}
      </motion.button>
    )
  }
)

Button.displayName = 'Button'

export default Button
