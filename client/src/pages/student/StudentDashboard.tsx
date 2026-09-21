import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, CheckCircle2, ClipboardList, Clock, Loader2 } from 'lucide-react'
import { StatCard } from '../../components/ui/StatCard'
import { Badge } from '../../components/ui/Badge'
import { useAuth } from '../../hooks/useAuth'
import { studentService } from '../../services/studentService'
import type { StudentDashboard as DashboardData } from '../../types/studentDashboard'

export function StudentDashboard() {
  const { user } = useAuth()
  const [selectedClass, setSelectedClass] = useState('')
  const [dashboard, setDashboard] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    studentService.getClasses().then((response) => { setSelectedClass(response.data[0]?.classId || '') }).catch((requestError) => setError(requestError instanceof Error ? requestError.message : 'Unable to load classes')).finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (!selectedClass) return
    setLoading(true)
    studentService.getDashboard(selectedClass).then((response) => setDashboard(response.data)).catch((requestError) => setError(requestError instanceof Error ? requestError.message : 'Unable to load dashboard')).finally(() => setLoading(false))
  }, [selectedClass])

  const firstName = user?.name.split(' ')[0] || 'there'
  const stats = dashboard?.stats

  return (
    <div>
      <div className="mb-5">
        <h1 className="text-2xl font-bold text-gray-900">Good morning, {firstName}</h1>
        <p className="text-sm text-gray-400 mt-1">Here&apos;s your learning progress.</p>
      </div>

{error && <p className="mb-5 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
      {loading && <p className="mb-5 flex items-center gap-2 text-sm text-gray-400"><Loader2 size={16} className="animate-spin" /> Loading...</p>}

      {/* Stat cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">
        <StatCard label="Total Problems" value={stats?.totalProblems ?? 0} icon={<ClipboardList size={18} className="text-blue-600" />} color="bg-blue-50" trend="Assigned to you" />
        <StatCard label="Reviewed Submissions" value={stats?.reviewedCount ?? 0} icon={<CheckCircle2 size={18} className="text-green-600" />} color="bg-green-50" trend={`${stats?.reviewedCount ?? 0} / ${stats?.totalProblems ?? 0} problems`} />
        <StatCard label="Pending Review" value={stats?.pendingReviewCount ?? 0} icon={<Clock size={18} className="text-amber-600" />} color="bg-amber-50" trend="Waiting for feedback" />
      </div>

      {/* Bottom panels */}
      <div className="grid lg:grid-cols-2 gap-5">
        {/* Upcoming Deadlines */}
        <section className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex justify-between">
            <h2 className="font-bold text-gray-900">Upcoming Deadlines</h2>
            <Link to={`/student/classes/${selectedClass}/problems`} className="text-xs text-accent font-semibold flex items-center gap-1">View all <ArrowRight size={12} /></Link>
          </div>
          {dashboard?.upcomingDeadlines.length ? (
            <>
              <div className="grid grid-cols-[1fr_100px_120px_45px] px-6 py-2 text-[10px] font-bold text-gray-400 tracking-widest border-b border-gray-50">
                <span>PROBLEM</span><span>CLASS</span><span>DEADLINE</span><span>LEFT</span>
              </div>
              {dashboard.upcomingDeadlines.map((item) => (
                <Link key={item.classProblemId} to={`/student/classes/${selectedClass}/problems/${item.classProblemId}`} className="grid grid-cols-[1fr_100px_120px_45px] items-center px-6 py-4 border-b border-gray-50 hover:bg-gray-50 last:border-b-0">
                  <span className="text-sm font-medium text-gray-900">{item.title}</span>
                  <span className="text-sm text-gray-400">{item.className}</span>
                  <span className="text-sm text-gray-400">{new Date(item.deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                  <span className="text-sm font-semibold text-accent">{item.daysLeft}</span>
                </Link>
              ))}
            </>
          ) : <p className="p-6 text-sm text-gray-400">No upcoming deadlines.</p>}
        </section>

        {/* Recent Submissions */}
        <section className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex justify-between">
            <h2 className="font-bold text-gray-900">Recent Submissions</h2>
            <Link to="/student/submissions" className="text-xs text-accent font-semibold flex items-center gap-1">View all <ArrowRight size={12} /></Link>
          </div>
          {dashboard?.recentSubmissions.length ? (
            <>
              <div className="grid grid-cols-[7fr_6fr_4fr_3fr] px-6 py-2 text-[10px] font-bold text-gray-400 tracking-widest border-b border-gray-50">
                <span>PROBLEM</span><span>CLASS</span><span>STATUS</span><span>DATE</span>
              </div>
              {dashboard.recentSubmissions.map((item) => (
                <div key={item.submissionId} className="grid grid-cols-[7fr_6fr_4fr_3fr] items-center px-6 py-4 border-b border-gray-50 last:border-b-0">
                  <span className="text-sm font-medium text-gray-900 truncate min-w-0">{item.title}</span>
                  <span className="text-sm text-gray-400 truncate min-w-0">{item.className}</span>
                  <div><Badge variant={item.status === 'Reviewed' ? 'reviewed' : item.status === 'Late' ? 'late' : 'pending'}>{item.status}</Badge></div>
                  <span className="text-sm text-gray-400">{new Date(item.submittedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                </div>
              ))}
            </>
          ) : <p className="p-6 text-sm text-gray-400">No submissions yet.</p>}
        </section>
      </div>
    </div>
  )
}
