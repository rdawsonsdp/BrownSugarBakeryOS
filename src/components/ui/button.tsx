'use client'

import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils/cn'

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.97]',
  {
    variants: {
      variant: {
        primary: 'bg-brown text-cream hover:bg-brown-light shadow-md hover:shadow-lg',
        secondary: 'bg-cream-dark text-brown hover:bg-cream border border-brown/10',
        danger: 'bg-red text-white hover:bg-red-light shadow-md',
        ghost: 'text-brown hover:bg-brown/5',
        gold: 'bg-gold text-white hover:bg-gold-light shadow-md',
      },
      size: {
        sm: 'h-9 px-3 text-sm rounded-lg',
        default: 'h-11 px-5 text-base',
        lg: 'h-14 px-8 text-lg',
        xl: 'h-[82px] w-[82px] text-2xl rounded-2xl',
        icon: 'h-11 w-11',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'default',
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => (
    <button
      className={cn(buttonVariants({ variant, size, className }))}
      ref={ref}
      {...props}
    />
  )
)
Button.displayName = 'Button'

export { Button, buttonVariants }
