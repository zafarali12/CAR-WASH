// components/ui/LoadingSpinner.tsx
export function LoadingSpinner({ size = 'md', color = 'primary' }: {
  size?: 'sm' | 'md' | 'lg'
  color?: 'primary' | 'green' | 'white'
}) {
  const sizes = { sm: 'h-4 w-4', md: 'h-8 w-8', lg: 'h-12 w-12' }
  const colors = { primary: 'border-primary-600', green: 'border-green-600', white: 'border-white' }
  return (
    <div className={`animate-spin rounded-full border-2 border-gray-100 ${sizes[size]} ${colors[color]} border-t-transparent`} />
  )
}

// components/ui/EmptyState.tsx
export function EmptyState({ icon, title, description, action }: {
  icon?: string
  title: string
  description?: string
  action?: { label: string; onClick: () => void }
}) {
  return (
    <div className="text-center py-16">
      {icon && <div className="text-5xl mb-4">{icon}</div>}
      <h3 className="font-semibold text-gray-900 mb-1">{title}</h3>
      {description && <p className="text-sm text-gray-400 mb-4">{description}</p>}
      {action && (
        <button onClick={action.onClick} className="btn-primary mx-auto">{action.label}</button>
      )}
    </div>
  )
}

// components/ui/PageHeader.tsx
export function PageHeader({ title, subtitle, action }: {
  title: string
  subtitle?: string
  action?: React.ReactNode
}) {
  return (
    <div className="flex items-start justify-between mb-6">
      <div>
        <h1 className="page-title">{title}</h1>
        {subtitle && <p className="text-sm text-gray-400 mt-0.5">{subtitle}</p>}
      </div>
      {action && <div>{action}</div>}
    </div>
  )
}

// components/ui/StatCard.tsx
export function StatCard({ label, value, sub, icon: Icon, trend }: {
  label: string
  value: string | number
  sub?: string
  icon?: any
  trend?: number
}) {
  return (
    <div className="stat-card p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-gray-400 mb-1">{label}</p>
          <p className="text-2xl font-semibold text-gray-900">{value}</p>
          {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
        </div>
        {Icon && (
          <div className="p-2 rounded-lg bg-primary-50 text-primary-600">
            <Icon size={18} />
          </div>
        )}
      </div>
      {trend !== undefined && (
        <div className={`flex items-center gap-1 mt-2 text-xs font-medium ${trend >= 0 ? 'text-green-600' : 'text-red-600'}`}>
          <span>{trend >= 0 ? '↑' : '↓'}</span>
          <span>{Math.abs(trend).toFixed(1)}%</span>
        </div>
      )}
    </div>
  )
}

// components/ui/Badge.tsx
export function Badge({ status }: { status: string }) {
  const classMap: Record<string, string> = {
    pending: 'badge-pending',
    assigned: 'badge-assigned',
    driver_on_way: 'badge-assigned',
    in_progress: 'badge-active',
    completed: 'badge-completed',
    cancelled: 'badge-cancelled',
    active: 'badge-active',
    approved: 'badge-active',
    blocked: 'badge-cancelled',
    paid: 'badge-active',
    failed: 'badge-cancelled',
  }
  return (
    <span className={classMap[status] || 'badge'}>
      {status.replace(/_/g, ' ')}
    </span>
  )
}

// components/ui/ConfirmDialog.tsx
export function ConfirmDialog({ open, title, message, confirmLabel, onConfirm, onCancel, danger = false }: {
  open: boolean
  title: string
  message: string
  confirmLabel?: string
  onConfirm: () => void
  onCancel: () => void
  danger?: boolean
}) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl">
        <h3 className="font-semibold text-lg mb-2">{title}</h3>
        <p className="text-sm text-gray-500 mb-5">{message}</p>
        <div className="flex gap-3">
          <button className="btn-secondary flex-1" onClick={onCancel}>Cancel</button>
          <button className={`flex-1 ${danger ? 'btn-danger' : 'btn-primary'}`} onClick={onConfirm}>
            {confirmLabel || 'Confirm'}
          </button>
        </div>
      </div>
    </div>
  )
}
