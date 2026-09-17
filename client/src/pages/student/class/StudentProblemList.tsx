import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Search, CheckCircle2, Clock, Circle, ChevronDown, ChevronRight } from 'lucide-react'
import { ClassTabNav } from '../../../components/layout/ClassTabNav'
import { TypeBadge } from '../../../components/ui/Badge'
import { getProblemStatus } from '../../../utils/studentStore'

type ProblemType = 'DSA' | 'OS' | 'Database' | 'Other'
type ProblemStatus = 'not-started' | 'pending' | 'reviewed'

type ClassProblem = {
  id: number
  title: string
  type: ProblemType
  deadline: string | null
  status: ProblemStatus
  isPastDeadline: boolean
  submissionId?: number // maps to /student/submissions/:id when reviewed/pending
}

const baseProblems: Omit<ClassProblem, 'status' | 'submissionId'>[] = [
  { id: 1, title: 'Two Sum', type: 'DSA', deadline: 'Sep 20, 2026', isPastDeadline: false },
  { id: 2, title: 'Binary Search', type: 'DSA', deadline: 'Sep 22, 2026', isPastDeadline: false },
  { id: 3, title: 'Reverse Linked List', type: 'DSA', deadline: 'Sep 25, 2026', isPastDeadline: false },
  { id: 4, title: 'Process Scheduling', type: 'OS', deadline: 'Sep 18, 2026', isPastDeadline: true },
  { id: 5, title: 'Memory Management', type: 'OS', deadline: 'Sep 28, 2026', isPastDeadline: false },
  { id: 6, title: 'SQL Queries', type: 'Database', deadline: 'Oct 1, 2026', isPastDeadline: false },
]

// Determine link target based on status
function getProblemLink(classId: string, p: ClassProblem): string {
  if ((p.status === 'reviewed' || p.status === 'pending') && p.submissionId) {
    return `/student/submissions/${p.submissionId}?fromClass=${classId}`
  }
  return `/student/classes/${classId}/problems/${p.id}`
}

const typeOrder: ProblemType[] = ['DSA', 'OS', 'Database', 'Other']

const statusIcon: Record<ProblemStatus, React.ReactNode> = {
  reviewed: <CheckCircle2 size={16} className="text-green-500 flex-shrink-0" />,
  pending: <Clock size={16} className="text-yellow-500 flex-shrink-0" />,
  'not-started': <Circle size={16} className="text-gray-300 flex-shrink-0" />,
}

const statusLabel: Record<ProblemStatus, string> = {
  reviewed: 'Reviewed',
  pending: 'Pending review',
  'not-started': 'Not started',
}

const statusClass: Record<ProblemStatus, string> = {
  reviewed: 'text-green-600 font-medium',
  pending: 'text-orange-600',
  'not-started': 'text-gray-400',
}

export function StudentProblemList() {
  const { classId = '2' } = useParams()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | ProblemStatus>('all')
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})
  const [tick, setTick] = useState(0)

  useEffect(() => {
    const handleUpdate = () => setTick((t) => t + 1)
    window.addEventListener('algozoo_store_updated', handleUpdate)
    return () => window.removeEventListener('algozoo_store_updated', handleUpdate)
  }, [])

  const problems: ClassProblem[] = baseProblems.map((p) => {
    const status = getProblemStatus(p.id)
    return {
      ...p,
      status,
      submissionId: status !== 'not-started' ? p.id : undefined,
    }
  })

  const tabs = [
    { label: 'Overview', to: `/student/classes/${classId}/overview` },
    { label: 'Problems', to: `/student/classes/${classId}/problems` },
  ]

  const filtered = problems.filter((p) => {
    const matchSearch = p.title.toLowerCase().includes(search.toLowerCase())
    const matchStatus = statusFilter === 'all' || p.status === statusFilter
    return matchSearch && matchStatus
  })

  const grouped = typeOrder.reduce<Record<string, ClassProblem[]>>((acc, type) => {
    const items = filtered.filter((p) => p.type === type)
    if (items.length > 0) acc[type] = items
    return acc
  }, {})

  const toggleGroup = (type: string) => {
    setCollapsed((prev) => ({ ...prev, [type]: !prev[type] }))
  }

  const isSearching = search.trim() !== '' || statusFilter !== 'all'

  return (
    <div>
      <ClassTabNav
        crumbs={[
          { label: 'My Classes', to: '/student/classes' },
          { label: 'WeCamp Batch 22', to: `/student/classes/${classId}/overview` },
          { label: 'Problems' },
        ]}
        title="WeCamp Batch 22"
        status="ACTIVE"
        tabs={tabs}
      />

      {/* Filters */}
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <div className="relative">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search problems..."
            className="pl-8 pr-4 py-2 border border-gray-200 rounded-xl bg-white text-sm focus:outline-none focus:border-accent/50 w-52"
          />
        </div>
        <div className="flex gap-1">
          {(['all', 'not-started', 'pending', 'reviewed'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                statusFilter === s ? 'bg-accent text-white' : 'bg-white text-gray-500 hover:bg-gray-50 shadow-sm'
              }`}
            >
              {s === 'all' ? 'All' : s === 'not-started' ? 'Not Started' : s === 'pending' ? 'Pending' : 'Reviewed'}
            </button>
          ))}
        </div>
      </div>

      {/* Grouped by type */}
      {Object.keys(grouped).length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm py-12 text-center text-sm text-gray-400">
          No problems found
        </div>
      ) : (
        <div className="space-y-3">
          {typeOrder.filter((type) => grouped[type]).map((type) => {
            const items = grouped[type]
            const isOpen = isSearching ? true : !collapsed[type]
            const reviewedCount = items.filter((p) => p.status === 'reviewed').length

            return (
              <div key={type} className="bg-white rounded-2xl shadow-sm overflow-hidden">
                {/* Group header */}
                <button
                  onClick={() => !isSearching && toggleGroup(type)}
                  className={`w-full flex items-center justify-between px-5 py-4 text-left transition-colors ${
                    isSearching ? 'cursor-default' : 'hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {!isSearching && (
                      isOpen
                        ? <ChevronDown size={16} className="text-gray-400 flex-shrink-0" />
                        : <ChevronRight size={16} className="text-gray-400 flex-shrink-0" />
                    )}
                    <TypeBadge type={type} />
                    <span className="font-semibold text-gray-800 text-sm">
                      {items.length} {items.length === 1 ? 'problem' : 'problems'}
                    </span>
                  </div>
                  <span className="text-xs text-gray-400">
                    {reviewedCount} / {items.length} completed
                  </span>
                </button>

                {/* Problems in group */}
                {isOpen && (
                  <div className="border-t border-gray-100">
                    {items.map((p, i) => (
                      <Link
                        key={p.id}
                        to={getProblemLink(classId, p)}
                        className={`flex items-center px-5 py-3.5 hover:bg-gray-50 transition-colors gap-3 ${
                          i < items.length - 1 ? 'border-b border-gray-50' : ''
                        }`}
                      >
                        {statusIcon[p.status]}
                        <span className={`flex-1 text-sm font-medium ${
                          p.status === 'not-started' ? 'text-gray-600' : 'text-gray-900'
                        }`}>
                          {p.title}
                        </span>
                        {p.isPastDeadline && p.status === 'not-started' && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-orange-100 text-orange-700">
                            Deadline passed
                          </span>
                        )}
                        <span className="text-xs text-gray-400 w-28 text-right flex-shrink-0">
                          {p.deadline ?? '—'}
                        </span>
                        <span className={`text-xs w-28 text-right flex-shrink-0 ${statusClass[p.status]}`}>
                          {statusLabel[p.status]}
                        </span>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
