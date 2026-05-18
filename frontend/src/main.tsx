import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'

import '@/index.css'

import { ToastProvider } from '@/components/Toast'
import ProtectedRoute from '@/components/ProtectedRoute'

import { Suspense, lazy } from 'react'

// Public pages
const LandingPage = lazy(() => import('@/pages/LandingPage'))
const LoginPage = lazy(() => import('@/pages/LoginPage'))
const RegisterPage = lazy(() => import('@/pages/RegisterPage'))
const NotFoundPage = lazy(() => import('@/pages/NotFoundPage'))

// Student pages
const StudentDashboard = lazy(() => import('@/pages/StudentDashboard'))
const StudentAttendanceHistory = lazy(() => import('@/pages/StudentAttendanceHistory'))
const SettingsPage = lazy(() => import('@/pages/SettingsPage'))

// Lecturer pages
const LecturerDashboard = lazy(() => import('@/pages/LecturerDashboard'))
const LecturerSessions = lazy(() => import('@/pages/LecturerSessions'))
const LecturerCourses = lazy(() => import('@/pages/LecturerCourses'))

// Admin pages
const AdminDashboard = lazy(() => import('@/pages/AdminDashboard'))
const AdminUserManagement = lazy(() => import('@/pages/AdminUserManagement'))
const AdminCourseManagement = lazy(() => import('@/pages/AdminCourseManagement'))
const AdminERPSync = lazy(() => import('@/pages/AdminERPSync'))

// Add qrcode.react dep shim — needs to be installed separately
// npm install qrcode.react
// For now we use a placeholder inline component in StartSessionModal

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <ToastProvider>
        <Suspense fallback={<div className="flex h-screen items-center justify-center bg-dark"><div className="w-8 h-8 border-2 border-brand-primary border-t-transparent rounded-full animate-spin"></div></div>}>
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
          <Route path="/admin" element={<ProtectedRoute roles={['admin']}><AdminDashboard /></ProtectedRoute>} />
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
        </Suspense>
      </ToastProvider>
    </BrowserRouter>
  </React.StrictMode>
)
