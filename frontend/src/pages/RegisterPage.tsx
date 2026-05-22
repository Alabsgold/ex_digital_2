import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { QrCode, CheckCircle } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { useToast } from '@/components/Toast'
import Input from '@/components/Input'
import Button from '@/components/Button'
import Select from '@/components/Select'

const DEPARTMENTS = [
  'Computer Science', 'Engineering', 'Medicine', 'Law', 'Business Administration',
  'Education', 'Social Sciences', 'Arts & Humanities', 'Sciences', 'Agriculture',
].map((d) => ({ value: d, label: d }))

const LEVELS = ['100', '200', '300', '400', '500', 'PG'].map((l) => ({ value: l, label: `${l} Level` }))

function PasswordStrengthBar({ password }: { password: string }) {
  const checks = [
    { label: '8+ characters', met: password.length >= 8 },
    { label: 'Uppercase letter', met: /[A-Z]/.test(password) },
    { label: 'Lowercase letter', met: /[a-z]/.test(password) },
    { label: 'Number', met: /\d/.test(password) },
  ]
  const score = checks.filter((c) => c.met).length
  const color = score <= 1 ? '#FF4472' : score <= 2 ? '#FFB444' : score === 3 ? '#00D4FF' : '#00FF88'

  if (!password) return null

  return (
    <div className="mt-2">
      <div className="flex gap-1 mb-2">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="h-1 flex-1 rounded-full transition-all duration-300"
            style={{ background: i <= score ? color : 'rgba(255,255,255,0.08)' }}
          />
        ))}
      </div>
      <div className="grid grid-cols-2 gap-1">
        {checks.map((c) => (
          <div key={c.label} className={`flex items-center gap-1.5 text-xs ${c.met ? 'text-neon-green' : 'text-muted'}`}>
            <CheckCircle size={10} className={c.met ? 'text-neon-green' : 'text-muted/30'} />
            {c.label}
          </div>
        ))}
      </div>
    </div>
  )
}

export default function RegisterPage() {
  const navigate = useNavigate()
  const { register } = useAuthStore()
  const { success, error: toastError } = useToast()

  const [form, setForm] = useState({
    role: 'student' as 'student',
    full_name: '',
    email: '',
    matric_number: '',
    department: '',
    level: '',
    password: '',
    confirm_password: '',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)

  const set = (field: string, value: string) => {
    setForm((f) => ({ ...f, [field]: value }))
    setErrors((e) => ({ ...e, [field]: '' }))
  }

  const validate = () => {
    const errs: Record<string, string> = {}
    if (!form.full_name || form.full_name.length < 3) errs.full_name = 'Full name must be at least 3 characters.'
    if (!form.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errs.email = 'Enter a valid email address.'
    if (form.matric_number && !/^[A-Za-z0-9\-/]{4,25}$/.test(form.matric_number))
      errs.matric_number = 'Matric number must be 4–25 characters (letters, digits, / or -).'
    if (!form.password || form.password.length < 8) errs.password = 'Password must be at least 8 characters.'
    else if (!/[A-Z]/.test(form.password)) errs.password = 'Password must include an uppercase letter.'
    else if (!/[a-z]/.test(form.password)) errs.password = 'Password must include a lowercase letter.'
    else if (!/\d/.test(form.password)) errs.password = 'Password must include a number.'
    if (form.password !== form.confirm_password) errs.confirm_password = 'Passwords do not match.'
    return errs
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length > 0) { setErrors(errs); return }

    setLoading(true)
    try {
      await register({
        email: form.email,
        password: form.password,
        full_name: form.full_name,
        matric_number: form.matric_number ? form.matric_number.toUpperCase() : undefined,
        department: form.department || undefined,
        level: form.level || undefined,
        role: 'student',
      })
      success('Account created successfully! Welcome to EX-Digital.')
      navigate(`/${form.role}/dashboard`)
    } catch (err: any) {
      toastError(err.message || 'Registration failed.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4"
      style={{ background: '#0A0A0F', backgroundImage: 'radial-gradient(ellipse at 30% 20%, rgba(0,255,136,0.04) 0%, transparent 60%)' }}>
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="w-full max-w-md"
      >
        <div className="glass-card p-8">
          {/* Header */}
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: 'rgba(0,255,136,0.1)', border: '1px solid rgba(0,255,136,0.2)' }}>
              <QrCode size={22} className="text-neon-green" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white-text">Create Your Account</h1>
              <p className="text-xs text-muted">Join EX-Digital Attendance System</p>
            </div>
          </div>

          {/* Role Selection Removed - Only Students can register */}
          <div className="bg-surface/50 p-3 rounded-xl mb-6 border border-white/[0.05] text-center">
            <p className="text-sm font-medium text-electric-cyan">Student Registration</p>
            <p className="text-xs text-muted mt-1">Lecturers must contact the administrator for an account.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <Input
              label="Full Name"
              value={form.full_name}
              onChange={(e) => set('full_name', e.target.value)}
              placeholder="e.g. Olanrewaju Gbolahan"
              error={errors.full_name}
              required
              autoComplete="name"
            />

            <Input
              label="Matric Number (optional)"
              value={form.matric_number}
              onChange={(e) => set('matric_number', e.target.value.toUpperCase())}
              placeholder="e.g. 2403030099"
              error={errors.matric_number}
              className="font-mono"
            />

            <Input
              label="Email Address"
              type="email"
              value={form.email}
              onChange={(e) => set('email', e.target.value)}
              placeholder="you@university.edu"
              error={errors.email}
              required
              autoComplete="email"
            />

            <div className="grid grid-cols-2 gap-3">
              <Select
                label="Department"
                value={form.department}
                onChange={(e) => set('department', e.target.value)}
                options={DEPARTMENTS}
                placeholder="Select department"
              />
              <Select
                label="Level"
                value={form.level}
                onChange={(e) => set('level', e.target.value)}
                options={LEVELS}
                placeholder="Select level"
              />
            </div>

            <div>
              <Input
                label="Password"
                type="password"
                showPasswordToggle
                value={form.password}
                onChange={(e) => set('password', e.target.value)}
                placeholder="Min. 8 characters"
                error={errors.password}
                required
                autoComplete="new-password"
              />
              <PasswordStrengthBar password={form.password} />
            </div>

            <Input
              label="Confirm Password"
              type="password"
              showPasswordToggle
              value={form.confirm_password}
              onChange={(e) => set('confirm_password', e.target.value)}
              placeholder="Repeat your password"
              error={errors.confirm_password}
              required
              autoComplete="new-password"
            />

            <Button type="submit" variant="primary" fullWidth loading={loading} className="mt-2">
              Create Account
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-muted">
              Already have an account?{' '}
              <Link to="/login" className="text-neon-green font-medium hover:underline">
                Sign In
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
