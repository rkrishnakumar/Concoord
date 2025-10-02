import { colors, typography } from '@/lib/design-system'

interface SelectOption {
  value: string
  label: string
}

interface SelectProps {
  label?: string
  value: string
  onChange: (value: string) => void
  options: SelectOption[]
  placeholder?: string
  required?: boolean
  disabled?: boolean
  className?: string
}

export default function Select({
  label,
  value,
  onChange,
  options,
  placeholder,
  required = false,
  disabled = false,
  className = ''
}: SelectProps) {
  return (
    <div className={className}>
      {label && (
        <label className={`block ${typography.label} mb-2`}>
          {label}
          {required && <span className="text-red-400 ml-1">*</span>}
        </label>
      )}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        disabled={disabled}
        className={`w-full px-3 py-2 ${colors.background.input} ${colors.borders.secondary} rounded-md ${colors.text.primary} focus:outline-none focus:ring-2 focus:ring-blue-500`}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  )
}
