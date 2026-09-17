type BadgeProps = {
  variant: string
  children: React.ReactNode
}

const variantClasses: Record<string, string> = {
  // Status
  ACTIVE: 'bg-green-100 text-green-700',
  active: 'bg-green-100 text-green-700',
  INACTIVE: 'bg-gray-100 text-gray-500',
  inactive: 'bg-gray-100 text-gray-500',
  pending: 'bg-orange-100 text-orange-600',
  reviewed: 'bg-green-100 text-green-700',
  late: 'bg-red-100 text-red-600',
  // Difficulty
  easy: 'bg-green-100 text-green-700',
  medium: 'bg-orange-100 text-orange-600',
  hard: 'bg-red-100 text-red-600',
  // Type
  DSA: 'bg-orange-100 text-orange-700',
  OS: 'bg-purple-100 text-purple-700',
  Database: 'bg-green-100 text-green-700',
  Other: 'bg-gray-100 text-gray-600',
}

export function Badge({ variant, children }: BadgeProps) {
  const cls = variantClasses[variant] ?? 'bg-gray-100 text-gray-600'
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${cls}`}>
      {children}
    </span>
  )
}

export function TypeBadge({ type }: { type: string }) {
  return <Badge variant={type}>{type}</Badge>
}
