import { ReactNode } from 'react'
import Navigation from '@/components/Navigation'
import { spacing } from '@/lib/design-system'

interface PageLayoutProps {
  children: ReactNode
  title?: string
  description?: string
  className?: string
}

export default function PageLayout({ 
  children, 
  title, 
  description, 
  className = '' 
}: PageLayoutProps) {
  return (
    <div className={`${spacing.page} ${className}`}>
      <Navigation />
      <div className="flex items-start justify-center pt-16 min-h-[calc(100vh-4rem)]">
        <div className={`${spacing.container} w-full`}>
          {(title || description) && (
            <div className="mb-8 text-center">
              {title && <h1 className="text-3xl font-bold text-gray-800">{title}</h1>}
              {description && <p className="mt-2 text-gray-700">{description}</p>}
            </div>
          )}
          {children}
        </div>
      </div>
    </div>
  )
}
