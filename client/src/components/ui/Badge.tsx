interface BadgeProps {
  variant: string
  children: React.ReactNode
}

const styles: Record<string, string> = {
  // submission status
  pending: 'bg-yellow-100 text-yellow-800',
  reviewed: 'bg-green-100 text-green-700',
  late: 'bg-orange-100 text-orange-700',
  'not-started': 'bg-gray-100 text-gray-600',
  // class status
  active: 'bg-green-100 text-green-700',
  'ACTIVE': 'bg-green-100 text-green-700',
  inactive: 'bg-gray-100 text-gray-500',
  'INACTIVE': 'bg-gray-100 text-gray-500',
  disabled: 'bg-gray-100 text-gray-500',
  // problem type
  'type-dsa': 'bg-blue-100 text-blue-700',
  'type-os': 'bg-green-100 text-green-700',
  'type-database': 'bg-purple-100 text-purple-700',
  'type-other': 'bg-gray-100 text-gray-600',
  // legacy difficulty (kept for any remaining references)
  easy: 'bg-green-100 text-green-800',
  medium: 'bg-yellow-100 text-yellow-800',
  hard: 'bg-red-100 text-red-800',
  // roles
  'role-admin': 'bg-purple-100 text-purple-700',
  'role-trainer': 'bg-blue-100 text-blue-700',
  'role-student': 'bg-red-100 text-red-700',
  // old
  submitted: 'bg-blue-100 text-blue-700',
  'needs-revision': 'bg-red-100 text-red-700',
  'awaiting-review': 'bg-yellow-100 text-yellow-700',
}

export function Badge({ variant, children }: BadgeProps) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${styles[variant] || 'bg-gray-100 text-gray-600'}`}>
      {children}
    </span>
  )
}

export function TypeBadge({ type }: { type: string }) {
  const map: Record<string, string> = {
    DSA: 'type-dsa',
    OS: 'type-os',
    Database: 'type-database',
    Other: 'type-other',
  }
  return <Badge variant={map[type] || 'type-other'}>{type}</Badge>
}

export function StatusDot({ status }: { status: string }) {
  const colors: Record<string, string> = {
    'not-started': 'bg-gray-400',
    submitted: 'bg-blue-500',
    pending: 'bg-yellow-500',
    reviewed: 'bg-green-500',
    late: 'bg-orange-500',
    'needs-revision': 'bg-red-500',
    'awaiting-review': 'bg-yellow-500',
    'PENDING': 'bg-yellow-500',
    'REVIEWED': 'bg-green-500',
    'LATE': 'bg-orange-500',
  }
  return <span className={`inline-block w-2 h-2 rounded-full ${colors[status] || 'bg-gray-400'} mr-1.5`} />
}
