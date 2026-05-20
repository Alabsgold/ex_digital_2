/**
 * BarcodeScannerModal — High-performance live barcode scanner using ZXing.
 *
 * Why ZXing (@zxing/browser + @zxing/library)?
 *  • Google's ZXing ("Zebra Crossing") is the industry-standard barcode library
 *  • Native Code-128 decoding — the exact format on student ID cards
 *  • Works directly with a native <video> element (no hidden divs or iframes)
 *  • BrowserMultiFormatReader with CODE_128 hints = ~10× faster than generic scanners
 *  • timeBetweenScansMillis = 300ms prevents CPU thrash while keeping it responsive
 *
 * Security:
 *  • Distinct overlays for: "not registered", "not enrolled", "already marked"
 *  • Auto-resumes after 1.8 s
 */
import { useEffect, useRef, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, CameraOff, CheckCircle, AlertCircle, UserX, ShieldAlert, Loader } from 'lucide-react'
import { BrowserMultiFormatReader } from '@zxing/browser'
import {
  DecodeHintType,
  BarcodeFormat,
  NotFoundException,
} from '@zxing/library'
import { useSessionStore } from '@/store/sessionStore'

interface BarcodeScannerModalProps {
  isOpen: boolean
  onClose: () => void
  sessionId: string
  courseName: string
}

// ── Error classification ───────────────────────────────────────────────────────
type RejectionKind =
  | 'not_registered'
  | 'not_enrolled'
  | 'already_marked'
  | 'session_expired'
  | 'generic'

interface ScanResult {
  kind: 'success' | RejectionKind
  matric: string
  studentName?: string
  message: string
}

function classifyError(err: any): { kind: RejectionKind; message: string } {
  const status: number = err?.response?.status ?? 0
  const detail: string = err?.response?.data?.detail ?? err?.message ?? ''

  if (status === 404) {
    if (detail.toLowerCase().includes('session')) {
      return { kind: 'session_expired', message: 'Session has expired or does not exist.' }
    }
    return {
      kind: 'not_registered',
      message: 'This matric number is NOT registered in the EX-AMS system.',
    }
  }
  if (status === 400) {
    return {
      kind: 'not_enrolled',
      message: 'Student is registered but NOT enrolled in this course.',
    }
  }
  if (status === 409) {
    return {
      kind: 'already_marked',
      message: 'Attendance already marked for this student in this session.',
    }
  }
  return { kind: 'generic', message: detail || 'Failed to mark attendance.' }
}

// ── ZXing hints: restrict to Code-128, QR and Code-39 for maximum speed ──────
function createZXingReader(): BrowserMultiFormatReader {
  const hints = new Map()
  hints.set(DecodeHintType.POSSIBLE_FORMATS, [
    BarcodeFormat.CODE_128,   // Primary: student ID barcodes
    BarcodeFormat.QR_CODE,    // Fallback: QR codes
    BarcodeFormat.CODE_39,    // Fallback: some ID cards use Code-39
  ])
  hints.set(DecodeHintType.TRY_HARDER, true)  // Try harder for partial/angled barcodes
  return new BrowserMultiFormatReader(hints, {
    delayBetweenScanAttempts: 300,  // scan every 300 ms
    delayBetweenScanSuccess: 1500,  // wait 1.5 s before accepting a second scan of same code
  })
}

// ── Component ──────────────────────────────────────────────────────────────────

export default function BarcodeScannerModal({
  isOpen,
  onClose,
  sessionId,
  courseName,
}: BarcodeScannerModalProps) {
  const { scanBarcode } = useSessionStore()

  const videoRef = useRef<HTMLVideoElement>(null)
  const readerRef = useRef<BrowserMultiFormatReader | null>(null)
  const controlsRef = useRef<{ stop: (cb?: (err?: Error) => void) => void } | null>(null)
  const lockRef = useRef(false)
  const mountedRef = useRef(false)

  const [cameraReady, setCameraReady] = useState(false)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [result, setResult] = useState<ScanResult | null>(null)
  const [totalMarked, setTotalMarked] = useState(0)
  const [isProcessing, setIsProcessing] = useState(false)

  // ── Decode handler ──────────────────────────────────────────────────────────

  const onDecode = useCallback(async (rawText: string) => {
    if (lockRef.current || !mountedRef.current) return
    lockRef.current = true

    const matric = rawText.trim().toUpperCase()
    if (!matric) { lockRef.current = false; return }

    setIsProcessing(true)
    setResult(null)

    try {
      const resp = await scanBarcode(sessionId, matric) as any
      if (!mountedRef.current) return
      const studentName = resp?.student_name as string | undefined
      setResult({ kind: 'success', matric, studentName, message: 'Attendance marked successfully' })
      setTotalMarked((n) => n + 1)
    } catch (err: any) {
      if (!mountedRef.current) return
      const { kind, message } = classifyError(err)
      setResult({ kind, matric, message })
    } finally {
      if (mountedRef.current) setIsProcessing(false)
      setTimeout(() => {
        if (mountedRef.current) {
          setResult(null)
          lockRef.current = false
        }
      }, 1800)
    }
  }, [sessionId, scanBarcode])

  // ── Start camera using ZXing ────────────────────────────────────────────────

  const startCamera = useCallback(async () => {
    if (!mountedRef.current || !videoRef.current) return
    setCameraError(null)
    setCameraReady(false)
    lockRef.current = false

    try {
      // Stop any existing reader
      controlsRef.current?.stop()
      controlsRef.current = null
      readerRef.current = null

      const reader = createZXingReader()
      readerRef.current = reader

      // Ask ZXing to pick the best back-facing camera automatically
      const controls = await reader.decodeFromVideoDevice(
        undefined,       // undefined = let ZXing choose best camera (rear-facing preferred)
        videoRef.current,
        (result, error) => {
          if (!mountedRef.current) return
          if (result) {
            // Valid scan detected
            onDecode(result.getText())
          } else if (error && !(error instanceof NotFoundException)) {
            // NotFoundException is normal (no barcode in frame) — ignore it
            // Only log real errors
            console.warn('[ZXing] scan error:', error.message)
          }
        }
      )
      controlsRef.current = controls

      if (mountedRef.current) setCameraReady(true)
    } catch (err: any) {
      if (!mountedRef.current) return
      const msg = err?.message?.toLowerCase() ?? ''
      if (msg.includes('permission') || msg.includes('denied') || msg.includes('notallowed')) {
        setCameraError('Camera permission denied. Please allow camera access and try again.')
      } else if (msg.includes('not found') || msg.includes('no device') || msg.includes('notfound')) {
        setCameraError('No camera found on this device.')
      } else {
        setCameraError(`Could not start camera: ${err?.message ?? 'Unknown error'}. Try Chrome or Edge.`)
      }
    }
  }, [onDecode])

  // ── Stop camera ─────────────────────────────────────────────────────────────

  const stopCamera = useCallback(() => {
    try {
      controlsRef.current?.stop()
    } catch { /* ignore */ }
    controlsRef.current = null
    readerRef.current = null
    setCameraReady(false)
  }, [])

  // ── Modal lifecycle ─────────────────────────────────────────────────────────

  useEffect(() => {
    mountedRef.current = true
    if (isOpen) {
      setResult(null)
      setIsProcessing(false)
      setTotalMarked(0)
      // Small delay to ensure video element is in the DOM
      const t = setTimeout(() => startCamera(), 200)
      return () => clearTimeout(t)
    } else {
      stopCamera()
    }
    return () => {
      mountedRef.current = false
      stopCamera()
    }
  }, [isOpen])

  // ── Overlay content ─────────────────────────────────────────────────────────

  const overlayForResult = (r: ScanResult) => {
    if (r.kind === 'success') {
      return {
        bg: 'rgba(0,255,136,0.92)',
        icon: <CheckCircle size={40} className="text-white" />,
        title: r.studentName ?? r.matric,
        sub: '✓ Attendance marked',
        subColor: 'rgba(255,255,255,0.85)',
      }
    }
    if (r.kind === 'not_registered') {
      return {
        bg: 'rgba(120,0,0,0.93)',
        icon: <UserX size={40} className="text-white" />,
        title: r.matric,
        sub: '⛔ Not registered in EX-AMS',
        subColor: '#FFB4B4',
      }
    }
    if (r.kind === 'not_enrolled') {
      return {
        bg: 'rgba(140,60,0,0.93)',
        icon: <ShieldAlert size={40} className="text-white" />,
        title: r.matric,
        sub: '⚠ Not enrolled in this course',
        subColor: '#FFCF9C',
      }
    }
    if (r.kind === 'already_marked') {
      return {
        bg: 'rgba(0,80,150,0.93)',
        icon: <AlertCircle size={40} className="text-white" />,
        title: r.matric,
        sub: '📋 Already marked this session',
        subColor: '#9CCFFF',
      }
    }
    if (r.kind === 'session_expired') {
      return {
        bg: 'rgba(60,0,100,0.93)',
        icon: <AlertCircle size={40} className="text-white" />,
        title: r.matric,
        sub: '🕒 Session expired',
        subColor: '#D9B4FF',
      }
    }
    return {
      bg: 'rgba(60,60,60,0.93)',
      icon: <AlertCircle size={40} className="text-white" />,
      title: r.matric,
      sub: r.message,
      subColor: '#ccc',
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-[60] flex items-center justify-center p-3"
          style={{ background: 'rgba(0,0,0,0.9)', backdropFilter: 'blur(10px)' }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="w-full max-w-sm rounded-2xl overflow-hidden flex flex-col"
            style={{ background: '#0D0D14', border: '1px solid rgba(255,255,255,0.1)', maxHeight: '90vh' }}
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
          >
            {/* ── Header ─────────────────────────────────────────────────── */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.07] flex-shrink-0">
              <div className="min-w-0">
                <p className="text-xs font-semibold text-white-text truncate">ID Card Scanner</p>
                <p className="text-[11px] text-muted truncate">{courseName}</p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                {totalMarked > 0 && (
                  <span className="text-[11px] px-2 py-0.5 rounded-full font-semibold"
                    style={{ background: 'rgba(0,255,136,0.15)', color: '#00FF88' }}>
                    {totalMarked} marked
                  </span>
                )}
                <button
                  onClick={onClose}
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-muted hover:text-white-text transition-colors"
                  style={{ background: 'rgba(255,255,255,0.05)' }}
                  aria-label="Close scanner"
                >
                  <X size={15} />
                </button>
              </div>
            </div>

            {/* ── Camera viewport ───────────────────────────────────────── */}
            <div className="relative flex-shrink-0" style={{ background: '#000', aspectRatio: '16/10' }}>
              {/* ZXing renders into this native <video> element */}
              <video
                ref={videoRef}
                className="absolute inset-0 w-full h-full object-cover"
                style={{ display: cameraError ? 'none' : 'block' }}
                muted
                playsInline
              />

              {/* ── Scanning guide overlay ── */}
              {cameraReady && !result && !isProcessing && !cameraError && (
                <div className="absolute inset-0 pointer-events-none">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div
                      className="relative"
                      style={{ width: '88%', height: '38%' }}
                    >
                      {/* Vignette */}
                      <div
                        className="absolute inset-0"
                        style={{ boxShadow: '0 0 0 9999px rgba(0,0,0,0.5)', borderRadius: 4 }}
                      />
                      {/* Green border */}
                      <div
                        className="absolute inset-0 rounded-sm"
                        style={{ border: '2px solid rgba(0,255,136,0.8)' }}
                      />
                      {/* Corner accents */}
                      {[
                        'top-[-2px] left-[-2px] border-t-[3px] border-l-[3px]',
                        'top-[-2px] right-[-2px] border-t-[3px] border-r-[3px]',
                        'bottom-[-2px] left-[-2px] border-b-[3px] border-l-[3px]',
                        'bottom-[-2px] right-[-2px] border-b-[3px] border-r-[3px]',
                      ].map((cls, i) => (
                        <div key={i} className={`absolute w-6 h-6 border-neon-green ${cls}`} />
                      ))}
                      {/* Sweep line */}
                      <motion.div
                        className="absolute left-0 right-0 h-[2px]"
                        style={{ background: 'linear-gradient(90deg, transparent 0%, #00FF88 50%, transparent 100%)' }}
                        animate={{ top: ['5%', '95%', '5%'] }}
                        transition={{ duration: 1.6, repeat: Infinity, ease: 'linear' }}
                      />
                    </div>
                  </div>
                  {/* Hint */}
                  <div className="absolute bottom-3 inset-x-0 text-center">
                    <span className="text-[11px] text-white/60 bg-black/40 px-3 py-1 rounded-full">
                      Align barcode inside the frame
                    </span>
                  </div>
                </div>
              )}

              {/* ── Starting camera ── */}
              {!cameraReady && !cameraError && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80">
                  <Loader size={28} className="text-neon-green animate-spin mb-2" />
                  <p className="text-xs text-muted">Starting camera…</p>
                </div>
              )}

              {/* ── Processing overlay ── */}
              {isProcessing && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/75">
                  <Loader size={32} className="text-electric-cyan animate-spin mb-2" />
                  <p className="text-xs text-white-text">Verifying…</p>
                </div>
              )}

              {/* ── Result overlay ── */}
              <AnimatePresence>
                {result && (
                  <motion.div
                    key={result.kind + result.matric}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                    className="absolute inset-0 flex flex-col items-center justify-center px-4"
                    style={{ background: overlayForResult(result).bg }}
                  >
                    <div className="mb-3">{overlayForResult(result).icon}</div>
                    <p className="text-base font-bold text-white font-mono text-center leading-snug">
                      {overlayForResult(result).title}
                    </p>
                    <p
                      className="text-sm font-semibold mt-2 text-center"
                      style={{ color: overlayForResult(result).subColor }}
                    >
                      {overlayForResult(result).sub}
                    </p>
                    {result.kind !== 'success' && (
                      <p className="text-[11px] mt-2 text-center text-white/50">
                        {result.message}
                      </p>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* ── Camera error ── */}
              {cameraError && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black p-5 text-center">
                  <CameraOff size={40} className="text-soft-red mb-3" />
                  <p className="text-sm text-white-text font-medium mb-2">Camera unavailable</p>
                  <p className="text-[11px] text-muted leading-relaxed">{cameraError}</p>
                  <button
                    onClick={() => startCamera()}
                    className="mt-4 text-xs px-4 py-2 rounded-lg"
                    style={{ background: 'rgba(0,255,136,0.1)', color: '#00FF88', border: '1px solid rgba(0,255,136,0.3)' }}
                  >
                    Retry
                  </button>
                </div>
              )}
            </div>

            {/* ── Status bar ──────────────────────────────────────────────── */}
            <div className="px-4 py-2.5 flex items-center justify-between flex-shrink-0 border-t border-white/[0.05]">
              <div className="flex items-center gap-2 text-[11px]">
                {isProcessing ? (
                  <>
                    <span className="w-1.5 h-1.5 rounded-full bg-electric-cyan animate-pulse" />
                    <span className="text-electric-cyan">Verifying with server…</span>
                  </>
                ) : result?.kind === 'success' ? (
                  <>
                    <span className="w-1.5 h-1.5 rounded-full bg-neon-green" />
                    <span className="text-neon-green">Marked — resuming scan</span>
                  </>
                ) : result ? (
                  <>
                    <span className="w-1.5 h-1.5 rounded-full bg-soft-red" />
                    <span className="text-soft-red">Rejected — resuming scan</span>
                  </>
                ) : cameraReady ? (
                  <>
                    <span className="w-1.5 h-1.5 rounded-full bg-neon-green animate-pulse" />
                    <span className="text-neon-green">Live — ready to scan</span>
                  </>
                ) : (
                  <>
                    <span className="w-1.5 h-1.5 rounded-full bg-muted" />
                    <span className="text-muted">Starting…</span>
                  </>
                )}
              </div>
              <span className="text-[10px] text-muted/60">ZXing · Code-128 · QR · Code-39</span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
