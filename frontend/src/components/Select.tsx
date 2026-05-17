import React, { forwardRef } from 'react'

interface SelectOption {
  value: string
  label: string
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  error?: string
  helper?: string
  options: SelectOption[]
  placeholder?: string
}

const Select = forwardRef<HTMLSelectElement, SelectProps>(({
  label,
  error,
  helper,
  options,
  placeholder,
  className = '',
  id,
  ...props
}, ref) => {
  const selectId = id || label?.toLowerCase().replace(/\s+/g, '-')

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={selectId} className="label">
          {label}
          {props.required && <span className="text-soft-red ml-1" aria-hidden>*</span>}
        </label>
      )}
      <select
        ref={ref}
        id={selectId}
        className={`input-field appearance-none ${error ? 'input-error' : ''} ${className}`}
        aria-invalid={!!error}
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%238888AA' d='M6 8L1 3h10z'/%3E%3C/svg%3E")`,
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'right 12px center',
          paddingRight: '36px',
        }}
        {...props}
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map((opt) => (
          <option key={opt.value} value={opt.value} style={{ background: '#12121A', color: '#F0F0F5' }}>
            {opt.label}
          </option>
        ))}
      </select>
      {error && <p className="text-xs text-soft-red" role="alert">{error}</p>}
      {!error && helper && <p className="text-xs text-muted">{helper}</p>}
    </div>
  )
})

Select.displayName = 'Select'
export default Select
