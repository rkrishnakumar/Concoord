import { ReactNode } from 'react'
import { colors } from '@/lib/design-system'

interface AlertProps {
  children: ReactNode
  type?: 'success' | 'error' | 'warning' | 'info'
  className?: string
}

export default function Alert({ children, type = 'info', className = '' }: AlertProps) {
  const typeClasses = {
    success: 'bg-green-900 text-green-200',
    error: 'bg-red-900 text-red-200', 
    warning: 'bg-yellow-50 border-yellow-200 text-yellow-800',
    info: 'bg-blue-900 text-blue-200',
  }[type]
  
  return (
    <div className={`p-4 rounded-md border ${typeClasses} ${className}`}>
      {children}
    </div>
  )
}
