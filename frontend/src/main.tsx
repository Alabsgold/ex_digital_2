import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'

import '@/index.css'

import { ToastProvider } from '@/components/Toast'
import ProtectedRoute from '@/components/ProtectedRoute'

// Public pages
import LandingPage from '@/pages/LandingPage'
import LoginPage from '@/pages/LoginPage'
import RegisterPage from '@/pages/RegisterPage'
import NotFoundPage from '@/pages/NotFoundPage'

// Student pages
import StudentDashboard from '@/pages/StudentDashboard'
import StudentAttendanceHistory from '@/pages/StudentAttendanceHistory'
import SettingsPage from '@/pages/SettingsPage'

// Lecturer pages
import LecturerDashboard from '@/pages/LecturerDashboard'
import LecturerSessions from '@/pages/LecturerSessions'
import LecturerCourses from '@/pages/LecturerCourses'

// Admin pages
import AdminDashboard from '@/pages/AdminDashboard'
import AdminUserManagement from '@/pages/AdminUserManagement'
import AdminCourseManagement from '@/pages/AdminCourseManagement'
import AdminERPSync from '@/pages/AdminERPSync'

// Add qrcode.react dep shim — needs to be installed separately
// npm install qrcode.react
// For now we use a placeholder inline component in StartSessionModal

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <ToastProvider>
        <Routes>
          {/* ── Public ──────────────────────────────────────────── */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          {/* ── Student ─────────────────────────────────────────── */}
          <Route
            path="/student/dashboard"
            element={
              <ProtectedRoute roles={['student']}>
                <StudentDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/student/history"
            element={
              <ProtectedRoute roles={['student']}>
                <StudentAttendanceHistory />
              </ProtectedRoute>
            }
          />
          <Route
            path="/student/settings"
            element={
              <ProtectedRoute roles={['student']}>
                <SettingsPage />
              </ProtectedRoute>
            }
          />

          {/* ── Lecturer ────────────────────────────────────────── */}
          <Route
            path="/lecturer/dashboard"
            element={
              <ProtectedRoute roles={['lecturer']}>
                <LecturerDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/lecturer/sessions"
            element={
              <ProtectedRoute roles={['lecturer']}>
                <LecturerSessions />
              </ProtectedRoute>
            }
          />
          <Route
            path="/lecturer/courses"
            element={
              <ProtectedRoute roles={['lecturer']}>
                <LecturerCourses />
              </ProtectedRoute>
            }
          />
          <Route
            path="/lecturer/settings"
            element={
              <ProtectedRoute roles={['lecturer']}>
                <SettingsPage />
              </ProtectedRoute>
            }
          />

          {/* ── Admin ───────────────────────────────────────────── */}
          <Route
            path="/admin/dashboard"
            element={
              <ProtectedRoute roles={['admin']}>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/users"
            element={
              <ProtectedRoute roles={['admin']}>
                <AdminUserManagement />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/courses"
            element={
              <ProtectedRoute roles={['admin']}>
                <AdminCourseManagement />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/erp-sync"
            element={
              <ProtectedRoute roles={['admin']}>
                <AdminERPSync />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/settings"
            element={
              <ProtectedRoute roles={['admin']}>
                <SettingsPage />
              </ProtectedRoute>
            }
          />

          {/* ── 404 ─────────────────────────────────────────────── */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </ToastProvider>
    </BrowserRouter>
  </React.StrictMode>
)
