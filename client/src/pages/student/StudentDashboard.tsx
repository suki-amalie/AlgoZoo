import { Link } from 'react-router-dom'
import { ClipboardList, CheckCircle, ArrowRight } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'

// ─── Mock data (will be replaced with api.ts calls) ────────────────────────────

const stats = {
  totalProblems: 6,
  reviewedSubmissions: 1,
}

type Deadline = {
  id: number
  problem: string
  class: string
  deadline: string
  daysLeft: number
}

const deadlines: Deadline[] = [
  { id: 1, problem: 'Binary Search', class: 'Batch 22', deadline: 'Sep 22, 2026', daysLeft: 10 },
  { id: 2, problem: 'Process Scheduling', class: 'Batch 22', deadline: 'Sep 18, 2026', daysLeft: 6 },
  { id: 3, problem: 'SQL Queries', class: 'Batch 22', deadline: 'Sep 15, 2026', daysLeft: 2 },
]

type RecentSubmission = {
  id: number
  problem: string
  class: string
  status: 'Reviewed' | 'Pending'
  date: string
}

const recentSubmissions: RecentSubmission[] = [
  { id: 1, problem: 'Two Sum', class: 'Batch 22', status: 'Reviewed', date: 'Sep 10' },
  { id: 2, problem: 'Binary Search', class: 'Batch 22', status: 'Pending', date: 'Sep 14' },
]

// ─── Helpers ───────────────────────────────────────────────────────────────────

function getDaysLeftColor(days: number): string {
  if (days <= 2) return 'text-red-500 font-semibold'
  if (days <= 6) return 'text-orange-500 font-semibold'
  return 'text-gray-700'
}

function getStatusBadge(status: 'Reviewed' | 'Pending') {
  if (status === 'Reviewed') {
    return (
      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700">
        Reviewed
      </span>
    )
  }
  return (
    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-orange-100 text-orange-600">
      Pending
    </span>
  )
}

// ─── Component ─────────────────────────────────────────────────────────────────

export function StudentDashboard() {
  const { user } = useAuth()
  const firstName = user.name.split(' ')[0]

  return (
    <div>
      {/* Greeting */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Good morning, {firstName}</h1>
        <p className="text-sm text-gray-400 mt-1">Here's your learning progress.</p>
      </div>

      {/* ── Stat Cards ── */}
      <div className="grid grid-cols-2 gap-5 mb-5">
        {/* Total Problems */}
        <div className="bg-white rounded-2xl shadow-sm px-6 py-5 flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500">Total Problems</p>
            <p className="text-4xl font-bold text-gray-900 mt-1">{stats.totalProblems}</p>
            <p className="text-xs text-gray-400 mt-1">Assigned to you</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center flex-shrink-0">
            <ClipboardList size={20} className="text-accent" />
          </div>
        </div>

        {/* Reviewed Submissions */}
        <div className="bg-white rounded-2xl shadow-sm px-6 py-5 flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500">Reviewed Submissions</p>
            <p className="text-4xl font-bold text-gray-900 mt-1">{stats.reviewedSubmissions}</p>
            <p className="text-xs text-gray-400 mt-1">{stats.reviewedSubmissions} / {stats.totalProblems} problems</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center flex-shrink-0">
            <CheckCircle size={20} className="text-green-500" />
          </div>
        </div>
      </div>

      {/* ── Tables Row ── */}
      <div className="grid grid-cols-2 gap-5">
        {/* Upcoming Deadlines */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4">
            <h2 className="text-base font-bold text-gray-900">Upcoming Deadlines</h2>
            <Link
              to="/student/classes"
              className="flex items-center gap-1 text-sm font-semibold text-accent hover:underline"
            >
              View all <ArrowRight size={14} />
            </Link>
          </div>

          {/* Column headers */}
          <div className="grid grid-cols-[1fr_80px_120px_50px] px-6 py-2.5 border-t border-gray-100">
            {['PROBLEM', 'CLASS', 'DEADLINE', 'LEFT'].map((h) => (
              <span key={h} className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                {h}
              </span>
            ))}
          </div>

          {/* Rows */}
          <div>
            {deadlines.map((d, i) => (
              <div
                key={d.id}
                className={`grid grid-cols-[1fr_80px_120px_50px] items-center px-6 py-3.5 ${
                  i < deadlines.length - 1 ? 'border-b border-gray-50' : ''
                }`}
              >
                <span className="text-sm font-medium text-gray-900">{d.problem}</span>
                <span className="text-sm text-gray-500">{d.class}</span>
                <span className="text-sm text-gray-500">{d.deadline}</span>
                <span className={`text-sm ${getDaysLeftColor(d.daysLeft)}`}>
                  {d.daysLeft}d
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Submissions */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4">
            <h2 className="text-base font-bold text-gray-900">Recent Submissions</h2>
            <Link
              to="/student/submissions"
              className="flex items-center gap-1 text-sm font-semibold text-accent hover:underline"
            >
              View all <ArrowRight size={14} />
            </Link>
          </div>

          {/* Column headers */}
          <div className="grid grid-cols-[1fr_80px_100px_70px] px-6 py-2.5 border-t border-gray-100">
            {['PROBLEM', 'CLASS', 'STATUS', 'DATE'].map((h) => (
              <span key={h} className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                {h}
              </span>
            ))}
          </div>

          {/* Rows */}
          <div>
            {recentSubmissions.map((s, i) => (
              <div
                key={s.id}
                className={`grid grid-cols-[1fr_80px_100px_70px] items-center px-6 py-3.5 ${
                  i < recentSubmissions.length - 1 ? 'border-b border-gray-50' : ''
                }`}
              >
                <span className="text-sm font-medium text-gray-900">{s.problem}</span>
                <span className="text-sm text-gray-500">{s.class}</span>
                {getStatusBadge(s.status)}
                <span className="text-sm text-gray-500">{s.date}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
