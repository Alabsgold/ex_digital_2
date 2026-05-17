import Input from './Input'
import Button from './Button'

interface DateRangePickerProps {
  fromDate: string
  toDate: string
  onFromChange: (v: string) => void
  onToChange: (v: string) => void
  className?: string
}

const PRESETS = [
  { label: '7 days', days: 7 },
  { label: '30 days', days: 30 },
  { label: '90 days', days: 90 },
]

function toDateStr(d: Date) {
  return d.toISOString().split('T')[0]
}

export default function DateRangePicker({
  fromDate,
  toDate,
  onFromChange,
  onToChange,
  className = '',
}: DateRangePickerProps) {
  const applyPreset = (days: number) => {
    const now = new Date()
    const from = new Date(now)
    from.setDate(now.getDate() - days)
    onFromChange(toDateStr(from))
    onToChange(toDateStr(now))
  }

  return (
    <div className={`flex flex-wrap items-end gap-3 ${className}`}>
      <Input
        label="From"
        type="date"
        value={fromDate}
        onChange={(e) => onFromChange(e.target.value)}
        className="w-40"
      />
      <Input
        label="To"
        type="date"
        value={toDate}
        onChange={(e) => onToChange(e.target.value)}
        className="w-40"
      />
      <div className="flex gap-2 pb-0.5">
        {PRESETS.map((p) => (
          <Button key={p.days} variant="ghost" size="sm" onClick={() => applyPreset(p.days)}>
            {p.label}
          </Button>
        ))}
      </div>
    </div>
  )
}
