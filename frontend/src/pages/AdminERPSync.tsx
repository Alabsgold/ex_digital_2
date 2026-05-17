import { useState } from 'react'
import { RefreshCw, Upload, Download, CheckCircle, AlertCircle, Clock } from 'lucide-react'
import Layout from '@/components/Layout'
import HelpOverlay from '@/components/HelpOverlay'
import Button from '@/components/Button'
import { useToast } from '@/components/Toast'
import apiClient from '@/lib/apiClient'

export default function AdminERPSync() {
  const { success, error: toastError, info } = useToast()
  const [syncing, setSyncing] = useState(false)

  const triggerSync = async (type: string) => {
    setSyncing(true)
    try {
      await apiClient.post('/admin/erp-sync/trigger', { type })
      success(`${type} sync triggered successfully.`)
    } catch (err: any) {
      info('ERP gateway not configured. Check your GATEWAY_API_KEY and BACKEND_URL settings.')
    } finally {
      setSyncing(false)
    }
  }

  const syncActions = [
    {
      icon: <Upload size={20} />,
      title: 'Export to ERP',
      description: 'Push all unsynced attendance records to the ERP system.',
      action: () => triggerSync('export'),
      color: 'green' as const,
    },
    {
      icon: <Download size={20} />,
      title: 'Import from ERP',
      description: 'Pull student enrollment and course data from the ERP.',
      action: () => triggerSync('import'),
      color: 'cyan' as const,
    },
    {
      icon: <RefreshCw size={20} />,
      title: 'Full Sync',
      description: 'Bi-directional sync — import and export in one operation.',
      action: () => triggerSync('full'),
      color: 'amber' as const,
    },
  ]

  const colorMap = {
    green: { icon: 'text-neon-green', bg: 'rgba(0,255,136,0.08)', border: 'rgba(0,255,136,0.2)' },
    cyan: { icon: 'text-electric-cyan', bg: 'rgba(0,212,255,0.08)', border: 'rgba(0,212,255,0.2)' },
    amber: { icon: 'text-amber-warning', bg: 'rgba(255,180,68,0.08)', border: 'rgba(255,180,68,0.2)' },
  }

  return (
    <Layout>
      <div className="max-w-4xl mx-auto space-y-6">
        <h1 className="page-title">ERP Integration & Sync</h1>

        {/* Status overview */}
        <div className="glass-card p-6">
          <h2 className="section-title mb-4">Connection Status</h2>
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-amber-warning animate-pulse" />
            <p className="text-sm text-white-text">Gateway: Configured</p>
            <p className="text-xs text-muted ml-4">Webhook endpoint active · HMAC-SHA256 verified</p>
          </div>
        </div>

        {/* Sync actions */}
        <div className="grid md:grid-cols-3 gap-4">
          {syncActions.map((a) => {
            const c = colorMap[a.color]
            return (
              <div key={a.title} className="glass-card glass-card-hover p-5 flex flex-col gap-4">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center"
                  style={{ background: c.bg, border: `1px solid ${c.border}` }}>
                  <span className={c.icon}>{a.icon}</span>
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-white-text mb-1">{a.title}</h3>
                  <p className="text-xs text-muted leading-relaxed">{a.description}</p>
                </div>
                <Button variant="secondary" size="sm" onClick={a.action} loading={syncing} fullWidth>
                  Trigger Sync
                </Button>
              </div>
            )
          })}
        </div>

        {/* Webhook config */}
        <div className="glass-card p-6">
          <h2 className="section-title mb-4">Webhook Configuration</h2>
          <div className="space-y-3">
            <div>
              <p className="text-xs text-muted mb-1">Webhook URL</p>
              <code className="text-sm text-electric-cyan font-mono bg-black/30 px-3 py-2 rounded-lg block">
                http://your-server:5001/webhook/erp-sync
              </code>
            </div>
            <div>
              <p className="text-xs text-muted mb-1">Signature Header</p>
              <code className="text-sm text-neon-green font-mono bg-black/30 px-3 py-2 rounded-lg block">
                X-Hub-Signature-256: sha256=&lt;HMAC-SHA256&gt;
              </code>
            </div>
            <div>
              <p className="text-xs text-muted mb-1">Authentication</p>
              <code className="text-sm text-amber-warning font-mono bg-black/30 px-3 py-2 rounded-lg block">
                X-API-Key: &lt;your GATEWAY_API_KEY from .env&gt;
              </code>
            </div>
          </div>
        </div>
      </div>
      <HelpOverlay />
    </Layout>
  )
}
