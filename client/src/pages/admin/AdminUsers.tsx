import { useEffect, useState } from 'react'
import { Search, UserCheck, UserX, Users } from 'lucide-react'
import { Badge } from '../../components/ui/Badge'
import { useAdminUsers } from '../../hooks/useAdminUsers'
import * as adminService from '../../services/adminService'
import type { AdminClass, AdminUser } from '../../types/admin'
import type { AdminStudentProgress } from '../../types/adminDashboard'

const PAGE_SIZE = 8

// ONE shared grid definition used for both the header row and every data row.
// minmax(min, fr) ensures columns never collapse below their minimum width,
// which prevents the "COMPLETEDPROGRESS" merge problem.
const TABLE_COLS: React.CSSProperties = {
  gridTemplateColumns:
    'minmax(200px, 4fr) minmax(80px, 1fr) minmax(160px, 2fr) minmax(110px, 1fr) minmax(200px, 2fr) minmax(100px, 1fr)',
}

// Inner grid for the PROGRESS cell — count | bar | percentage.
// Fixed outer columns (40px + 42px) guarantee the bar starts/ends at
// the same x-position in every row regardless of the count value.
const PROGRESS_COLS: React.CSSProperties = {
  gridTemplateColumns: '40px 1fr 42px',
}

export function AdminUsers() {
  const { users, isLoading, error, setError, updateUserActive } = useAdminUsers()
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const [batchFilter, setBatchFilter] = useState('')
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null)
  const [classes, setClasses] = useState<AdminClass[]>([])
  const [studentsProgress, setStudentsProgress] = useState<AdminStudentProgress[]>([])
  const [page, setPage] = useState(1)

  useEffect(() => {
    adminService.getClasses().then(setClasses).catch(() => {})
    adminService.getDashboard().then((res) => setStudentsProgress(res.data.studentsProgress)).catch(() => {})
  }, [])

  // Aggregate per-student progress across all classes
  const studentProgressMap = studentsProgress.reduce<Record<string, { classNames: string; submissionCount: number; problemCount: number }>>((acc, sp) => {
    const id = String(sp.student_id)
    if (!acc[id]) {
      acc[id] = { classNames: sp.className, submissionCount: sp.submissionCount, problemCount: sp.problemCount }
    } else {
      acc[id].classNames += `, ${sp.className}`
      acc[id].submissionCount += sp.submissionCount
      acc[id].problemCount += sp.problemCount
    }
    return acc
  }, {})

  const toggleStudentStatus = async (user: AdminUser) => {
    if (user.role !== 'student' || updatingUserId) return
    setError('')
    setUpdatingUserId(user.id)
    try {
      await updateUserActive(user)
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : 'Unable to update student status')
    } finally {
      setUpdatingUserId(null)
    }
  }

  const selectedClassName = classes.find((c) => c.id === batchFilter)?.name ?? ''

  const filtered = users.filter((u) => {
    const q = search.toLowerCase()
    const matchSearch = u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
    const matchRole = roleFilter === 'all' || u.role === roleFilter
    const matchBatch = !batchFilter || studentProgressMap[u.id]?.classNames.includes(selectedClassName)
    return matchSearch && matchRole && matchBatch
  })

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  useEffect(() => { setPage(1) }, [search, roleFilter, batchFilter])

  const roleLabels: Record<string, string> = { all: 'All', admin: 'Admins', trainer: 'Trainers', student: 'Students' }

  return (
    <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
      {/* Card header */}
      <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-accent/10 flex items-center justify-center flex-shrink-0">
            <Users size={17} className="text-accent" />
          </div>
          <h1 className="text-xl font-bold text-gray-900">Users</h1>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search users..."
              className="pl-8 pr-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:border-accent/60 w-44"
            />
          </div>
          <div className="flex border border-gray-200 rounded-xl overflow-hidden">
            {(['all', 'admin', 'trainer', 'student'] as const).map((r) => (
              <button
                key={r}
                onClick={() => setRoleFilter(r)}
                className={`px-4 py-2 text-xs font-semibold transition-colors ${roleFilter === r ? 'bg-accent text-white' : 'text-gray-500 hover:text-gray-800'}`}
              >
                {roleLabels[r]}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Batch filter */}
      <div className="px-6 py-3 border-b border-gray-100 flex items-center gap-3">
        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Batch</span>
        <select
          value={batchFilter}
          onChange={(e) => setBatchFilter(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm text-gray-700 focus:outline-none focus:border-accent/60 w-44"
        >
          <option value="">All Batches</option>
          {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 mx-6 my-3">{error}</p>}
      {isLoading && <p className="p-6 text-sm text-gray-500">Loading users...</p>}

      {/* Table header — uses TABLE_COLS */}
      <div
        className="grid px-6 py-3 border-b border-gray-100 bg-gray-50 text-[10px] font-bold text-gray-400 tracking-widest"
        style={TABLE_COLS}
      >
        <span>USER</span>
        <span>ROLE</span>
        <span>CLASS</span>
        <span>COMPLETED</span>
        <span>PROGRESS</span>
        <span>STATUS</span>
      </div>

      {/* Rows — each uses TABLE_COLS (identical to header) */}
      {paged.map((u, i) => {
        const initials = u.name.split(' ').filter(Boolean).slice(0, 2).map((n) => n[0]?.toUpperCase() || '').join('')
        const sp = studentProgressMap[u.id]
        const progressPercent = sp && sp.problemCount > 0 ? Math.round((sp.submissionCount / sp.problemCount) * 100) : 0

        return (
          <div
            key={u.id}
            className={`grid items-center px-6 py-4 hover:bg-gray-50 ${i < paged.length - 1 ? 'border-b border-gray-50' : ''}`}
            style={TABLE_COLS}
          >
            {/* Col 1 — USER */}
            <div className="flex items-center gap-3 min-w-0">
              <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${u.role === 'student' ? 'bg-accent text-white' : 'bg-gray-200 text-gray-600'}`}>
                {initials}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate">{u.name}</p>
                <p className="text-xs text-gray-400 truncate">{u.email}</p>
              </div>
            </div>

            {/* Col 2 — ROLE */}
            <div>
              <Badge variant={`role-${u.role}`}>{u.role.charAt(0).toUpperCase() + u.role.slice(1)}</Badge>
            </div>

            {/* Col 3 — CLASS */}
            <span className="text-sm text-gray-500 truncate pr-4">
              {sp?.classNames ?? (u.role === 'admin' ? '—' : '')}
            </span>

            {/* Col 4 — COMPLETED */}
            <span className="text-sm text-gray-600 tabular-nums">
              {sp ? `${sp.submissionCount} / ${sp.problemCount}` : ''}
            </span>

            {/* Col 5 — PROGRESS (inner 3-column grid: count | bar | %) */}
            <div className="pr-4">
              {sp ? (
                <div className="grid items-center gap-2" style={PROGRESS_COLS}>
                  <span className="text-xs font-medium text-accent text-right tabular-nums">{sp.submissionCount}/{sp.problemCount}</span>
                  <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
                    <div className="h-full rounded-full bg-accent" style={{ width: `${progressPercent}%` }} />
                  </div>
                  <span className="text-xs text-gray-500 text-right tabular-nums">{progressPercent}%</span>
                </div>
              ) : null}
            </div>

            {/* Col 6 — STATUS */}
            <div className="flex items-center gap-2">
              <Badge variant={u.isActive ? 'active' : 'disabled'}>{u.isActive ? 'Active' : 'Inactive'}</Badge>
              {u.role === 'student' && (
                <button
                  onClick={() => toggleStudentStatus(u)}
                  disabled={updatingUserId === u.id}
                  title={u.isActive ? 'Deactivate student' : 'Activate student'}
                  className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-accent disabled:opacity-50"
                >
                  {u.isActive ? <UserX size={15} /> : <UserCheck size={15} />}
                </button>
              )}
            </div>
          </div>
        )
      })}

      {paged.length === 0 && !isLoading && (
        <div className="py-12 text-center text-sm text-gray-400">No users match your search</div>
      )}

      {/* Pagination */}
      {filtered.length > 0 && (
        <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between">
          <span className="text-xs text-gray-400">
            {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length} users
          </span>
          <div className="flex items-center gap-1">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <button
                key={p}
                onClick={() => setPage(p)}
                className={`w-7 h-7 rounded-lg text-xs font-semibold ${p === page ? 'bg-accent text-white' : 'text-gray-500 hover:bg-gray-100'}`}
              >
                {p}
              </button>
            ))}
            {page < totalPages && (
              <button onClick={() => setPage(page + 1)} className="w-7 h-7 rounded-lg text-xs text-gray-500 hover:bg-gray-100">›</button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
