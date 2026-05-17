import { useState, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard, Users, BookOpen, QrCode, History, Settings,
  LogOut, Menu, X, ChevronLeft, ChevronRight, Bell, Activity,
  RefreshCw, Database,
} from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import NetworkStatusPill from './NetworkStatusPill'
import ConfirmModal from './ConfirmModal'

interface NavItem {
  label: string
  path: string
  icon: React.ReactNode
}

function getNavItems(role: string): NavItem[] {
  if (role === 'admin') return [
    { label: 'Dashboard', path: '/admin/dashboard', icon: <LayoutDashboard size={20} /> },
    { label: 'Users', path: '/admin/users', icon: <Users size={20} /> },
    { label: 'Courses', path: '/admin/courses', icon: <BookOpen size={20} /> },
    { label: 'ERP Sync', path: '/admin/erp-sync', icon: <RefreshCw size={20} /> },
    { label: 'Settings', path: '/admin/settings', icon: <Settings size={20} /> },
  ]
  if (role === 'lecturer') return [
    { label: 'Dashboard', path: '/lecturer/dashboard', icon: <LayoutDashboard size={20} /> },
    { label: 'Sessions', path: '/lecturer/sessions', icon: <Activity size={20} /> },
    { label: 'Courses', path: '/lecturer/courses', icon: <BookOpen size={20} /> },
    { label: 'Settings', path: '/lecturer/settings', icon: <Settings size={20} /> },
  ]
  return [
    { label: 'Dashboard', path: '/student/dashboard', icon: <LayoutDashboard size={20} /> },
    { label: 'My History', path: '/student/history', icon: <History size={20} /> },
    { label: 'Settings', path: '/student/settings', icon: <Settings size={20} /> },
  ]
}

export default function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuthStore()
  const location = useLocation()
  const navigate = useNavigate()
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [logoutOpen, setLogoutOpen] = useState(false)

  const navItems = getNavItems(user?.role ?? 'student')

  useEffect(() => { setMobileOpen(false) }, [location.pathname])

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const Sidebar = ({ mobile = false }: { mobile?: boolean }) => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className={`flex items-center gap-3 px-4 py-5 ${collapsed && !mobile ? 'justify-center' : ''}`}>
        <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: 'rgba(0,255,136,0.12)', border: '1px solid rgba(0,255,136,0.25)' }}>
          <QrCode size={20} className="text-neon-green" />
        </div>
        {(!collapsed || mobile) && (
          <div>
            <h1 className="text-sm font-bold text-neon-green leading-none">EX-Digital</h1>
            <p className="text-xs text-muted capitalize">{user?.role}</p>
          </div>
        )}
      </div>

      <div className="divider mx-4 mb-3" />

      {/* Nav items */}
      <nav className="flex-1 px-3 flex flex-col gap-1" role="navigation" aria-label="Main navigation">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`nav-item ${isActive ? 'active' : ''} ${collapsed && !mobile ? 'justify-center px-3' : ''}`}
              aria-current={isActive ? 'page' : undefined}
              title={collapsed && !mobile ? item.label : undefined}
            >
              <span className="flex-shrink-0">{item.icon}</span>
              {(!collapsed || mobile) && <span className="truncate">{item.label}</span>}
            </Link>
          )
        })}
      </nav>

      {/* User + Logout */}
      <div className="p-3 mt-auto">
        <div className="divider mb-3" />
        {(!collapsed || mobile) && (
          <div className="px-3 py-2 mb-2">
            <p className="text-sm font-medium text-white-text truncate">{user?.full_name}</p>
            <p className="text-xs text-muted truncate">{user?.email}</p>
          </div>
        )}
        <button
          onClick={() => setLogoutOpen(true)}
          className={`nav-item w-full text-soft-red hover:bg-soft-red/10 hover:text-soft-red ${collapsed && !mobile ? 'justify-center px-3' : ''}`}
          aria-label="Sign out"
        >
          <LogOut size={18} />
          {(!collapsed || mobile) && <span>Sign Out</span>}
        </button>
      </div>
    </div>
  )

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Desktop sidebar */}
      <motion.aside
        animate={{ width: collapsed ? 72 : 260 }}
        transition={{ duration: 0.22, ease: 'easeInOut' }}
        className="hidden lg:flex flex-col relative flex-shrink-0"
        style={{ background: 'rgba(12,12,18,0.95)', borderRight: '1px solid rgba(0,255,136,0.08)' }}
      >
        <Sidebar />
        <button
          onClick={() => setCollapsed((c) => !c)}
          className="absolute -right-3 top-16 w-6 h-6 rounded-full flex items-center justify-center z-10 transition-all"
          style={{ background: '#12121A', border: '1px solid rgba(0,255,136,0.2)' }}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronRight size={12} className="text-neon-green" /> : <ChevronLeft size={12} className="text-neon-green" />}
        </button>
      </motion.aside>

      {/* Mobile drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 lg:hidden"
              style={{ background: 'rgba(0,0,0,0.7)' }}
              onClick={() => setMobileOpen(false)}
            />
            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="fixed left-0 top-0 bottom-0 w-72 z-50 lg:hidden"
              style={{ background: 'rgba(12,12,18,0.98)', borderRight: '1px solid rgba(0,255,136,0.1)' }}
            >
              <Sidebar mobile />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="flex-shrink-0 flex items-center justify-between px-4 lg:px-6 h-16"
          style={{ borderBottom: '1px solid rgba(0,255,136,0.06)', background: 'rgba(10,10,15,0.8)', backdropFilter: 'blur(8px)' }}>
          <div className="flex items-center gap-3">
            <button
              className="lg:hidden text-muted hover:text-white-text p-2 -ml-2"
              onClick={() => setMobileOpen(true)}
              aria-label="Open navigation menu"
            >
              <Menu size={22} />
            </button>
          </div>
          <div className="flex items-center gap-3">
            <NetworkStatusPill />
            <button className="text-muted hover:text-white-text transition-colors p-2 relative" aria-label="Notifications">
              <Bell size={18} />
            </button>
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-deep-black"
              style={{ background: 'linear-gradient(135deg, #00FF88, #00D4FF)' }}>
              {user?.full_name?.[0] ?? '?'}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6" id="main-content">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
          >
            {children}
          </motion.div>
        </main>
      </div>

      {/* Logout confirm */}
      <ConfirmModal
        isOpen={logoutOpen}
        onClose={() => setLogoutOpen(false)}
        onConfirm={handleLogout}
        title="Sign Out"
        message="Are you sure you want to sign out of EX-Digital?"
        confirmLabel="Sign Out"
        cancelLabel="Stay"
        variant="warning"
      />
    </div>
  )
}
