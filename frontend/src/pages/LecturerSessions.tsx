import { useEffect, useState } from 'react'
import { Play } from 'lucide-react'
import { useSessionStore } from '@/store/sessionStore'
import Layout from '@/components/Layout'
import HelpOverlay from '@/components/HelpOverlay'
import StartSessionModal from '@/components/StartSessionModal'
import { StatusBadge } from '@/components/Badge'

export default function LecturerSessions() {
  const { activeSessions, fetchActiveSessions } = useSessionStore()
  const [modalOpen, setModalOpen] = useState(false)

  useEffect(() => { fetchActiveSessions() }, [])

  return (
    <Layout>
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="page-title">Sessions</h1>
          <button onClick={() => setModalOpen(true)} className="btn-primary text-sm px-5 py-2.5 min-h-[44px]">
            <Play size={14} /> Start New Session
          </button>
        </div>

        {/* Active sessions */}
        <div className="glass-card p-5">
          <h2 className="section-title mb-4 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-neon-green animate-pulse" />
            Active Sessions
          </h2>
          {activeSessions.length === 0 ? (
            <p className="text-sm text-muted text-center py-8">No active sessions. Start one above.</p>
          ) : (
            <div className="space-y-3">
              {activeSessions.map((s) => (
                <div key={s.id} className="flex items-center justify-between p-4 rounded-xl"
                  style={{ background: 'rgba(0,255,136,0.04)', border: '1px solid rgba(0,255,136,0.15)' }}>
                  <div>
                    <p className="font-semibold text-white-text">{s.course_name}</p>
                    <p className="text-xs font-mono text-muted mt-1">
                      Code: <span className="text-neon-green font-bold tracking-widest">{s.session_code}</span>
                      {s.venue && ` · ${s.venue}`}
                    </p>
                  </div>
                  <div className="text-right">
                    <StatusBadge status="active" />
                    <p className="text-xs text-muted mt-1">{s.attendee_count} students</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <StartSessionModal isOpen={modalOpen} onClose={() => setModalOpen(false)} />
      <HelpOverlay />
    </Layout>
  )
}
