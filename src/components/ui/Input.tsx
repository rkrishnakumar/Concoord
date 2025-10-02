import { colors, typography } from '@/lib/design-system'

interface InputProps {
  label?: string
  type?: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  required?: boolean
  disabled?: boolean
  className?: string
}

export default function Input({
  label,
  type = 'text',
  value,
  onChange,
  placeholder,
  required = false,
  disabled = false,
  className = ''
}: InputProps) {
  return (
    <div className={className}>
      {label && (
        <label className={`block ${typography.label} mb-2`}>
          {label}
          {required && <span className="text-red-400 ml-1">*</span>}
        </label>
      )}
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        className={`w-full px-3 py-2 ${colors.background.input} ${colors.borders.secondary} rounded-md ${colors.text.primary} focus:outline-none focus:ring-2 focus:ring-blue-500`}
      />
    </div>
  )
}
