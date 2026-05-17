import { useState } from 'react'
import { useLocation } from 'react-router-dom'
import { HelpCircle, X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

const HELP_CONTENT: Record<string, { title: string; tips: string[] }> = {
  '/student/dashboard': {
    title: 'Student Dashboard Help',
    tips: [
      'Tap "Mark Attendance" to open the QR scanner.',
      'If you can\'t scan, tap "Enter Code Manually" and type the 6-character code shown by your lecturer.',
      'Your attendance rate is updated in real time.',
      'Scans made offline are automatically synced when you reconnect.',
    ],
  },
  '/student/history': {
    title: 'Attendance History Help',
    tips: [
      'Use the filters to narrow down by course, date range, or status.',
      'Green = Present, Amber = Late, Red = Absent.',
      'Tap "Export" to download your records as a CSV file.',
    ],
  },
  '/lecturer/dashboard': {
    title: 'Lecturer Dashboard Help',
    tips: [
      'Click "Start Session" on any course card to begin an attendance session.',
      'A QR code and 6-digit code will be generated for students.',
      'You can see students scan in live without refreshing the page.',
      'Click "End Session" when done to stop new attendance marks.',
    ],
  },
  '/admin/dashboard': {
    title: 'Admin Dashboard Help',
    tips: [
      'Overview stats are refreshed every time you visit.',
      'Use the Quick Actions panel to manage users and courses.',
      'The ERP sync status shows whether attendance data is up to date.',
    ],
  },
  '/admin/users': {
    title: 'User Management Help',
    tips: [
      'Use the search bar to find users by name, email, or matric number.',
      'Click "Import CSV" to bulk-add students or lecturers.',
      'Deactivated users cannot log in but their records are preserved.',
      '"Reset Password" lets you set a new password for any user.',
    ],
  },
}

export default function HelpOverlay() {
  const [open, setOpen] = useState(false)
  const { pathname } = useLocation()

  const content = HELP_CONTENT[pathname] ?? {
    title: 'EX-Digital Help',
    tips: [
      'Navigate using the sidebar on the left.',
      'Your role determines which features you can access.',
      'Contact your administrator if you have issues accessing something.',
      'Your data is auto-saved and synced even when you go offline.',
    ],
  }

  return (
    <>
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 w-12 h-12 rounded-full flex items-center justify-center z-40 shadow-neon-md"
        style={{ background: 'rgba(0,255,136,0.15)', border: '1px solid rgba(0,255,136,0.3)' }}
        aria-label="Open help"
      >
        <HelpCircle size={22} className="text-neon-green" />
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-20 right-6 w-80 glass-card z-40 p-5"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-white-text text-sm">{content.title}</h3>
              <button onClick={() => setOpen(false)} className="text-muted hover:text-white-text transition-colors" aria-label="Close help">
                <X size={16} />
              </button>
            </div>
            <ul className="space-y-2.5">
              {content.tips.map((tip, i) => (
                <li key={i} className="flex items-start gap-2.5 text-xs text-muted leading-relaxed">
                  <span className="text-neon-green font-bold mt-0.5 flex-shrink-0">{i + 1}.</span>
                  {tip}
                </li>
              ))}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
