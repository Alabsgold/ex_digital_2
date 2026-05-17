import { motion, AnimatePresence } from 'framer-motion'
import LoadingSpinner from './LoadingSpinner'
import EmptyState from './EmptyState'

interface Column<T> {
  key: keyof T | string
  header: string
  render?: (value: any, row: T) => React.ReactNode
  className?: string
}

interface DataTableProps<T> {
  data: T[]
  columns: Column<T>[]
  keyField: keyof T
  isLoading?: boolean
  emptyTitle?: string
  emptyDescription?: string
  emptyIcon?: React.ReactNode
  onRowClick?: (row: T) => void
  totalPages?: number
  currentPage?: number
  onPageChange?: (page: number) => void
}

function Skeleton() {
  return (
    <div className="animate-pulse flex gap-3 py-4 px-6">
      {[60, 40, 25, 20].map((w, i) => (
        <div key={i} className="h-4 rounded" style={{ width: `${w}%`, background: 'rgba(255,255,255,0.06)' }} />
      ))}
    </div>
  )
}

export default function DataTable<T extends Record<string, any>>({
  data,
  columns,
  keyField,
  isLoading = false,
  emptyTitle = 'No data found',
  emptyDescription,
  emptyIcon,
  onRowClick,
  totalPages = 1,
  currentPage = 1,
  onPageChange,
}: DataTableProps<T>) {
  return (
    <div className="glass-card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr style={{ borderBottom: '1px solid rgba(0,255,136,0.08)' }}>
              {columns.map((col) => (
                <th
                  key={String(col.key)}
                  className={`text-left px-6 py-4 text-xs font-semibold text-muted uppercase tracking-wider ${col.className ?? ''}`}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                  <td colSpan={columns.length} className="p-0">
                    <Skeleton />
                  </td>
                </tr>
              ))
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={columns.length}>
                  <EmptyState title={emptyTitle} description={emptyDescription} icon={emptyIcon} />
                </td>
              </tr>
            ) : (
              <AnimatePresence>
                {data.map((row, idx) => (
                  <motion.tr
                    key={String(row[keyField])}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.03 }}
                    onClick={() => onRowClick?.(row)}
                    className={onRowClick ? 'cursor-pointer hover:bg-white/[0.03] transition-colors' : ''}
                    style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}
                  >
                    {columns.map((col) => (
                      <td key={String(col.key)} className={`px-6 py-4 text-white-text ${col.className ?? ''}`}>
                        {col.render
                          ? col.render(row[col.key as keyof T], row)
                          : String(row[col.key as keyof T] ?? '')}
                      </td>
                    ))}
                  </motion.tr>
                ))}
              </AnimatePresence>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && onPageChange && (
        <div className="flex items-center justify-between px-6 py-4" style={{ borderTop: '1px solid rgba(0,255,136,0.08)' }}>
          <button
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage <= 1}
            className="btn-secondary text-xs px-4 py-2 min-h-[36px] disabled:opacity-40"
          >
            Previous
          </button>
          <span className="text-xs text-muted">
            Page {currentPage} of {totalPages}
          </span>
          <button
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage >= totalPages}
            className="btn-secondary text-xs px-4 py-2 min-h-[36px] disabled:opacity-40"
          >
            Next
          </button>
        </div>
      )}
    </div>
  )
}
