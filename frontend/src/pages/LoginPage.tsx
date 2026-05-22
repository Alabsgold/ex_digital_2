import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import { QrCode } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { useToast } from '@/components/Toast'
import Input from '@/components/Input'
import Button from '@/components/Button'

export default function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { login, getDashboardPath } = useAuthStore()
  const { success, error: toastError } = useToast()

  const [tab, setTab] = useState<'email' | 'matric'>('email')
  const [loginValue, setLoginValue] = useState('')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)

  const from = (location.state as any)?.from?.pathname ?? null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const errs: Record<string, string> = {}
    if (!loginValue) errs.login = tab === 'email' ? 'Email is required.' : 'Matric number is required.'
    if (!password) errs.password = 'Password is required.'
    if (Object.keys(errs).length > 0) { setErrors(errs); return }

    setLoading(true)
    try {
      await login(loginValue.trim(), password)
      success('Welcome back!')
      const dashPath = getDashboardPath()
      navigate(from || dashPath, { replace: true })
    } catch (err: any) {
      toastError(err.message || 'Sign in failed. Please check your credentials.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4"
      style={{ background: '#0A0A0F', backgroundImage: 'radial-gradient(ellipse at 70% 80%, rgba(0,212,255,0.03) 0%, transparent 60%)' }}>
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="w-full max-w-sm"
      >
        <div className="glass-card p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-4"
              style={{ background: 'rgba(0,255,136,0.08)', border: '1px solid rgba(0,255,136,0.2)' }}>
              <QrCode size={28} className="text-neon-green" />
            </div>
            <h1 className="text-2xl font-bold text-white-text">Welcome Back</h1>
            <p className="text-sm text-muted mt-1">Sign in to EX-Digital</p>
          </div>

          {/* Tab switcher */}
          <div className="flex rounded-xl p-1 mb-6" style={{ background: 'rgba(255,255,255,0.04)' }}>
            {(['email', 'matric'] as const).map((t) => (
              <button
                key={t}
                onClick={() => { setTab(t); setLoginValue(''); setErrors({}) }}
                className="flex-1 py-2 rounded-lg text-sm font-medium transition-all duration-200"
                style={{
                  background: tab === t ? 'rgba(0,255,136,0.12)' : 'transparent',
                  color: tab === t ? '#00FF88' : '#8888AA',
                  border: tab === t ? '1px solid rgba(0,255,136,0.25)' : '1px solid transparent',
                }}
              >
                {t === 'email' ? 'Email' : 'Matric Number'}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            {tab === 'email' ? (
              <Input
                label="Email or Username"
                type="text"
                value={loginValue}
                onChange={(e) => { setLoginValue(e.target.value); setErrors((e) => ({ ...e, login: '' })) }}
                placeholder="you@jabu.edu.ng"
                error={errors.login}
                required
                autoComplete="email"
                autoFocus
              />
            ) : (
              <Input
                label="Matric Number"
                value={loginValue}
                onChange={(e) => { setLoginValue(e.target.value.toUpperCase()); setErrors((er) => ({ ...er, login: '' })) }}
                placeholder="e.g. Enter your 10 digit matric number"
                error={errors.login}
                required
                autoComplete="username"
                className="font-mono"
                autoFocus
              />
            )}

            <div>
              <Input
                label="Password"
                type="password"
                showPasswordToggle
                value={password}
                onChange={(e) => { setPassword(e.target.value); setErrors((er) => ({ ...er, password: '' })) }}
                placeholder="Your password"
                error={errors.password}
                required
                autoComplete="current-password"
              />
              <div className="mt-1.5 text-right">
                <button type="button" className="text-xs text-electric-cyan hover:text-neon-green transition-colors">
                  Forgot password?
                </button>
              </div>
            </div>

            <Button type="submit" variant="primary" fullWidth loading={loading}>
              Sign In
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-muted">
              Don't have an account?{' '}
              <Link to="/register" className="text-neon-green font-medium hover:underline">
                Create Account
              </Link>
            </p>
          </div>
          

        </div>

        <p className="text-center text-xs text-muted mt-6">
          <Link to="/" className="hover:text-white-text transition-colors">← Back to Home</Link>
        </p>
      </motion.div>
    </div>
  )
}
