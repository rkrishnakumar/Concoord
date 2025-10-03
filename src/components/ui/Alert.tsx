import { ReactNode } from 'react'
import { colors } from '@/lib/design-system'

interface AlertProps {
  children: ReactNode
  type?: 'success' | 'error' | 'warning' | 'info'
  className?: string
}

export default function Alert({ children, type = 'info', className = '' }: AlertProps) {
  const typeClasses = {
    success: 'bg-green-50 border-green-200 text-green-800',
    error: 'bg-red-50 border-red-200 text-red-800', 
    warning: 'bg-yellow-50 border-yellow-200 text-yellow-800',
    info: 'bg-blue-50 border-blue-200 text-blue-800',
  }[type]
  
  return (
    <div className={`p-4 rounded-md border ${typeClasses} ${className}`}>
      {children}
    </div>
  )
}
