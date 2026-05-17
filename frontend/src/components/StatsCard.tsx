import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

interface StatsCardProps {
  icon: React.ReactNode
  title: string
  value: number | string
  suffix?: string
  trend?: 'up' | 'down' | 'neutral'
  trendValue?: string
  color?: 'green' | 'cyan' | 'red' | 'amber'
  animate?: boolean
  className?: string
  onClick?: () => void
}

function useCountUp(target: number, duration = 1500, enabled = true) {
  const [count, setCount] = useState(0)
  const startTime = useRef<number | null>(null)
  const rafId = useRef<number>()

  useEffect(() => {
    if (!enabled || typeof target !== 'number') return
    startTime.current = null

    const step = (timestamp: number) => {
      if (!startTime.current) startTime.current = timestamp
      const progress = Math.min((timestamp - startTime.current) / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setCount(Math.round(eased * target))
      if (progress < 1) rafId.current = requestAnimationFrame(step)
    }
    rafId.current = requestAnimationFrame(step)
    return () => { if (rafId.current) cancelAnimationFrame(rafId.current) }
  }, [target, duration, enabled])

  return count
}

export default function StatsCard({
  icon,
  title,
  value,
  suffix,
  trend,
  trendValue,
  color = 'green',
  animate = true,
  className = '',
  onClick,
}: StatsCardProps) {
  const numValue = typeof value === 'number' ? value : parseInt(String(value)) || 0
  const displayValue = useCountUp(numValue, 1200, animate && typeof value === 'number')

  const colorMap = {
    green: { icon: 'text-neon-green', bg: 'rgba(0,255,136,0.08)', border: 'rgba(0,255,136,0.15)' },
    cyan: { icon: 'text-electric-cyan', bg: 'rgba(0,212,255,0.08)', border: 'rgba(0,212,255,0.15)' },
    red: { icon: 'text-soft-red', bg: 'rgba(255,68,114,0.08)', border: 'rgba(255,68,114,0.15)' },
    amber: { icon: 'text-amber-warning', bg: 'rgba(255,180,68,0.08)', border: 'rgba(255,180,68,0.15)' },
  }[color]

  return (
    <motion.div
      whileHover={{ scale: onClick ? 1.02 : 1, y: onClick ? -2 : 0 }}
      onClick={onClick}
      className={`glass-card p-5 ${onClick ? 'cursor-pointer glass-card-hover' : ''} ${className}`}
    >
      <div className="flex items-start justify-between mb-4">
        <div
          className="p-2.5 rounded-xl flex items-center justify-center"
          style={{ background: colorMap.bg, border: `1px solid ${colorMap.border}` }}
        >
          <span className={colorMap.icon}>{icon}</span>
        </div>
        {trend && (
          <div className={`flex items-center gap-1 text-xs font-medium ${
            trend === 'up' ? 'text-neon-green' : trend === 'down' ? 'text-soft-red' : 'text-muted'
          }`}>
            {trend === 'up' && <TrendingUp size={12} />}
            {trend === 'down' && <TrendingDown size={12} />}
            {trend === 'neutral' && <Minus size={12} />}
            {trendValue}
          </div>
        )}
      </div>
      <div className="flex items-baseline gap-1">
        <span className="text-3xl font-bold text-white-text">
          {animate && typeof value === 'number' ? displayValue.toLocaleString() : value}
        </span>
        {suffix && <span className="text-sm text-muted font-medium">{suffix}</span>}
      </div>
      <p className="text-sm text-muted mt-1">{title}</p>
    </motion.div>
  )
}
