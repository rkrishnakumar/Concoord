import Image from 'next/image'

interface LogoProps {
  size?: 'sm' | 'md' | 'lg'
  showText?: boolean
  className?: string
}

export default function Logo({ size = 'md', showText = true, className = '' }: LogoProps) {
  const sizeClasses = {
    sm: 'h-8 w-8',
    md: 'h-12 w-12', 
    lg: 'h-14 w-14'
  }

  const textSizes = {
    sm: 'text-lg',
    md: 'text-xl',
    lg: 'text-3xl'
  }

  return (
    <div className={`flex items-center ${className}`}>
      <div className={`${sizeClasses[size]} mr-3`}>
        <Image
          src="/concoord-logo.png"
          alt="Concoord Logo"
          width={size === 'sm' ? 32 : size === 'md' ? 48 : 56}
          height={size === 'sm' ? 32 : size === 'md' ? 48 : 56}
          className="w-full h-full object-contain"
        />
      </div>
      {showText && (
        <span className={`font-bold text-gray-800 ${textSizes[size]}`}>
          Concoord
        </span>
      )}
    </div>
  )
}
