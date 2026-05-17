import { useEffect, useRef, useState } from 'react'
import { Search, X } from 'lucide-react'

interface SearchInputProps {
  placeholder?: string
  value?: string
  onChange: (value: string) => void
  debounceMs?: number
  className?: string
}

export default function SearchInput({
  placeholder = 'Search...',
  value: controlledValue,
  onChange,
  debounceMs = 300,
  className = '',
}: SearchInputProps) {
  const [localValue, setLocalValue] = useState(controlledValue ?? '')
  const timerRef = useRef<ReturnType<typeof setTimeout>>()

  useEffect(() => {
    if (controlledValue !== undefined) setLocalValue(controlledValue)
  }, [controlledValue])

  const handleChange = (v: string) => {
    setLocalValue(v)
    clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => onChange(v), debounceMs)
  }

  return (
    <div className={`relative flex items-center ${className}`}>
      <Search size={16} className="absolute left-3.5 text-muted pointer-events-none" />
      <input
        type="search"
        value={localValue}
        onChange={(e) => handleChange(e.target.value)}
        placeholder={placeholder}
        className="input-field pl-10 pr-10"
        aria-label={placeholder}
      />
      {localValue && (
        <button
          type="button"
          onClick={() => handleChange('')}
          className="absolute right-3 text-muted hover:text-white-text transition-colors"
          aria-label="Clear search"
        >
          <X size={14} />
        </button>
      )}
    </div>
  )
}
