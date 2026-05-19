import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ShieldAlert, KeyRound } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { useToast } from '@/components/Toast'
import Input from '@/components/Input'
import Button from '@/components/Button'

export default function AdminLogin() {
  const navigate = useNavigate()
  const { adminLogin } = useAuthStore()
  const { error: toastError, success } = useToast()

  const [form, setForm] = useState({ login: '', password: '' })
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.login || !form.password) {
      toastError('Please enter both admin ID/email and password.')
      return
    }

    setLoading(true)
    try {
      await adminLogin(form.login, form.password)
      success('Admin access granted.')
      navigate('/admin/dashboard')
    } catch (err: any) {
      toastError(err.message || 'Login failed.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden"
      style={{ background: '#05050A' }}>
      
      {/* Intense red background glow to indicate danger/admin zone */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] opacity-20 pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(255,68,114,0.3) 0%, transparent 60%)' }} />

      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="w-full max-w-sm relative z-10"
      >
        <div className="glass-card p-8 border-soft-red/20" style={{ background: 'rgba(20, 10, 15, 0.8)' }}>
          {/* Header */}
          <div className="flex flex-col items-center text-center mb-8">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
              style={{ background: 'rgba(255,68,114,0.1)', border: '1px solid rgba(255,68,114,0.3)' }}>
              <ShieldAlert size={28} className="text-soft-red" />
            </div>
            <h1 className="text-2xl font-bold text-white-text">Admin Portal</h1>
            <p className="text-xs text-soft-red mt-1 font-semibold uppercase tracking-widest">Restricted Access</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <Input
              label="Admin Email / ID"
              value={form.login}
              onChange={(e) => setForm({ ...form, login: e.target.value })}
              placeholder="admin@exdigital.com"
              required
            />
            
            <Input
              label="Admin Password"
              type="password"
              showPasswordToggle
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder="••••••••"
              required
            />

            <Button
              type="submit"
              variant="danger"
              fullWidth
              loading={loading}
              className="mt-4"
              leftIcon={<KeyRound size={16} />}
            >
              Authenticate
            </Button>
          </form>

          <div className="mt-8 text-center border-t border-white/5 pt-6">
            <p className="text-xs text-muted">
              Not an administrator? <br />
              <button 
                type="button"
                onClick={() => navigate('/login')}
                className="text-white-text hover:underline mt-1 font-medium"
              >
                Return to standard login
              </button>
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
