import { useEffect, useState } from 'react'
import { useParams, Link, useSearchParams } from 'react-router-dom'
import { Search, X, Loader2 } from 'lucide-react'
import { ClassTabNav } from '../../../components/layout/ClassTabNav'
import { Badge } from '../../../components/ui/Badge'
import { useClassDetail } from '../../../hooks/useClassDetail'
import { mapProblemType } from '../../../services/problemService'
import { getSubmissions } from '../../../services/submissionService'
import type { SubmissionListItem } from '../../../types/submission'

type ProblemType = 'DSA' | 'OS' | 'Database' | 'Other'

type Submission = {
  id: string
  student: string
  initials: string
  problem: string
  topic: ProblemType
  submittedAt: string
  sortTs: number
  status: 'PENDING' | 'REVIEWED'
  isLate: boolean
}

function initials(name: string) {
  return name.split(' ').filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase()
}

// Pending / Reviewed / Late are mutually exclusive here (matches the Dashboard's queue split) —
// a late-and-unreviewed submission must read "Late", not "Pending".
function statusDisplay(s: Submission): { label: string; variant: 'pending' | 'reviewed' | 'late' } {
  if (s.status === 'REVIEWED') return { label: 'Reviewed', variant: 'reviewed' }
  if (s.isLate) return { label: 'Late', variant: 'late' }
  return { label: 'Pending', variant: 'pending' }
}

function toSubmission(s: SubmissionListItem): Submission {
  const submittedDate = new Date(s.submitted_at)
  return {
    id: s.submission_id,
    student: s.student?.name ?? 'Unknown',
    initials: s.student ? initials(s.student.name) : '?',
    problem: s.problem?.title ?? 'Unknown problem',
    topic: mapProblemType(s.problem?.problemType),
    submittedAt: submittedDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
    sortTs: submittedDate.getTime(),
    status: s.status === 'review' ? 'REVIEWED' : 'PENDING',
    isLate: s.is_late,
  }
}

export function ClassSubmissions() {
  const { classId = '' } = useParams()
  const { classDetail } = useClassDetail(classId)
  const className = classDetail?.className ?? '...'
  const [searchParams, setSearchParams] = useSearchParams()

  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!classId) return
    let cancelled = false
    setLoading(true)
    setError(null)
    getSubmissions()
      .then((all) => {
        if (cancelled) return
        setSubmissions(all.filter((s) => s.class?.id === classId).map(toSubmission))
      })
      .catch((err) => { if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load submissions') })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [classId])

  const [tab, setTab] = useState<'all' | 'pending' | 'reviewed' | 'late'>('all')
  const [search, setSearch] = useState('')

  const problemFilter = searchParams.get('problem') ?? ''
  const topicFilter = searchParams.get('topic') ?? ''
  const studentFilter = searchParams.get('student') ?? ''

  const clearFilter = () => setSearchParams({})

  const tabs = [
    { label: 'Overview', to: `/trainer/classes/${classId}/overview` },
    { label: 'Problems', to: `/trainer/classes/${classId}/problems` },
    { label: 'Submissions', to: `/trainer/classes/${classId}/submissions` },
    { label: 'Students', to: `/trainer/classes/${classId}/students` },
  ]

  const baseFiltered = [...submissions]
    .sort((a, b) => b.sortTs - a.sortTs)
    .filter((s) => {
      const matchSearch = search === '' || s.student.toLowerCase().includes(search.toLowerCase()) || s.problem.toLowerCase().includes(search.toLowerCase())
      const matchProblem = problemFilter === '' || s.problem === problemFilter
      const matchTopic = topicFilter === '' || s.topic === topicFilter
      const matchStudent = studentFilter === '' || s.student === studentFilter
      return matchSearch && matchProblem && matchTopic && matchStudent
    })

  const filtered = baseFiltered.filter((s) =>
    tab === 'all' ? true :
    tab === 'pending' ? (s.status === 'PENDING' && !s.isLate) :
    tab === 'reviewed' ? s.status === 'REVIEWED' :
    s.isLate
  )

  // Group by problem when a specific problem or topic filter is active
  const shouldGroup = problemFilter !== '' || topicFilter !== ''

  const groupedByProblem = filtered.reduce<Record<string, Submission[]>>((acc, s) => {
    if (!acc[s.problem]) acc[s.problem] = []
    acc[s.problem].push(s)
    return acc
  }, {})

  const activeFilterLabel = problemFilter
    ? `Problem: ${problemFilter}`
    : topicFilter
    ? `Topic: ${topicFilter}`
    : studentFilter
    ? `Student: ${studentFilter}`
    : ''

  if (loading) {
    return (
      <div className="py-16 flex items-center justify-center text-sm text-gray-400 gap-2">
        <Loader2 size={16} className="animate-spin" /> Loading submissions...
      </div>
    )
  }

  return (
    <div>
      <ClassTabNav
        crumbs={[
          { label: 'My Classes', to: '/trainer/classes' },
          { label: className, to: `/trainer/classes/${classId}/overview` },
          { label: 'Submissions' },
        ]}
        title={className}
        tabs={tabs}
      />

      {error && (
        <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 mb-4 text-sm text-red-600">{error}</div>
      )}

      {/* Active filter banner */}
      {activeFilterLabel && (
        <div className="flex items-center gap-2 mb-4 bg-accent/5 border border-accent/20 rounded-xl px-4 py-2.5">
          <span className="text-sm text-accent font-medium">Filtering by: {activeFilterLabel}</span>
          <span className="text-sm text-gray-400">· {baseFiltered.length} submission{baseFiltered.length !== 1 ? 's' : ''}</span>
          <button
            onClick={clearFilter}
            className="ml-auto flex items-center gap-1 text-xs text-gray-500 hover:text-gray-800 font-medium"
          >
            <X size={13} /> Clear filter
          </button>
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <div className="flex gap-1">
          {([
            { key: 'all', label: `All (${baseFiltered.length})` },
            { key: 'pending', label: `Pending (${baseFiltered.filter(s => s.status === 'PENDING' && !s.isLate).length})` },
            { key: 'reviewed', label: `Reviewed (${baseFiltered.filter(s => s.status === 'REVIEWED').length})` },
            { key: 'late', label: `Late (${baseFiltered.filter(s => s.isLate).length})` },
          ] as const).map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${
                tab === key
                  ? key === 'late' ? 'bg-orange-500 text-white' : 'bg-accent text-white'
                  : key === 'late' ? 'bg-white text-orange-500 hover:bg-orange-50 shadow-sm' : 'bg-white text-gray-500 hover:bg-gray-50 shadow-sm'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="relative">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search student or problem..."
            className="pl-8 pr-4 py-2 border border-gray-200 rounded-xl bg-white text-sm focus:outline-none focus:border-accent/50 w-56"
          />
        </div>
      </div>

      {/* Grouped view (when filter is active) */}
      {shouldGroup ? (
        <div className="space-y-4">
          {Object.entries(groupedByProblem).map(([problemName, items]) => (
            <div key={problemName} className="bg-white rounded-2xl shadow-sm overflow-hidden">
              {/* Problem group header */}
              <div className="flex items-center justify-between px-6 py-3.5 bg-gray-50 border-b border-gray-100">
                <div>
                  <span className="font-semibold text-gray-900 text-sm">{problemName}</span>
                  <span className="ml-2 text-xs text-gray-400">{items.length} submission{items.length !== 1 ? 's' : ''}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400">
                    {items.filter((s) => s.status === 'PENDING' && !s.isLate).length} pending
                  </span>
                  <span className="text-xs text-gray-300">·</span>
                  <span className="text-xs text-gray-400">
                    {items.filter((s) => s.isLate).length} late
                  </span>
                  <span className="text-xs text-gray-300">·</span>
                  <span className="text-xs text-gray-400">
                    {items.filter((s) => s.status === 'REVIEWED').length} reviewed
                  </span>
                </div>
              </div>
              <SubmissionTable rows={items} />
            </div>
          ))}
          {Object.keys(groupedByProblem).length === 0 && (
            <div className="bg-white rounded-2xl shadow-sm py-12 text-center text-sm text-gray-400">
              No submissions found
            </div>
          )}
        </div>
      ) : (
        /* Flat view (no filter) */
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <TableHeader />
          {filtered.map((s, i) => (
            <SubmissionRow key={s.id} s={s} last={i === filtered.length - 1} />
          ))}
          {filtered.length === 0 && (
            <div className="py-12 text-center text-sm text-gray-400">No submissions found</div>
          )}
        </div>
      )}
    </div>
  )
}

function TableHeader() {
  return (
    <div className="grid grid-cols-[1fr_160px_110px_110px_100px] px-6 py-3 border-b border-gray-100">
      {['STUDENT', 'PROBLEM', 'SUBMITTED', 'STATUS', 'ACTION'].map((h) => (
        <span key={h} className="text-[10px] font-bold text-gray-400 tracking-widest">{h}</span>
      ))}
    </div>
  )
}

function SubmissionTable({ rows }: { rows: Submission[] }) {
  return (
    <div>
      <div className="grid grid-cols-[1fr_110px_110px_100px] px-6 py-2.5 border-b border-gray-50 bg-white">
        {['STUDENT', 'SUBMITTED', 'STATUS', 'ACTION'].map((h) => (
          <span key={h} className="text-[10px] font-bold text-gray-400 tracking-widest">{h}</span>
        ))}
      </div>
      {rows.map((s, i) => (
        <div
          key={s.id}
          className={`grid grid-cols-[1fr_110px_110px_100px] items-center px-6 py-3.5 hover:bg-gray-50 transition-colors ${
            i < rows.length - 1 ? 'border-b border-gray-50' : ''
          }`}
        >
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-accent text-white text-xs flex items-center justify-center font-bold flex-shrink-0">
              {s.initials}
            </div>
            <div>
              <span className="text-sm font-semibold text-gray-900">{s.student}</span>
              {s.isLate && (
                <span className="ml-2 text-xs bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded font-medium">Late</span>
              )}
            </div>
          </div>
          <span className="text-sm text-gray-400">{s.submittedAt}</span>
          <div className="flex items-center">
            <Badge variant={statusDisplay(s).variant}>{statusDisplay(s).label}</Badge>
          </div>
          <div>
            <Link to={`/trainer/submissions/${s.id}`} className="text-xs text-accent font-semibold hover:underline">
              {s.status === 'PENDING' ? 'Review' : 'View'}
            </Link>
          </div>
        </div>
      ))}
    </div>
  )
}

function SubmissionRow({ s, last }: { s: Submission; last: boolean }) {
  return (
    <div
      className={`grid grid-cols-[1fr_160px_110px_110px_100px] items-center px-6 py-4 hover:bg-gray-50 transition-colors ${
        !last ? 'border-b border-gray-50' : ''
      }`}
    >
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-full bg-accent text-white text-xs flex items-center justify-center font-bold flex-shrink-0">
          {s.initials}
        </div>
        <div>
          <span className="text-sm font-semibold text-gray-900">{s.student}</span>
          {s.isLate && (
            <span className="ml-2 text-xs bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded font-medium">Late</span>
          )}
        </div>
      </div>
      <span className="text-sm text-gray-600">{s.problem}</span>
      <span className="text-sm text-gray-400">{s.submittedAt}</span>
      <div className="flex items-center">
        <Badge variant={statusDisplay(s).variant}>{statusDisplay(s).label}</Badge>
      </div>
      <div>
        <Link to={`/trainer/submissions/${s.id}`} className="text-xs text-accent font-semibold hover:underline">
          {s.status === 'PENDING' ? 'Review' : 'View'}
        </Link>
      </div>
    </div>
  )
}