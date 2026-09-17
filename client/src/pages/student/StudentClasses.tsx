import { Link } from 'react-router-dom'
import { Users, ArrowRight } from 'lucide-react'
import { Badge } from '../../components/ui/Badge'
import { ProgressBar } from '../../components/ui/ProgressBar'

type ClassItem = {
  id: number
  name: string
  description: string
  status: 'ACTIVE' | 'INACTIVE'
  trainers: number
  students: number
  completed: number
  total: number
}

const classes: ClassItem[] = [
  {
    id: 2,
    name: 'WeCamp Batch 22',
    description: 'NAB WeCamp Batch 22 — DSA Training Program',
    status: 'ACTIVE',
    trainers: 3,
    students: 42,
    completed: 6,
    total: 10,
  },
]

export function StudentClasses() {
  return (
    <div>
      <div className="mb-7">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1">Student</p>
        <h1 className="text-2xl font-bold text-gray-900">My Classes</h1>
      </div>

      <div className="space-y-4">
        {classes.map((c) => {
          const pct = Math.round((c.completed / c.total) * 100)
          return (
            <div key={c.id} className="bg-white rounded-2xl shadow-sm p-6 flex items-center justify-between gap-6">
              <div className="flex-1 min-w-0">
                {/* Title + badge */}
                <div className="flex items-center gap-2.5 mb-1">
                  <h2 className="font-bold text-gray-900 text-lg">{c.name}</h2>
                  <Badge variant={c.status}>{c.status === 'ACTIVE' ? 'Active' : 'Inactive'}</Badge>
                </div>
                <p className="text-sm text-gray-400 mb-3">{c.description}</p>

                {/* Trainers & Students */}
                <div className="flex items-center gap-4 mb-3">
                  <span className="flex items-center gap-1.5 text-sm text-gray-500">
                    <Users size={14} className="text-gray-400" /> {c.trainers} Trainers
                  </span>
                  <span className="flex items-center gap-1.5 text-sm text-gray-500">
                    <Users size={14} className="text-gray-400" /> {c.students} Students
                  </span>
                </div>

                {/* Progress */}
                <div className="max-w-md">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs text-gray-500">{c.completed} / {c.total} Problems Completed</span>
                    <span className="text-xs font-semibold text-gray-700">{pct}%</span>
                  </div>
                  <ProgressBar value={pct} />
                </div>
              </div>

              <Link to={`/student/classes/${c.id}/overview`}>
                <button className="flex items-center gap-2 bg-accent hover:bg-accent-hover text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors flex-shrink-0">
                  Open Class <ArrowRight size={14} />
                </button>
              </Link>
            </div>
          )
        })}
      </div>
    </div>
  )
}
