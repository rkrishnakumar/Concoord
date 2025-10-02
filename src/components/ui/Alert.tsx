import { ReactNode } from 'react'
import { colors } from '@/lib/design-system'

interface AlertProps {
  children: ReactNode
  type?: 'success' | 'error' | 'warning' | 'info'
  className?: string
}

export default function Alert({ children, type = 'info', className = '' }: AlertProps) {
  const typeClasses = colors.status[type]
  
  return (
    <div className={`p-4 rounded-md border ${typeClasses} ${className}`}>
      {children}
    </div>
  )
}
