import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion, useInView } from 'framer-motion'
import { QrCode, Wifi, Zap, ChevronDown, Shield, Clock } from 'lucide-react'

const TYPEWRITER_TEXTS = [
  'Smart Attendance Management',
  'Built for Universities',
  'Offline-First Design',
  'Real-Time Sync',
]

function TypewriterText() {
  const [textIndex, setTextIndex] = useState(0)
  const [displayed, setDisplayed] = useState('')
  const [phase, setPhase] = useState<'typing' | 'pause' | 'deleting'>('typing')

  useEffect(() => {
    const target = TYPEWRITER_TEXTS[textIndex]
    let timeout: ReturnType<typeof setTimeout>

    if (phase === 'typing') {
      if (displayed.length < target.length) {
        timeout = setTimeout(() => setDisplayed(target.slice(0, displayed.length + 1)), 60)
      } else {
        timeout = setTimeout(() => setPhase('pause'), 1800)
      }
    } else if (phase === 'pause') {
      timeout = setTimeout(() => setPhase('deleting'), 200)
    } else {
      if (displayed.length > 0) {
        timeout = setTimeout(() => setDisplayed(displayed.slice(0, -1)), 35)
      } else {
        setTextIndex((i) => (i + 1) % TYPEWRITER_TEXTS.length)
        setPhase('typing')
      }
    }
    return () => clearTimeout(timeout)
  }, [displayed, phase, textIndex])

  return (
    <span className="text-electric-cyan">
      {displayed}
      <span className="animate-pulse text-neon-green">|</span>
    </span>
  )
}

function StatCounter({ value, label }: { value: string; label: string }) {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true })

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 20 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5 }}
      className="text-center"
    >
      <div className="text-3xl font-bold neon-text mb-1">{value}</div>
      <div className="text-sm text-muted">{label}</div>
    </motion.div>
  )
}

function FeatureCard({ icon, title, desc, delay }: { icon: React.ReactNode; title: string; desc: string; delay: number }) {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true })

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 30 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5, delay }}
      className="glass-card glass-card-hover p-6 flex flex-col gap-4"
    >
      <div className="w-12 h-12 rounded-xl flex items-center justify-center"
        style={{ background: 'rgba(0,255,136,0.08)', border: '1px solid rgba(0,255,136,0.2)' }}>
        <span className="text-neon-green">{icon}</span>
      </div>
      <div>
        <h3 className="font-semibold text-white-text mb-2">{title}</h3>
        <p className="text-sm text-muted leading-relaxed">{desc}</p>
      </div>
    </motion.div>
  )
}

// Floating particles background
function Particles() {
  const particles = Array.from({ length: 20 }, (_, i) => ({
    id: i,
    size: Math.random() * 4 + 2,
    x: Math.random() * 100,
    duration: Math.random() * 15 + 10,
    delay: Math.random() * 10,
  }))

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden>
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute rounded-full animate-particle"
          style={{
            width: p.size,
            height: p.size,
            left: `${p.x}%`,
            bottom: '-10px',
            background: 'rgba(0,255,136,0.4)',
            animationDuration: `${p.duration}s`,
            animationDelay: `${p.delay}s`,
            boxShadow: '0 0 6px rgba(0,255,136,0.4)',
          }}
        />
      ))}
    </div>
  )
}

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#0A0A0F' }}>
      {/* Hero */}
      <section className="relative flex-1 flex flex-col items-center justify-center px-4 py-24 text-center overflow-hidden min-h-screen">
        <Particles />

        {/* Glow backdrop */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none" aria-hidden>
          <div className="w-[600px] h-[600px] rounded-full"
            style={{ background: 'radial-gradient(circle, rgba(0,255,136,0.06) 0%, transparent 70%)' }} />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: 'easeOut' }}
          className="relative z-10 max-w-4xl"
        >
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold mb-8"
            style={{ background: 'rgba(0,255,136,0.08)', border: '1px solid rgba(0,255,136,0.2)', color: '#00FF88' }}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-neon-green animate-pulse" />
            NACOS Hackathon 2025/2026 · Team EX-Coders
          </motion.div>

          {/* Logo */}
          <h1
            className="text-7xl md:text-8xl font-bold mb-4 tracking-tight"
            style={{ color: '#00FF88', textShadow: '0 0 40px rgba(0,255,136,0.5), 0 0 80px rgba(0,255,136,0.25)' }}
          >
            EX-DIGITAL
          </h1>

          <h2 className="text-2xl md:text-3xl font-medium text-white-text/90 mb-4 min-h-[2.5rem]">
            <TypewriterText />
          </h2>

          <p className="text-muted max-w-xl mx-auto mb-10 leading-relaxed">
            A production-grade enterprise attendance management system for universities.
            Mark attendance in seconds, work offline, and sync in real time.
          </p>

          {/* CTAs */}
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link to="/register">
              <motion.button
                whileHover={{ scale: 1.04, boxShadow: '0 0 30px rgba(0,255,136,0.35)' }}
                whileTap={{ scale: 0.97 }}
                className="btn-primary px-8 py-4 text-base min-h-[52px]"
              >
                Get Started — It's Free
              </motion.button>
            </Link>
            <Link to="/login">
              <motion.button
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.97 }}
                className="btn-secondary px-8 py-4 text-base min-h-[52px]"
              >
                Sign In
              </motion.button>
            </Link>
          </div>
        </motion.div>

        {/* Scroll indicator */}
        <motion.div
          className="absolute bottom-10 left-1/2 -translate-x-1/2 text-muted"
          animate={{ y: [0, 8, 0] }}
          transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
          aria-hidden
        >
          <ChevronDown size={24} />
        </motion.div>
      </section>

      {/* Stats */}
      <section className="py-16 px-4" style={{ background: 'rgba(18,18,26,0.5)', borderTop: '1px solid rgba(0,255,136,0.06)' }}>
        <div className="max-w-3xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8">
          <StatCounter value="99.9%" label="Uptime" />
          <StatCounter value="Offline-First" label="Architecture" />
          <StatCounter value="Enterprise" label="Security" />
          <StatCounter value="Real-Time" label="Sync" />
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-4 max-w-5xl mx-auto w-full">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <h2 className="text-4xl font-bold text-white-text mb-4">Why EX-Digital?</h2>
          <p className="text-muted max-w-lg mx-auto">
            Everything your university needs to manage attendance at scale — simple enough for non-tech users.
          </p>
        </motion.div>
        <div className="grid md:grid-cols-3 gap-6">
          <FeatureCard
            icon={<QrCode size={24} />}
            title="QR Scan Attendance"
            desc="Mark attendance in seconds with a simple QR scan. No app downloads needed — works in any modern browser."
            delay={0}
          />
          <FeatureCard
            icon={<Wifi size={24} />}
            title="Works Offline"
            desc="Never lose data. Scans are queued in IndexedDB and automatically synced when you reconnect to the network."
            delay={0.1}
          />
          <FeatureCard
            icon={<Zap size={24} />}
            title="Real-Time Dashboard"
            desc="Lecturers see attendance live as students scan in — via Server-Sent Events, no polling required."
            delay={0.2}
          />
          <FeatureCard
            icon={<Shield size={24} />}
            title="Enterprise Security"
            desc="JWT auth, HMAC-signed webhooks, RBAC for admins/lecturers/students, and rate limiting out of the box."
            delay={0.3}
          />
          <FeatureCard
            icon={<Clock size={24} />}
            title="Manual Fallback"
            desc="Can't scan? Enter the 6-character session code manually. Every feature has an accessible alternative."
            delay={0.4}
          />
          <FeatureCard
            icon={<Zap size={24} />}
            title="ERP Integration"
            desc="Sync attendance records with your institution's ERP via HMAC-verified webhooks and REST API."
            delay={0.5}
          />
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 text-center text-xs text-muted" style={{ borderTop: '1px solid rgba(0,255,136,0.06)' }}>
        Built for NACOS Hackathon 2025/2026 · Team EX-Coders · MIT License
      </footer>
    </div>
  )
}
