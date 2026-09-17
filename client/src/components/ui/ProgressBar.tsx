export function ProgressBar({
  value,
  height = 'h-1.5',
  color = 'bg-accent',
}: {
  value: number
  height?: string
  color?: string
}) {
  return (
    <div className={`w-full ${height} rounded-full bg-gray-200 overflow-hidden`}>
      <div
        className={`${height} rounded-full ${color} transition-all duration-500`}
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  )
}
