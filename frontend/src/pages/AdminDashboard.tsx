import { useEffect } from 'react'
import { Users, BookOpen, Activity, TrendingUp, Database } from 'lucide-react'
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts'
import { useAdminStore } from '@/store/adminStore'
import Layout from '@/components/Layout'
import HelpOverlay from '@/components/HelpOverlay'
import StatsCard from '@/components/StatsCard'
import LoadingSpinner from '@/components/LoadingSpinner'
import ErrorState from '@/components/ErrorState'

const PIE_COLORS = ['#00FF88', '#00D4FF', '#FFB444']

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="glass-card px-3 py-2 text-xs">
      <p className="text-muted mb-1">{label}</p>
      <p className="text-neon-green font-bold">{payload[0].value}</p>
    </div>
  )
}

export default function AdminDashboard() {
  const { dashboardStats: stats, isLoading, error, fetchDashboardStats } = useAdminStore()

  useEffect(() => { fetchDashboardStats() }, [])

  if (isLoading && !stats) return (
    <Layout><div className="flex items-center justify-center h-64"><LoadingSpinner size="lg" /></div></Layout>
  )

  if (error && !stats) return (
    <Layout><ErrorState message={error} onRetry={fetchDashboardStats} /></Layout>
  )

  const roleData = stats ? [
    { name: 'Students', value: stats.total_students },
    { name: 'Lecturers', value: stats.total_lecturers },
    { name: 'Admins', value: stats.total_admins },
  ] : []

  return (
    <Layout>
      <div className="max-w-6xl mx-auto space-y-6">
        <h1 className="page-title">Admin Dashboard</h1>

        {/* Stats grid */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <StatsCard icon={<Users size={20} />} title="Total Users" value={stats?.total_users ?? 0} color="cyan" />
          <StatsCard icon={<BookOpen size={20} />} title="Total Courses" value={stats?.total_courses ?? 0} color="green" />
          <StatsCard icon={<Activity size={20} />} title="Live Sessions" value={stats?.active_sessions_now ?? 0} color="amber" />
          <StatsCard icon={<TrendingUp size={20} />} title="Attendance Rate" value={stats?.overall_attendance_percentage ?? 0} suffix="%" color="green" />
          <StatsCard icon={<Database size={20} />} title="Today's Records" value={stats?.total_attendance_records_today ?? 0} color="cyan" />
        </div>

        {/* Charts */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Attendance trend */}
          <div className="lg:col-span-2 glass-card p-5">
            <h2 className="section-title mb-4">30-Day Attendance Trend</h2>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={stats?.attendance_trend ?? []}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis
                  dataKey="date"
                  tick={{ fill: '#8888AA', fontSize: 10 }}
                  tickFormatter={(v) => v.slice(5)}
                />
                <YAxis tick={{ fill: '#8888AA', fontSize: 10 }} />
                <Tooltip content={<CustomTooltip />} />
                <Line type="monotone" dataKey="percentage" stroke="#00FF88" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Role distribution */}
          <div className="glass-card p-5">
            <h2 className="section-title mb-4">User Distribution</h2>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={roleData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value">
                  {roleData.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex flex-wrap gap-2 justify-center mt-2">
              {roleData.map((r, i) => (
                <div key={r.name} className="flex items-center gap-1.5 text-xs text-muted">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ background: PIE_COLORS[i] }} />
                  {r.name} ({r.value})
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Users by department */}
        {(stats?.users_by_department?.length ?? 0) > 0 && (
          <div className="glass-card p-5">
            <h2 className="section-title mb-4">Users by Department</h2>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={stats?.users_by_department}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="department" tick={{ fill: '#8888AA', fontSize: 10 }} />
                <YAxis tick={{ fill: '#8888AA', fontSize: 10 }} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="count" fill="#00D4FF" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* ERP Status */}
        <div className="glass-card p-5">
          <h2 className="section-title mb-3">ERP Sync Status</h2>
          <div className="flex flex-wrap gap-6">
            <div>
              <p className="text-xs text-muted">Status</p>
              <p className="text-sm font-semibold text-white-text capitalize mt-1">
                {stats?.erp_sync_status?.status ?? 'N/A'}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted">Pending Records</p>
              <p className="text-sm font-semibold text-amber-warning mt-1">
                {stats?.erp_sync_status?.pending ?? 0}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted">Last Sync</p>
              <p className="text-sm font-semibold text-white-text mt-1">
                {stats?.erp_sync_status?.last_sync
                  ? new Date(stats.erp_sync_status.last_sync).toLocaleString('en-GB')
                  : 'Never'}
              </p>
            </div>
          </div>
        </div>
      </div>
      <HelpOverlay />
    </Layout>
  )
}
