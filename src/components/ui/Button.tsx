import { ReactNode } from 'react'
import Link from 'next/link'
import { colors } from '@/lib/design-system'

interface ButtonProps {
  children: ReactNode
  variant?: 'primary' | 'secondary' | 'black' | 'success' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  disabled?: boolean
  loading?: boolean
  onClick?: () => void
  href?: string
  type?: 'button' | 'submit'
  className?: string
  style?: React.CSSProperties
}

export default function Button({ 
  children, 
  variant = 'primary', 
  size = 'md',
  disabled = false,
  loading = false,
  onClick,
  href,
  type = 'button',
  className = '',
  style
}: ButtonProps) {
  const baseClasses = 'rounded-[2.5rem] font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed h-[2.5rem] flex items-center justify-center'
  const variantClasses = colors.buttons[variant]
  
  const sizeClasses = {
    sm: 'px-3 text-sm',
    md: 'px-4 text-sm', 
    lg: 'px-6 text-base'
  }
  
  const buttonClasses = `${baseClasses} ${variantClasses} ${sizeClasses[size]} ${className}`
  
  if (href) {
    return (
      <Link href={href} className={buttonClasses} style={style}>
        {loading ? 'Loading...' : children}
      </Link>
    )
  }
  
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={buttonClasses}
      style={style}
    >
      {loading ? 'Loading...' : children}
    </button>
  )
}
