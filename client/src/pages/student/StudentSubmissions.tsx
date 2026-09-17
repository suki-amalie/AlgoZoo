import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { TypeBadge, Badge } from '../../components/ui/Badge'
import { getSubmissionsMap, getSubmittedProblemIds } from '../../utils/studentStore'

export function StudentSubmissions() {
  const [tick, setTick] = useState(0)

  useEffect(() => {
    const handleUpdate = () => setTick((t) => t + 1)
    window.addEventListener('algozoo_store_updated', handleUpdate)
    return () => window.removeEventListener('algozoo_store_updated', handleUpdate)
  }, [])

  const map = getSubmissionsMap()
  const ids = getSubmittedProblemIds()
  const submissionsList = ids
    .map((id) => map[id])
    .filter(Boolean)

  return (
    <div>
      <div className="mb-7">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1">Student</p>
        <h1 className="text-2xl font-bold text-gray-900">My Submissions</h1>
      </div>

      <div className="bg-white rounded-2xl shadow-sm overflow-hidden border border-gray-100">
        {/* Table header */}
        <div className="grid grid-cols-[1fr_80px_120px_120px_100px] px-6 py-3 border-b border-gray-100 bg-gray-50/70">
          {['PROBLEM', 'TYPE', 'CLASS', 'STATUS', 'DATE'].map((h) => (
            <span key={h} className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
              {h}
            </span>
          ))}
        </div>

        {/* Rows */}
        {submissionsList.map((s, i) => (
          <Link
            key={s.id}
            to={`/student/submissions/${s.id}`}
            className={`grid grid-cols-[1fr_80px_120px_120px_100px] items-center px-6 py-4 hover:bg-gray-50 transition-colors ${
              i < submissionsList.length - 1 ? 'border-b border-gray-50' : ''
            }`}
          >
            <span className="text-sm font-semibold text-gray-900">{s.problem}</span>
            <TypeBadge type={s.type} />
            <span className="text-xs font-medium text-gray-500">{s.class}</span>
            <div>
              <Badge variant={s.status === 'Reviewed' ? 'reviewed' : 'pending'}>
                {s.status === 'Reviewed' ? 'Reviewed' : 'Pending'}
              </Badge>
            </div>
            <span className="text-xs text-gray-400">
              {s.submittedAt.includes('at') ? s.submittedAt.split(' at')[0] : s.submittedAt}
            </span>
          </Link>
        ))}
        {submissionsList.length === 0 && (
          <div className="py-12 text-center text-sm text-gray-400">No submissions yet</div>
        )}
      </div>
    </div>
  )
}
