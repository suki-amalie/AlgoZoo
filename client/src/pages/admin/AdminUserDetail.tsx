import { useParams, Link } from 'react-router-dom'
import { ChevronLeft } from 'lucide-react'
import { MOCK_USERS } from './AdminUsers'

export function AdminUserDetail() {
  const { userId } = useParams<{ userId: string }>()

  // Find user by id or default to Alice Nguyen (u-student-1)
  const user = MOCK_USERS.find((u) => u.id === userId) || MOCK_USERS.find((u) => u.id === 'u-student-1')!

  const completed = user.completed ?? 28
  const total = user.total ?? 35
  const progress = user.progress ?? Math.round((completed / total) * 100)
  const pending = user.pendingReview ?? 1

  // SVG Gauge calculations
  const radius = 52
  const stroke = 7
  const normalizedRadius = radius - stroke / 2
  const circumference = normalizedRadius * 2 * Math.PI
  const strokeDashoffset = circumference - (progress / 100) * circumference

  const breakdown = user.breakdown || {
    dsa: '11 / 14 problems',
    os: '10 / 12 problems',
    database: '7 / 9 problems',
  }

  return (
    <div className="max-w-4xl mx-auto pb-12 space-y-4">
      {/* ── Main Detail Card ── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 sm:p-10 space-y-8">
        {/* Back Link */}
        <div>
          <Link
            to="/admin/users"
            className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors"
          >
            <ChevronLeft size={16} />
            Back to Users
          </Link>
        </div>

        {/* ── User Header Section ── */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pt-1">
          {/* Left: Avatar + Name + Email + Status */}
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-accent text-white text-xl font-bold flex items-center justify-center flex-shrink-0 shadow-2xs">
              {user.initials}
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 leading-tight">
                {user.name}
              </h1>
              <p className="text-xs text-gray-400 mt-0.5">{user.email}</p>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-600 border border-emerald-100 mt-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                {user.onTrackStatus || 'On track'}
              </span>
            </div>
          </div>

          {/* Right: Class & Trainer */}
          <div className="sm:text-right self-start sm:self-auto pt-1">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">
              CLASS
            </p>
            <p className="text-sm font-bold text-gray-900">{user.classes}</p>
            <p className="text-xs text-gray-500 mt-0.5">
              Trainer: {user.trainer || 'Nguyen Van Hung'}
            </p>
          </div>
        </div>

        {/* ── Center: Circular Progress Gauge ── */}
        <div className="py-4 flex flex-col items-center justify-center">
          <div className="relative w-36 h-36 flex items-center justify-center">
            <svg
              height={radius * 2 + 10}
              width={radius * 2 + 10}
              className="transform -rotate-90"
            >
              {/* Background circle track */}
              <circle
                stroke="#E5E7EB"
                fill="transparent"
                strokeWidth={stroke}
                r={normalizedRadius}
                cx={radius + 5}
                cy={radius + 5}
              />
              {/* Green progress arc */}
              <circle
                stroke="#10B981"
                fill="transparent"
                strokeWidth={stroke}
                strokeDasharray={circumference + ' ' + circumference}
                style={{ strokeDashoffset }}
                strokeLinecap="round"
                r={normalizedRadius}
                cx={radius + 5}
                cy={radius + 5}
                className="transition-all duration-700 ease-out"
              />
            </svg>

            {/* Center numbers (e.g. 28 / 35) */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-2xl font-bold text-gray-900 leading-none">
                {completed}
              </span>
              <div className="w-6 h-[1px] bg-gray-300 my-1" />
              <span className="text-sm font-medium text-gray-400 leading-none">
                {total}
              </span>
            </div>
          </div>

          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mt-4">
            OVERALL PROGRESS • {progress}%
          </p>
          {pending > 0 && (
            <p className="text-xs font-semibold text-orange-500 mt-1">
              {pending} pending review
            </p>
          )}
        </div>

        {/* ── Bottom Section: Subject Breakdown & Total ── */}
        <div className="pt-2 space-y-3.5 max-w-xl mx-auto">
          {/* DSA */}
          <div className="flex items-center justify-between text-sm py-1">
            <span className="font-bold text-orange-500">DSA</span>
            <span className="font-semibold text-gray-800">{breakdown.dsa}</span>
          </div>

          {/* OS */}
          <div className="flex items-center justify-between text-sm py-1">
            <span className="font-bold text-purple-600">OS</span>
            <span className="font-semibold text-gray-800">{breakdown.os}</span>
          </div>

          {/* Database */}
          <div className="flex items-center justify-between text-sm py-1">
            <span className="font-bold text-emerald-600">Database</span>
            <span className="font-semibold text-gray-800">{breakdown.database}</span>
          </div>

          {/* Divider */}
          <div className="border-t border-gray-100 pt-3" />

          {/* Total submitted */}
          <div className="flex items-center justify-between text-sm">
            <span className="font-bold text-gray-900">Total submitted</span>
            <span className="font-bold text-gray-900">
              {completed} / {total} problems
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
