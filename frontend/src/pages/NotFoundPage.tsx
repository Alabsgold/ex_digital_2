import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Home, ArrowLeft } from 'lucide-react'

export default function NotFoundPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center text-center p-8"
      style={{ background: '#0A0A0F' }}>
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="text-8xl font-black neon-text mb-4">404</div>
        <h1 className="text-3xl font-bold text-white-text mb-3">Page Not Found</h1>
        <p className="text-muted max-w-sm mb-8 leading-relaxed">
          The page you're looking for doesn't exist or you don't have permission to access it.
        </p>
        <div className="flex flex-wrap gap-3 justify-center">
          <Link to="/" className="btn-primary px-6 py-3 inline-flex items-center gap-2">
            <Home size={16} /> Go Home
          </Link>
          <button onClick={() => window.history.back()} className="btn-secondary px-6 py-3 inline-flex items-center gap-2">
            <ArrowLeft size={16} /> Go Back
          </button>
        </div>
      </motion.div>
    </div>
  )
}
