import { useAuthStore } from '@/store/authStore'
import Layout from '@/components/Layout'
import Input from '@/components/Input'
import Button from '@/components/Button'
import { useToast } from '@/components/Toast'
import { useState } from 'react'
import apiClient from '@/lib/apiClient'

export default function SettingsPage() {
  const { user } = useAuthStore()
  const { success, error: toastError } = useToast()
  const [form, setForm] = useState({ current_password: '', new_password: '', confirm_password: '' })
  const [loading, setLoading] = useState(false)

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault()
    if (form.new_password !== form.confirm_password) { toastError('Passwords do not match.'); return }
    if (form.new_password.length < 8) { toastError('Password must be at least 8 characters.'); return }
    setLoading(true)
    try {
      success('Password change feature coming soon. Contact your admin to reset your password.')
    } catch (err: any) {
      toastError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Layout>
      <div className="max-w-2xl mx-auto space-y-6">
        <h1 className="page-title">Settings</h1>

        {/* Profile info */}
        <div className="glass-card p-6">
          <h2 className="section-title mb-4">Profile Information</h2>
          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-bold text-deep-black"
              style={{ background: 'linear-gradient(135deg, #00FF88, #00D4FF)' }}>
              {user?.full_name?.[0] ?? '?'}
            </div>
            <div>
              <p className="text-lg font-bold text-white-text">{user?.full_name}</p>
              <p className="text-sm text-muted">{user?.email}</p>
              <span className="badge badge-green capitalize mt-1">{user?.role}</span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 text-sm">
            {user?.matric_number && (
              <div><p className="text-muted text-xs">Matric Number</p><p className="font-mono text-white-text mt-0.5">{user.matric_number}</p></div>
            )}
            {user?.department && (
              <div><p className="text-muted text-xs">Department</p><p className="text-white-text mt-0.5">{user.department}</p></div>
            )}
            {user?.level && (
              <div><p className="text-muted text-xs">Level</p><p className="text-white-text mt-0.5">{user.level} Level</p></div>
            )}
          </div>
        </div>

        {/* Change password */}
        <div className="glass-card p-6">
          <h2 className="section-title mb-4">Change Password</h2>
          <form onSubmit={handlePasswordChange} className="space-y-4">
            <Input
              label="New Password"
              type="password"
              showPasswordToggle
              value={form.new_password}
              onChange={(e) => setForm((f) => ({ ...f, new_password: e.target.value }))}
              placeholder="Minimum 8 characters"
            />
            <Input
              label="Confirm New Password"
              type="password"
              showPasswordToggle
              value={form.confirm_password}
              onChange={(e) => setForm((f) => ({ ...f, confirm_password: e.target.value }))}
              placeholder="Repeat new password"
            />
            <Button type="submit" variant="secondary" loading={loading}>Update Password</Button>
          </form>
        </div>

        {/* App info */}
        <div className="glass-card p-6">
          <h2 className="section-title mb-3">About EX-Digital</h2>
          <div className="space-y-1.5 text-sm text-muted">
            <p>Version: 1.0.0</p>
            <p>Built for NACOS Hackathon 2025/2026 · Team EX-Coders</p>
            <p>License: MIT</p>
          </div>
        </div>
      </div>
    </Layout>
  )
}
