import { Navigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { PageLoader } from './LoadingSpinner'

interface ProtectedRouteProps {
  children: React.ReactNode
  roles?: ('admin' | 'lecturer' | 'student')[]
}

export default function ProtectedRoute({ children, roles }: ProtectedRouteProps) {
  const { isAuthenticated, user } = useAuthStore()
  const location = useLocation()

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  if (roles && !roles.includes(user.role)) {
    // Redirect to appropriate dashboard
    const dashPath =
      user.role === 'admin' ? '/admin/dashboard' :
      user.role === 'lecturer' ? '/lecturer/dashboard' :
      '/student/dashboard'
    return <Navigate to={dashPath} replace />
  }

  return <>{children}</>
}
