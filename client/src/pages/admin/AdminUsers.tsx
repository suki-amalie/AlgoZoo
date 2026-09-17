import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Users as UsersIcon, Search, ChevronDown, ChevronLeft, ChevronRight, Check
} from 'lucide-react'

// ─── Types ─────────────────────────────────────────────────────────────────────

type RoleFilter = 'All' | 'Admins' | 'Trainers' | 'Students'

export type UserItem = {
  id: string
  name: string
  email: string
  initials: string
  role: 'Admin' | 'Trainer' | 'Student'
  classes: string // string for display or single/multiple
  batchKey: string // for batch filtering
  completed?: number
  total?: number
  progress?: number
  status: 'Active' | 'Inactive'
  trainer?: string
  onTrackStatus?: 'On track' | 'Needs help' | 'Completed'
  pendingReview?: number
  breakdown?: {
    dsa: string
    os: string
    database: string
  }
}

// ─── Mock Data matching Figma Screenshots ──────────────────────────────────────

export const MOCK_USERS: UserItem[] = [
  // 1. Admin
  {
    id: 'u-admin-1',
    name: 'Maya Tran',
    email: 'maya@algozoo.edu',
    initials: 'MT',
    role: 'Admin',
    classes: '—',
    batchKey: 'none',
    status: 'Active',
  },

  // 2. Trainers
  {
    id: 'u-trainer-1',
    name: 'Alex Nguyen',
    email: 'alex@algozoo.edu',
    initials: 'AN',
    role: 'Trainer',
    classes: 'WeCamp Batch 15, StarCamp Batch 2',
    batchKey: 'wecamp-15,starcamp-2',
    status: 'Active',
  },
  {
    id: 'u-trainer-2',
    name: 'Sarah Tran',
    email: 'sarah@algozoo.edu',
    initials: 'ST',
    role: 'Trainer',
    classes: 'WeCamp Batch 15',
    batchKey: 'wecamp-15',
    status: 'Active',
  },
  {
    id: 'u-trainer-3',
    name: 'Le Van An',
    email: 'le.an@algozoo.edu',
    initials: 'LA',
    role: 'Trainer',
    classes: 'WeCamp Batch 14',
    batchKey: 'wecamp-14',
    status: 'Active',
  },
  {
    id: 'u-trainer-4',
    name: 'Pham Thi Huong',
    email: 'pham.huong@algozoo.edu',
    initials: 'PH',
    role: 'Trainer',
    classes: 'StarCamp Batch 1',
    batchKey: 'starcamp-1',
    status: 'Active',
  },

  // 3. Students
  {
    id: 'u-student-1',
    name: 'Alice Nguyen',
    email: 'alice.nguyen@wecamp.edu',
    initials: 'AN',
    role: 'Student',
    classes: 'WeCamp Batch 15',
    batchKey: 'wecamp-15',
    completed: 28,
    total: 35,
    progress: 80,
    status: 'Active',
    trainer: 'Nguyen Van Hung',
    onTrackStatus: 'On track',
    pendingReview: 1,
    breakdown: {
      dsa: '11 / 14 problems',
      os: '10 / 12 problems',
      database: '7 / 9 problems',
    },
  },
  {
    id: 'u-student-2',
    name: 'Kim Nguyen',
    email: 'kim.nguyen@wecamp.edu',
    initials: 'KN',
    role: 'Student',
    classes: 'WeCamp Batch 15',
    batchKey: 'wecamp-15',
    completed: 35,
    total: 35,
    progress: 100,
    status: 'Active',
  },
  {
    id: 'u-student-3',
    name: 'Duc Tran',
    email: 'duc.tran@wecamp.edu',
    initials: 'DT',
    role: 'Student',
    classes: 'WeCamp Batch 15',
    batchKey: 'wecamp-15',
    completed: 20,
    total: 35,
    progress: 57,
    status: 'Active',
  },
  {
    id: 'u-student-4',
    name: 'Long Tran',
    email: 'long.tran@wecamp.edu',
    initials: 'LT',
    role: 'Student',
    classes: 'WeCamp Batch 15',
    batchKey: 'wecamp-15',
    completed: 14,
    total: 35,
    progress: 40,
    status: 'Active',
  },
  {
    id: 'u-student-5',
    name: 'Viet Nguyen',
    email: 'viet.nguyen@starcamp.edu',
    initials: 'VN',
    role: 'Student',
    classes: 'StarCamp Batch 2',
    batchKey: 'starcamp-2',
    completed: 20,
    total: 28,
    progress: 71,
    status: 'Active',
  },
  {
    id: 'u-student-6',
    name: 'Trang Nguyen',
    email: 'trang.nguyen@starcamp.edu',
    initials: 'TN',
    role: 'Student',
    classes: 'StarCamp Batch 2',
    batchKey: 'starcamp-2',
    completed: 28,
    total: 28,
    progress: 100,
    status: 'Active',
  },
  {
    id: 'u-student-7',
    name: 'Hieu Tran',
    email: 'hieu.tran@starcamp.edu',
    initials: 'HT',
    role: 'Student',
    classes: 'StarCamp Batch 2',
    batchKey: 'starcamp-2',
    completed: 12,
    total: 28,
    progress: 43,
    status: 'Active',
  },
  {
    id: 'u-student-8',
    name: 'Son Nguyen',
    email: 'son.nguyen@wecamp.edu',
    initials: 'SN',
    role: 'Student',
    classes: 'WeCamp Batch 14',
    batchKey: 'wecamp-14',
    completed: 25,
    total: 30,
    progress: 83,
    status: 'Active',
  },
  {
    id: 'u-student-9',
    name: 'Bao Le',
    email: 'bao.le@starcamp.edu',
    initials: 'BL',
    role: 'Student',
    classes: 'StarCamp Batch 1',
    batchKey: 'starcamp-1',
    completed: 25,
    total: 25,
    progress: 100,
    status: 'Active',
  },
  {
    id: 'u-student-10',
    name: 'Minh Pham',
    email: 'minh.pham@wecamp.edu',
    initials: 'MP',
    role: 'Student',
    classes: 'WeCamp Batch 14',
    batchKey: 'wecamp-14',
    completed: 27,
    total: 30,
    progress: 90,
    status: 'Active',
  },
  {
    id: 'u-student-11',
    name: 'Phuong Do',
    email: 'phuong.do@starcamp.edu',
    initials: 'PD',
    role: 'Student',
    classes: 'StarCamp Batch 1',
    batchKey: 'starcamp-1',
    completed: 24,
    total: 25,
    progress: 96,
    status: 'Active',
  },
  {
    id: 'u-student-12',
    name: 'Quang Vu',
    email: 'quang.vu@starcamp.edu',
    initials: 'QV',
    role: 'Student',
    classes: 'StarCamp Batch 2',
    batchKey: 'starcamp-2',
    completed: 18,
    total: 28,
    progress: 64,
    status: 'Active',
  },
]

const BATCH_OPTIONS = [
  { label: 'All Batches', key: 'all' },
  { label: 'WeCamp Batch 15', key: 'wecamp-15' },
  { label: 'StarCamp Batch 2', key: 'starcamp-2' },
  { label: 'WeCamp Batch 14', key: 'wecamp-14' },
  { label: 'StarCamp Batch 1', key: 'starcamp-1' },
]

const PAGE_SIZE = 8

export function AdminUsers() {
  const navigate = useNavigate()
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('All')
  const [selectedBatch, setSelectedBatch] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [isBatchDropdownOpen, setIsBatchDropdownOpen] = useState(false)

  // Show batch filter only when role is All or Students (matching Figma screenshots)
  const showBatchFilter = roleFilter === 'All' || roleFilter === 'Students'

  // Show progress and completed columns only when students exist in the view (All or Students)
  const showProgressColumns = roleFilter === 'All' || roleFilter === 'Students'

  const filteredUsers = useMemo(() => {
    return MOCK_USERS.filter((user) => {
      // 1. Role filter
      if (roleFilter === 'Admins' && user.role !== 'Admin') return false
      if (roleFilter === 'Trainers' && user.role !== 'Trainer') return false
      if (roleFilter === 'Students' && user.role !== 'Student') return false

      // 2. Batch filter (if applicable)
      if (showBatchFilter && selectedBatch !== 'all') {
        if (!user.batchKey.includes(selectedBatch)) return false
      }

      // 3. Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim()
        const matchName = user.name.toLowerCase().includes(q)
        const matchEmail = user.email.toLowerCase().includes(q)
        const matchClasses = user.classes.toLowerCase().includes(q)
        if (!matchName && !matchEmail && !matchClasses) return false
      }

      return true
    })
  }, [roleFilter, selectedBatch, searchQuery, showBatchFilter])

  // Pagination
  const totalItems = filteredUsers.length
  const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE))
  const safePage = Math.min(currentPage, totalPages)
  const startIndex = (safePage - 1) * PAGE_SIZE
  const endIndex = Math.min(startIndex + PAGE_SIZE, totalItems)
  const paginatedUsers = filteredUsers.slice(startIndex, endIndex)

  const handleRoleChange = (role: RoleFilter) => {
    setRoleFilter(role)
    setCurrentPage(1)
  }

  const selectedBatchLabel =
    BATCH_OPTIONS.find((b) => b.key === selectedBatch)?.label || 'All Batches'

  return (
    <div className="max-w-7xl mx-auto pb-12">
      {/* ── Main Container Card ── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 sm:p-7 space-y-6">
        {/* ── Top Bar: Title + Search + Role Segmented Filter ── */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Left: Icon + Title */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-pink-50 text-pink-500 border border-pink-100 flex items-center justify-center flex-shrink-0">
              <UsersIcon size={20} />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Users</h1>
          </div>

          {/* Right: Search Bar + Role Pills */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            {/* Search Input */}
            <div className="relative w-full sm:w-64">
              <Search
                size={15}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value)
                  setCurrentPage(1)
                }}
                placeholder="Search users..."
                className="w-full pl-9 pr-3.5 py-1.5 text-xs text-gray-800 bg-gray-50/70 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all shadow-2xs placeholder:text-gray-400"
              />
            </div>

            {/* Segmented Role Filter */}
            <div className="bg-gray-100/90 p-1 rounded-xl flex items-center gap-1 self-start sm:self-auto">
              {(['All', 'Admins', 'Trainers', 'Students'] as RoleFilter[]).map((role) => (
                <button
                  key={role}
                  onClick={() => handleRoleChange(role)}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                    roleFilter === role
                      ? 'bg-white text-gray-900 shadow-xs'
                      : 'text-gray-500 hover:text-gray-800'
                  }`}
                >
                  {role}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ── Secondary Bar: BATCH Filter Dropdown (Screenshots 2, 3, 5) ── */}
        {showBatchFilter && (
          <div className="flex items-center gap-3 pt-1">
            <span className="text-[11px] font-bold text-gray-400 tracking-wider uppercase">
              BATCH
            </span>
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsBatchDropdownOpen(!isBatchDropdownOpen)}
                className="flex items-center justify-between gap-3 px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-200 rounded-xl hover:border-gray-300 shadow-2xs transition-colors min-w-[140px]"
              >
                <span>{selectedBatchLabel}</span>
                <ChevronDown size={14} className="text-gray-400" />
              </button>

              {/* Dropdown Menu (Screenshot 3) */}
              {isBatchDropdownOpen && (
                <>
                  <div
                    className="fixed inset-0 z-20"
                    onClick={() => setIsBatchDropdownOpen(false)}
                  />
                  <div className="absolute left-0 top-full mt-1.5 w-48 bg-white rounded-xl shadow-lg border border-gray-100 py-1.5 z-30 animate-in fade-in zoom-in-95 duration-150">
                    {BATCH_OPTIONS.map((opt) => (
                      <button
                        key={opt.key}
                        onClick={() => {
                          setSelectedBatch(opt.key)
                          setIsBatchDropdownOpen(false)
                          setCurrentPage(1)
                        }}
                        className={`w-full text-left px-3.5 py-2 text-xs transition-colors flex items-center justify-between ${
                          selectedBatch === opt.key
                            ? 'bg-blue-600 text-white font-medium'
                            : 'text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        <span>{opt.label}</span>
                        {selectedBatch === opt.key && <Check size={13} className="text-white" />}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* ── Table Container ── */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="py-3 px-4 text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                  USER
                </th>
                <th className="py-3 px-4 text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                  ROLE
                </th>
                <th className="py-3 px-4 text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                  {roleFilter === 'Admins' || roleFilter === 'Trainers' ? 'CLASSES' : 'CLASS'}
                </th>
                {showProgressColumns && (
                  <>
                    <th className="py-3 px-4 text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                      COMPLETED
                    </th>
                    <th className="py-3 px-4 text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                      PROGRESS
                    </th>
                  </>
                )}
                <th className="py-3 px-4 text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                  STATUS
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50/80">
              {paginatedUsers.length === 0 ? (
                <tr>
                  <td
                    colSpan={showProgressColumns ? 6 : 4}
                    className="py-12 text-center text-sm text-gray-400"
                  >
                    No users match the selected filters.
                  </td>
                </tr>
              ) : (
                paginatedUsers.map((user) => {
                  const isStudent = user.role === 'Student'
                  const isAdmin = user.role === 'Admin'

                  return (
                    <tr
                      key={user.id}
                      onClick={() => navigate(`/admin/users/${user.id}`)}
                      className="hover:bg-gray-50/70 transition-colors cursor-pointer group"
                    >
                      {/* USER */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                              isStudent
                                ? 'bg-accent text-white'
                                : 'bg-gray-200 text-gray-700'
                            }`}
                          >
                            {user.initials}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-gray-900 leading-snug">
                              {user.name}
                            </p>
                            <p className="text-xs text-gray-400 truncate">{user.email}</p>
                          </div>
                        </div>
                      </td>

                      {/* ROLE */}
                      <td className="py-3.5 px-4">
                        <span
                          className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${
                            isAdmin
                              ? 'bg-purple-50 text-purple-600'
                              : isStudent
                              ? 'bg-red-50 text-red-600'
                              : 'bg-blue-50 text-blue-600'
                          }`}
                        >
                          {user.role}
                        </span>
                      </td>

                      {/* CLASS / CLASSES */}
                      <td className="py-3.5 px-4 text-xs font-medium text-gray-700 max-w-[200px] truncate">
                        {user.classes}
                      </td>

                      {/* COMPLETED & PROGRESS (for Students or All) */}
                      {showProgressColumns && (
                        <>
                          <td className="py-3.5 px-4 text-xs font-medium text-gray-700">
                            {user.completed !== undefined ? (
                              `${user.completed} / ${user.total}`
                            ) : (
                              <span className="text-gray-400">—</span>
                            )}
                          </td>
                          <td className="py-3.5 px-4">
                            {user.progress !== undefined ? (
                              <div className="space-y-1">
                                <span className="text-[10px] text-gray-400 font-medium block">
                                  {user.completed}/{user.total}
                                </span>
                                <div className="flex items-center gap-2">
                                  <div className="w-28 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                    <div
                                      className="h-full bg-accent rounded-full"
                                      style={{ width: `${user.progress}%` }}
                                    />
                                  </div>
                                  <span className="text-xs font-bold text-gray-800">
                                    {user.progress}%
                                  </span>
                                </div>
                              </div>
                            ) : (
                              <span className="text-gray-400">—</span>
                            )}
                          </td>
                        </>
                      )}

                      {/* STATUS */}
                      <td className="py-3.5 px-4">
                        <span className="text-xs px-2.5 py-0.5 rounded-full font-medium bg-emerald-50 text-emerald-600">
                          {user.status}
                        </span>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* ── Table Footer & Pagination ── */}
        <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-gray-400">
          <div>
            {totalItems > 0 ? (
              <span>
                {startIndex + 1}–{endIndex} of {totalItems} users
              </span>
            ) : (
              <span>0 users</span>
            )}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center gap-1 self-center sm:self-auto">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={safePage === 1}
                className="p-1 rounded-lg text-gray-400 hover:text-gray-700 disabled:opacity-30 disabled:pointer-events-none"
              >
                <ChevronLeft size={16} />
              </button>

              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`w-7 h-7 rounded-full text-xs font-semibold transition-all ${
                    safePage === page
                      ? 'bg-accent text-white'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  {page}
                </button>
              ))}

              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={safePage === totalPages}
                className="p-1 rounded-lg text-gray-400 hover:text-gray-700 disabled:opacity-30 disabled:pointer-events-none"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
