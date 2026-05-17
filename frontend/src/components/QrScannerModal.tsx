import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Camera, CameraOff, Keyboard } from 'lucide-react'
import { Html5Qrcode } from 'html5-qrcode'
import { useToast } from '@/components/Toast'
import { useAttendanceStore } from '@/store/attendanceStore'
import { enqueue } from '@/lib/offlineQueue'
import { useNetworkStatus } from '@/lib/useNetworkStatus'
import apiClient from '@/lib/apiClient'
import Button from '@/components/Button'
import Input from '@/components/Input'

interface QrScannerModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function QrScannerModal({ isOpen, onClose }: QrScannerModalProps) {
  const { isOnline } = useNetworkStatus()
  const { success, error: toastError, warning } = useToast()
  const [mode, setMode] = useState<'scanner' | 'manual'>('scanner')
  const [manualCode, setManualCode] = useState('')
  const [scanning, setScanning] = useState(false)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const scannerRef = useRef<Html5Qrcode | null>(null)
  const processingRef = useRef(false)

  const startScanner = async () => {
    setCameraError(null)
    setScanning(false)
    try {
      const html5Qr = new Html5Qrcode('qr-reader')
      scannerRef.current = html5Qr
      await html5Qr.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 220, height: 220 } },
        (text) => handleScan(text),
        () => {}
      )
      setScanning(true)
    } catch (err: any) {
      setCameraError('Camera access denied. Please use manual code entry below.')
      setMode('manual')
    }
  }

  const stopScanner = async () => {
    try {
      if (scannerRef.current?.isScanning) {
        await scannerRef.current.stop()
      }
    } catch {}
    setScanning(false)
  }

  useEffect(() => {
    if (isOpen && mode === 'scanner') {
      setTimeout(startScanner, 300)
    }
    return () => { stopScanner() }
  }, [isOpen, mode])

  useEffect(() => {
    if (!isOpen) {
      stopScanner()
      setManualCode('')
      setCameraError(null)
      processingRef.current = false
    }
  }, [isOpen])

  const handleScan = async (qrUuid: string) => {
    if (processingRef.current) return
    processingRef.current = true
    await stopScanner()
    await submitScan({ qr_uuid: qrUuid })
    processingRef.current = false
  }

  const submitScan = async ({ qr_uuid, session_code }: { qr_uuid?: string; session_code?: string }) => {
    const timestamp = new Date().toISOString()
    if (!isOnline) {
      await enqueue({ qr_uuid, session_code, timestamp })
      success('Scan queued! Will sync when you\'re back online.')
      onClose()
      return
    }

    setSubmitting(true)
    try {
      const { data } = await apiClient.post('/attendance/rapid-scan', {
        scans: [{ qr_uuid, session_code, timestamp }],
      })
      const result = data.results[0]
      if (result?.status === 'marked') {
        success(`Attendance marked! ${result.course_name ? `Course: ${result.course_name}` : ''}`)
        onClose()
      } else if (result?.status === 'already_marked') {
        warning('Attendance already recorded for this session.')
        onClose()
      } else {
        toastError(result?.message || 'Failed to mark attendance.')
        if (mode === 'scanner') setTimeout(startScanner, 1000)
      }
    } catch (err: any) {
      toastError(err.response?.data?.detail || 'Network error. Try again.')
      if (mode === 'scanner') setTimeout(startScanner, 1500)
    } finally {
      setSubmitting(false)
    }
  }

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!manualCode || manualCode.length < 6) {
      toastError('Please enter the 6-character session code.')
      return
    }
    await submitScan({ session_code: manualCode.trim().toUpperCase() })
    setManualCode('')
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(6px)' }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="glass-card w-full max-w-sm"
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
            transition={{ duration: 0.25 }}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-5 pb-4">
              <h2 className="font-bold text-white-text">Mark Attendance</h2>
              <button onClick={onClose} className="text-muted hover:text-white-text transition-colors p-1" aria-label="Close">
                <X size={18} />
              </button>
            </div>

            {/* Mode tabs */}
            <div className="px-5 flex gap-2 mb-4">
              <button
                onClick={() => setMode('scanner')}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  mode === 'scanner'
                    ? 'text-neon-green bg-neon-green/10 border border-neon-green/25'
                    : 'text-muted hover:text-white-text'
                }`}
              >
                <Camera size={14} /> QR Scan
              </button>
              <button
                onClick={() => setMode('manual')}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  mode === 'manual'
                    ? 'text-neon-green bg-neon-green/10 border border-neon-green/25'
                    : 'text-muted hover:text-white-text'
                }`}
              >
                <Keyboard size={14} /> Enter Code
              </button>
            </div>

            <div className="px-5 pb-5">
              {mode === 'scanner' ? (
                <div>
                  {/* QR viewfinder */}
                  <div className="relative overflow-hidden rounded-2xl mb-4"
                    style={{ background: '#000', aspectRatio: '1', border: '1px solid rgba(0,255,136,0.2)' }}>
                    <div id="qr-reader" className="w-full h-full" />

                    {/* Animated corners */}
                    {scanning && (
                      <div className="absolute inset-4 animate-viewfinder pointer-events-none">
                        {[
                          'top-0 left-0 border-t-2 border-l-2',
                          'top-0 right-0 border-t-2 border-r-2',
                          'bottom-0 left-0 border-b-2 border-l-2',
                          'bottom-0 right-0 border-b-2 border-r-2',
                        ].map((cls, i) => (
                          <div key={i} className={`absolute w-6 h-6 ${cls} border-neon-green`} />
                        ))}
                        {/* Scan line */}
                        <div className="absolute inset-x-0 h-0.5 top-1/2 animate-scan-line"
                          style={{ background: 'linear-gradient(90deg, transparent, #00FF88, transparent)' }} />
                      </div>
                    )}

                    {!scanning && !cameraError && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="text-center">
                          <Camera size={48} className="text-muted mx-auto mb-2" />
                          <p className="text-sm text-muted">Starting camera...</p>
                        </div>
                      </div>
                    )}

                    {cameraError && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/80">
                        <div className="text-center px-6">
                          <CameraOff size={40} className="text-soft-red mx-auto mb-3" />
                          <p className="text-sm text-muted">{cameraError}</p>
                        </div>
                      </div>
                    )}
                  </div>
                  {scanning && (
                    <p className="text-center text-xs text-muted mb-4">
                      Point your camera at the QR code displayed by your lecturer
                    </p>
                  )}
                </div>
              ) : (
                <form onSubmit={handleManualSubmit} className="space-y-4">
                  <div>
                    <p className="text-sm text-muted mb-3">
                      Ask your lecturer for the 6-character session code and type it below.
                    </p>
                    <Input
                      label="Session Code"
                      value={manualCode}
                      onChange={(e) => setManualCode(e.target.value.toUpperCase())}
                      placeholder="e.g. AB12CD"
                      className="font-mono text-center text-2xl tracking-widest"
                      maxLength={6}
                      autoFocus
                    />
                  </div>
                  <Button type="submit" variant="primary" fullWidth loading={submitting}>
                    Submit Code
                  </Button>
                </form>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
