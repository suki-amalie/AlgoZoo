import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, BookOpen, Search, Users } from 'lucide-react'
import { Badge } from '../../components/ui/Badge'
import { useAuth } from '../../hooks/useAuth'
import * as adminService from '../../services/adminService'
import type { AdminClass } from '../../types/admin'
import type { AdminDashboardData, AdminStudentProgress } from '../../types/adminDashboard'

function Metric({ label, value, detail, icon, tone }: { label: string; value: number; detail: string; icon: React.ReactNode; tone: string }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm p-6 flex items-center justify-center gap-5">
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${tone}`}>{icon}</div>
      <div>
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">{label}</p>
        <p className="text-3xl font-bold text-gray-900 leading-tight">{value}</p>
        <p className="text-xs text-gray-400">{detail}</p>
      </div>
    </div>
  )
}

const STUDENT_TABLE_COLS: React.CSSProperties = {
  gridTemplateColumns: 'minmax(170px, 2.8fr) minmax(110px, 1.5fr) minmax(85px, 0.7fr) minmax(140px, 1.8fr) 20px',
  columnGap: '12px',
}

const STUDENT_PROGRESS_COLS: React.CSSProperties = {
  gridTemplateColumns: '36px 1fr 38px',
}

function StudentTable({ students }: { students: AdminStudentProgress[] }) {
  const [search, setSearch] = useState('')
  const filtered = search
    ? students.filter((s) => s.fullname.toLowerCase().includes(search.toLowerCase()) || s.email.toLowerCase().includes(search.toLowerCase()))
    : students

  return (
    <section className="bg-white rounded-2xl shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-accent/10 flex items-center justify-center"><Users size={17} className="text-accent" /></div>
          <h2 className="font-bold text-gray-900">Students</h2>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input
              placeholder="Search students..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 pr-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:border-accent/60 w-44"
            />
          </div>
          <Link to="/admin/users" className="text-xs font-semibold text-accent flex items-center gap-1 whitespace-nowrap">View all students <ArrowRight size={13} /></Link>
        </div>
      </div>
      <div className="grid px-6 py-2.5 bg-gray-50 border-b border-gray-100 text-[10px] font-bold text-gray-400 tracking-widest" style={STUDENT_TABLE_COLS}>
        <span>STUDENT</span><span>CLASS</span><span>COMPLETED</span><span>PROGRESS</span><span />
      </div>
      {filtered.length ? filtered.slice(0, 8).map((student) => {
        const initials = student.fullname.split(' ').filter(Boolean).slice(0, 2).map((n) => n[0]?.toUpperCase() || '').join('')
        return (
          <div key={`${student.student_id}-${student.class_id}`} className="grid items-center px-6 py-3.5 border-b border-gray-50" style={STUDENT_TABLE_COLS}>
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center text-white text-xs font-bold flex-shrink-0">{initials}</div>
              <div className="min-w-0"><p className="text-sm font-semibold text-gray-900 truncate">{student.fullname}</p><p className="text-xs text-gray-400 truncate">{student.email}</p></div>
            </div>
            <span className="text-sm text-gray-500 truncate">{student.className}</span>
            <span className="text-sm text-gray-600 tabular-nums">{student.submissionCount}/{student.problemCount}</span>
            <div>
              <div className="grid items-center gap-2" style={STUDENT_PROGRESS_COLS}>
                <span className="text-xs font-medium text-accent text-right tabular-nums">{student.submissionCount}/{student.problemCount}</span>
                <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden"><div className="h-full rounded-full bg-accent" style={{ width: `${student.progressPercent}%` }} /></div>
                <span className="text-xs text-gray-500 text-right tabular-nums">{student.progressPercent}%</span>
              </div>
            </div>
            <span className="text-gray-400 text-sm text-center cursor-pointer select-none">···</span>
          </div>
        )
      }) : <p className="p-6 text-sm text-gray-400">No student progress available.</p>}
    </section>
  )
}

const subjectBarColor: Record<string, string> = {
  DSA: 'bg-orange-400',
  OS: 'bg-purple-400',
  Database: 'bg-green-400',
}

export function AdminDashboard() {
  const { user } = useAuth()
  const [classes, setClasses] = useState<AdminClass[]>([])
  const [selectedClassId, setSelectedClassId] = useState('')
  const [dashboard, setDashboard] = useState<AdminDashboardData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const loadClasses = async () => {
      try { setClasses(await adminService.getClasses()) } catch { /* dashboard request reports the visible error */ }
    }
    void loadClasses()
  }, [])

  useEffect(() => {
    const loadDashboard = async () => {
      setIsLoading(true)
      try {
        setError('')
        setDashboard((await adminService.getDashboard(selectedClassId || undefined)).data)
      } catch (requestError) {
        setError(requestError instanceof Error ? requestError.message : 'Unable to load dashboard')
      } finally {
        setIsLoading(false)
      }
    }
    void loadDashboard()
  }, [selectedClassId])

  return (
    <div>
      <div className="mb-5"><h1 className="text-2xl font-bold text-gray-900">Good morning, {user?.name?.split(' ')[0] || 'Admin'}</h1><p className="text-sm text-gray-400 mt-1">Platform overview — here&apos;s how things are running.</p></div>

      <div className="bg-white rounded-2xl shadow-sm px-5 py-4 mb-5">
        <label className="text-xs font-bold text-gray-400 uppercase tracking-widest block mb-2" htmlFor="class-filter">Batch</label>
        <select id="class-filter" value={selectedClassId} onChange={(event) => setSelectedClassId(event.target.value)} className="border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-700 focus:outline-none focus:border-accent/60 w-44">
          <option value="">All Classes</option>
          {classes.map((classItem) => <option key={classItem.id} value={classItem.id}>{classItem.name}</option>)}
        </select>
      </div>

      {error && <p className="mb-5 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
      {isLoading && <p className="mb-5 text-sm text-gray-500">Loading dashboard...</p>}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5"><Metric label="Classes" value={dashboard?.classes.total ?? 0} detail={`${dashboard?.classes.active ?? 0} active · ${dashboard?.classes.inactive ?? 0} inactive`} icon={<BookOpen size={18} />} tone="bg-red-50 text-red-500" /><Metric label="Students" value={dashboard?.students.total ?? 0} detail={`${dashboard?.students.active ?? 0} active · ${dashboard?.students.inactive ?? 0} inactive`} icon={<Users size={18} />} tone="bg-blue-50 text-blue-500" /></div>

      <div className="grid xl:grid-cols-[3fr_2fr] gap-5 items-start">
        <StudentTable students={dashboard?.studentsProgress ?? []} />

        <div className="space-y-5">
          {/* Class Progress */}
          <section className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-bold text-gray-900">Class Progress</h2>
              <Link to="/admin/classes" className="text-xs font-semibold text-accent flex items-center gap-1">View all classes <ArrowRight size={13} /></Link>
            </div>
            {dashboard?.classProgress.length ? (
              <>
                <div className="grid grid-cols-[1fr_40px_40px_56px] px-5 py-2 text-[10px] font-bold text-gray-400 tracking-widest border-b border-gray-100">
                  <span>CLASS</span><span>STUD.</span><span>PROB.</span><span>PROGRESS</span>
                </div>
                {dashboard.classProgress.map((item) => {
                  const initial = item.name[0]?.toUpperCase() || 'C'
                  const r = 12
                  const circumference = 2 * Math.PI * r
                  const dash = (item.progressPercent / 100) * circumference
                  return (
                    <Link key={item.class_id} to={`/admin/classes/${item.class_id}/manage`} className="grid grid-cols-[1fr_40px_40px_56px] items-center px-5 py-3.5 border-b border-gray-50 hover:bg-gray-50">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center text-white text-xs font-bold flex-shrink-0">{initial}</div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-gray-900 truncate">{item.name}</p>
                          <Badge variant={item.isActive ? 'active' : 'disabled'}>{item.isActive ? 'Active' : 'Inactive'}</Badge>
                        </div>
                      </div>
                      <span className="text-sm font-medium text-gray-700">{item.studentCount}</span>
                      <span className="text-sm font-medium text-gray-700">{item.problemCount}</span>
                      <div className="flex items-center justify-center">
                        <svg width="40" height="40" viewBox="0 0 40 40">
                          <circle cx="20" cy="20" r={r} fill="none" stroke="#e5e7eb" strokeWidth="3" />
                          <circle cx="20" cy="20" r={r} fill="none" stroke="#ef4444" strokeWidth="3"
                            strokeDasharray={`${dash} ${circumference}`} strokeLinecap="round" transform="rotate(-90 20 20)" />
                          <text x="20" y="24" textAnchor="middle" fontSize="8" fontWeight="bold" fill="#111827">{item.progressPercent}%</text>
                        </svg>
                      </div>
                    </Link>
                  )
                })}
              </>
            ) : <p className="p-5 text-sm text-gray-400">No class progress available.</p>}
          </section>

          {/* Subject Overview */}
          <section className="bg-white rounded-2xl shadow-sm p-5">
            <h2 className="font-bold text-gray-900 mb-4">Subject Overview</h2>
            {dashboard?.subjectOverview.length ? dashboard.subjectOverview.map((subject) => (
              <div key={subject.problemType} className="mb-4 last:mb-0">
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="font-semibold text-gray-700">{subject.problemType}</span>
                  <span className="text-gray-400">{subject.submissionCount} submissions · {subject.progressPercent}%</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${subjectBarColor[subject.problemType] ?? 'bg-accent'}`} style={{ width: `${subject.progressPercent}%` }} />
                </div>
              </div>
            )) : <p className="text-sm text-gray-400">No subject progress available.</p>}
          </section>
        </div>
      </div>
    </div>
  )
}
