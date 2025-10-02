import { ReactNode } from 'react'
import { colors, spacing } from '@/lib/design-system'

interface CardProps {
  children: ReactNode
  className?: string
  hover?: boolean
}

export default function Card({ children, className = '', hover = false }: CardProps) {
  const baseClasses = spacing.card
  const hoverClasses = hover ? 'hover:shadow-xl transition-shadow' : ''
  
  return (
    <div className={`${baseClasses} ${hoverClasses} ${className}`}>
      {children}
    </div>
  )
}
