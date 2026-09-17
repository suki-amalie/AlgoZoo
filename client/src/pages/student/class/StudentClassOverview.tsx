import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Users, BookOpen, CheckCircle2, Clock, Circle } from 'lucide-react'
import { ClassTabNav } from '../../../components/layout/ClassTabNav'
import { ProgressBar } from '../../../components/ui/ProgressBar'
import { getProblemStatus } from '../../../utils/studentStore'

const classData: Record<string, { name: string; description: string; status: 'ACTIVE' | 'INACTIVE'; trainers: number; students: number; completed: number; total: number }> = {
  '2': {
    name: 'WeCamp Batch 22',
    description: 'NAB WeCamp Batch 22 — DSA Training Program',
    status: 'ACTIVE',
    trainers: 3,
    students: 42,
    completed: 6,
    total: 10,
  },
}

type ProblemProgress = {
  id: number
  label: string
}

const baseProblemProgress: ProblemProgress[] = [
  { id: 1, label: 'Two Sum' },
  { id: 2, label: 'Binary Search' },
  { id: 3, label: 'Reverse Linked List' },
  { id: 4, label: 'Process Scheduling' },
]

const statusConfig: Record<string, { icon: React.ReactNode; label: string; color: string }> = {
  reviewed: { icon: <CheckCircle2 size={16} className="text-green-500" />, label: 'Reviewed', color: 'text-green-600' },
  pending: { icon: <Clock size={16} className="text-orange-500" />, label: 'Pending review', color: 'text-orange-600' },
  'not-started': { icon: <Circle size={16} className="text-gray-300" />, label: 'Not started', color: 'text-gray-400' },
}

export function StudentClassOverview() {
  const { classId = '2' } = useParams()
  const cls = classData[classId] ?? classData['2']
  const pct = Math.round((cls.completed / cls.total) * 100)
  const [tick, setTick] = useState(0)

  useEffect(() => {
    const handleUpdate = () => setTick((t) => t + 1)
    window.addEventListener('algozoo_store_updated', handleUpdate)
    return () => window.removeEventListener('algozoo_store_updated', handleUpdate)
  }, [])

  const tabs = [
    { label: 'Overview', to: `/student/classes/${classId}/overview` },
    { label: 'Problems', to: `/student/classes/${classId}/problems` },
  ]

  return (
    <div>
      <ClassTabNav
        crumbs={[
          { label: 'My Classes', to: '/student/classes' },
          { label: cls.name, to: `/student/classes/${classId}/overview` },
          { label: 'Overview' },
        ]}
        title={cls.name}
        status={cls.status}
        tabs={tabs}
      />

      <div className="grid lg:grid-cols-2 gap-5">
        {/* Class Information */}
        <div className="bg-white rounded-2xl shadow-sm p-6 space-y-5">
          <h3 className="font-bold text-gray-900">Class Information</h3>

          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1">Description</p>
            <p className="text-sm text-gray-600">{cls.description}</p>
          </div>

          <div className="flex gap-8">
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1">Trainers</p>
              <div className="flex items-center gap-1.5 text-sm font-bold text-gray-900">
                <Users size={14} className="text-gray-400" /> {cls.trainers}
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1">Students</p>
              <div className="flex items-center gap-1.5 text-sm font-bold text-gray-900">
                <Users size={14} className="text-gray-400" /> {cls.students}
              </div>
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2">Your Progress</p>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-sm font-medium text-gray-700">{cls.completed} / {cls.total} problems completed</span>
              <span className="text-sm font-bold text-gray-900">{pct}%</span>
            </div>
            <ProgressBar value={pct} height="h-2" />
          </div>
        </div>

        {/* Problem Progress */}
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <div className="flex items-center gap-2 mb-4">
            <BookOpen size={16} className="text-gray-400" />
            <h3 className="font-bold text-gray-900">Problem Progress</h3>
          </div>
          <div className="space-y-1">
            {baseProblemProgress.map((p) => {
              const status = getProblemStatus(p.id)
              const cfg = statusConfig[status]
              const link =
                status !== 'not-started'
                  ? `/student/submissions/${p.id}?fromClass=${classId}`
                  : `/student/classes/${classId}/problems/${p.id}`

              return (
                <Link
                  key={p.id}
                  to={link}
                  className="flex items-center justify-between py-2.5 px-3 -mx-3 rounded-xl hover:bg-gray-50 border-b border-gray-50 last:border-0 transition-colors group"
                >
                  <span className="text-sm font-medium text-gray-800 group-hover:text-accent transition-colors">
                    {p.label}
                  </span>
                  <div className={`flex items-center gap-1.5 text-xs font-semibold ${cfg.color}`}>
                    {cfg.icon}
                    <span>{cfg.label}</span>
                  </div>
                </Link>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
