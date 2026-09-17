import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  BookOpen, GraduationCap, Users, User, Search,
  ChevronDown, ChevronLeft, ChevronRight, MoreHorizontal,
  Calendar, ArrowRight
} from 'lucide-react'

// ─── Types ─────────────────────────────────────────────────────────────────────

type StudentItem = {
  id: string
  name: string
  email: string
  initials: string
  classId: string
  className: string
  completed: number
  total: number
  progress: number
  subject: 'DSA' | 'OS' | 'Database'
}

type ClassItem = {
  id: string
  name: string
  status: 'ACTIVE' | 'INACTIVE'
  date: string
  studentsCount: number
  problemsCount: number
  progress: number
}

type SubjectMetric = {
  name: 'DSA' | 'OS' | 'Database'
  subs: number
  rate: number
  color: string
}

// ─── Mock Data ─────────────────────────────────────────────────────────────────

const ALL_STUDENTS: StudentItem[] = [
  {
    id: 's1',
    name: 'Alice Nguyen',
    email: 'alice.nguyen@wecamp.edu',
    initials: 'AN',
    classId: 'wecamp-15',
    className: 'WeCamp Batch 15',
    completed: 28,
    total: 35,
    progress: 80,
    subject: 'DSA',
  },
  {
    id: 's2',
    name: 'Kim Nguyen',
    email: 'kim.nguyen@wecamp.edu',
    initials: 'KN',
    classId: 'wecamp-15',
    className: 'WeCamp Batch 15',
    completed: 35,
    total: 35,
    progress: 100,
    subject: 'DSA',
  },
  {
    id: 's3',
    name: 'Duc Tran',
    email: 'duc.tran@wecamp.edu',
    initials: 'DT',
    classId: 'wecamp-15',
    className: 'WeCamp Batch 15',
    completed: 20,
    total: 35,
    progress: 57,
    subject: 'OS',
  },
  {
    id: 's4',
    name: 'Long Tran',
    email: 'long.tran@wecamp.edu',
    initials: 'LT',
    classId: 'wecamp-15',
    className: 'WeCamp Batch 15',
    completed: 14,
    total: 35,
    progress: 40,
    subject: 'Database',
  },
  {
    id: 's5',
    name: 'Viet Nguyen',
    email: 'viet.nguyen@starcamp.edu',
    initials: 'VN',
    classId: 'starcamp-2',
    className: 'StarCamp Batch 2',
    completed: 20,
    total: 28,
    progress: 71,
    subject: 'DSA',
  },
  {
    id: 's6',
    name: 'Trang Nguyen',
    email: 'trang.nguyen@starcamp.edu',
    initials: 'TN',
    classId: 'starcamp-2',
    className: 'StarCamp Batch 2',
    completed: 28,
    total: 28,
    progress: 100,
    subject: 'Database',
  },
  {
    id: 's7',
    name: 'Hieu Tran',
    email: 'hieu.tran@starcamp.edu',
    initials: 'HT',
    classId: 'starcamp-2',
    className: 'StarCamp Batch 2',
    completed: 12,
    total: 28,
    progress: 43,
    subject: 'OS',
  },
  {
    id: 's8',
    name: 'Son Nguyen',
    email: 'son.nguyen@wecamp.edu',
    initials: 'SN',
    classId: 'wecamp-1',
    className: 'WeCamp Batch 1',
    completed: 25,
    total: 30,
    progress: 83,
    subject: 'DSA',
  },
  {
    id: 's9',
    name: 'Bao Le',
    email: 'bao.le@starcamp.edu',
    initials: 'BL',
    classId: 'starcamp-1',
    className: 'StarCamp Batch 1',
    completed: 25,
    total: 25,
    progress: 100,
    subject: 'DSA',
  },
  {
    id: 's10',
    name: 'Minh Pham',
    email: 'minh.pham@wecamp.edu',
    initials: 'MP',
    classId: 'wecamp-1',
    className: 'WeCamp Batch 1',
    completed: 27,
    total: 30,
    progress: 90,
    subject: 'OS',
  },
  {
    id: 's11',
    name: 'Phuong Do',
    email: 'phuong.do@starcamp.edu',
    initials: 'PD',
    classId: 'starcamp-1',
    className: 'StarCamp Batch 1',
    completed: 24,
    total: 25,
    progress: 96,
    subject: 'Database',
  },
  {
    id: 's12',
    name: 'Quang Vu',
    email: 'quang.vu@starcamp.edu',
    initials: 'QV',
    classId: 'starcamp-2',
    className: 'StarCamp Batch 2',
    completed: 18,
    total: 28,
    progress: 64,
    subject: 'DSA',
  },
]

const ALL_CLASSES: ClassItem[] = [
  {
    id: 'wecamp-15',
    name: 'WeCamp Batch 15',
    status: 'ACTIVE',
    date: 'Mar 30, 2025',
    studentsCount: 24,
    problemsCount: 35,
    progress: 62,
  },
  {
    id: 'starcamp-2',
    name: 'StarCamp Batch 2',
    status: 'ACTIVE',
    date: 'Apr 15, 2025',
    studentsCount: 18,
    problemsCount: 28,
    progress: 45,
  },
  {
    id: 'wecamp-1',
    name: 'WeCamp Batch 1',
    status: 'ACTIVE',
    date: 'Nov 30, 2024',
    studentsCount: 22,
    problemsCount: 30,
    progress: 88,
  },
  {
    id: 'starcamp-1',
    name: 'StarCamp Batch 1',
    status: 'INACTIVE',
    date: 'Dec 20, 2024',
    studentsCount: 20,
    problemsCount: 25,
    progress: 100,
  },
]

const BATCH_OPTIONS = [
  'All Classes',
  'WeCamp Batch 15',
  'StarCamp Batch 2',
  'WeCamp Batch 1',
  'StarCamp Batch 1',
]

// ─── Circular Progress Gauge ───────────────────────────────────────────────────

function CircularGauge({ value }: { value: number }) {
  const isHigh = value >= 80
  const strokeColor = isHigh ? '#10B981' : '#DC2626'
  const radius = 9
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (value / 100) * circumference

  return (
    <div className="flex items-center gap-1.5 flex-shrink-0">
      <svg className="w-5 h-5 -rotate-90" viewBox="0 0 24 24">
        <circle
          cx="12"
          cy="12"
          r={radius}
          fill="none"
          stroke="#E5E7EB"
          strokeWidth="2.5"
        />
        <circle
          cx="12"
          cy="12"
          r={radius}
          fill="none"
          stroke={strokeColor}
          strokeWidth="2.5"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
        />
      </svg>
      <span className="text-xs font-bold text-gray-800">{value}%</span>
    </div>
  )
}

// ─── Main Admin Dashboard Component ────────────────────────────────────────────

export function AdminDashboard() {
  const [selectedBatch, setSelectedBatch] = useState('All Classes')
  const [showBatchMenu, setShowBatchMenu] = useState(false)
  const [studentSearch, setStudentSearch] = useState('')
  const [selectedSubject, setSelectedSubject] = useState<'DSA' | 'OS' | 'Database' | null>(null)
  const [page, setPage] = useState(1)
  const pageSize = 8

  // Filter students
  const filteredStudents = useMemo(() => {
    return ALL_STUDENTS.filter((s) => {
      const matchBatch =
        selectedBatch === 'All Classes' || s.className === selectedBatch
      const matchSearch =
        s.name.toLowerCase().includes(studentSearch.toLowerCase()) ||
        s.email.toLowerCase().includes(studentSearch.toLowerCase())
      const matchSubject =
        selectedSubject === null || s.subject === selectedSubject
      return matchBatch && matchSearch && matchSubject
    })
  }, [selectedBatch, studentSearch, selectedSubject])

  // Paginated students
  const totalPages = Math.max(1, Math.ceil(filteredStudents.length / pageSize))
  const currentPage = Math.min(page, totalPages)
  const paginatedStudents = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return filteredStudents.slice(start, start + pageSize)
  }, [filteredStudents, currentPage, pageSize])

  // Filter classes
  const filteredClasses = useMemo(() => {
    if (selectedBatch === 'All Classes') return ALL_CLASSES
    return ALL_CLASSES.filter((c) => c.name === selectedBatch)
  }, [selectedBatch])

  // Subject stats
  const subjectStats: SubjectMetric[] = useMemo(() => {
    if (selectedBatch === 'WeCamp Batch 15') {
      return [
        { name: 'DSA', subs: 8, rate: 25, color: 'bg-amber-500' },
        { name: 'OS', subs: 4, rate: 25, color: 'bg-purple-600' },
        { name: 'Database', subs: 4, rate: 25, color: 'bg-emerald-500' },
      ]
    }
    return [
      { name: 'DSA', subs: 19, rate: 42, color: 'bg-amber-500' },
      { name: 'OS', subs: 11, rate: 45, color: 'bg-purple-600' },
      { name: 'Database', subs: 10, rate: 40, color: 'bg-emerald-500' },
    ]
  }, [selectedBatch])

  return (
    <div className="space-y-5 pb-10">
      {/* ── Header ── */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Good morning, Maya</h1>
        <p className="text-xs text-gray-400 mt-1">
          Platform overview — here's how things are running.
        </p>
      </div>

      {/* ── BATCH Selector ── */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">
          Batch
        </p>
        <div className="relative inline-block">
          <button
            type="button"
            onClick={() => setShowBatchMenu((prev) => !prev)}
            className={`bg-white border rounded-xl px-4 py-2 text-xs font-semibold text-gray-800 flex items-center justify-between gap-8 shadow-sm min-w-[220px] transition-all ${
              selectedBatch !== 'All Classes'
                ? 'border-[#DC2626] ring-1 ring-[#DC2626]/20'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <span>{selectedBatch}</span>
            <ChevronDown size={14} className="text-gray-400" />
          </button>

          {showBatchMenu && (
            <div className="absolute left-0 mt-1.5 bg-white border border-gray-100 rounded-xl shadow-xl py-1.5 z-20 min-w-[220px] animate-in fade-in zoom-in-95 duration-100">
              {BATCH_OPTIONS.map((b) => (
                <button
                  key={b}
                  type="button"
                  onClick={() => {
                    setSelectedBatch(b)
                    setShowBatchMenu(false)
                    setPage(1)
                  }}
                  className={`w-full text-left px-4 py-2 text-xs font-medium transition-colors ${
                    selectedBatch === b
                      ? 'text-[#DC2626] font-bold bg-red-50/60'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {b}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── 2 Big Stat Cards ── */}
      <div className="grid grid-cols-2 gap-5">
        {/* CLASSES */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex items-center justify-center gap-6">
          <div className="w-14 h-14 rounded-2xl bg-[#FEE2E2]/70 text-[#DC2626] flex items-center justify-center flex-shrink-0">
            <BookOpen size={24} className="text-[#DC2626]" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
              Classes
            </p>
            <p className="text-3xl font-extrabold text-gray-900 leading-tight mt-0.5">4</p>
            <p className="text-xs text-gray-400 mt-0.5">3 active · 1 inactive</p>
          </div>
        </div>

        {/* STUDENTS */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex items-center justify-center gap-6">
          <div className="w-14 h-14 rounded-2xl bg-[#E0F2FE] text-[#0284C7] flex items-center justify-center flex-shrink-0">
            <GraduationCap size={24} className="text-[#0284C7]" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
              Students
            </p>
            <p className="text-3xl font-extrabold text-gray-900 leading-tight mt-0.5">84</p>
            <p className="text-xs text-gray-400 mt-0.5">64 active · 20 inactive</p>
          </div>
        </div>
      </div>

      {/* ── Main Two Column Grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-[1.58fr_1fr] gap-5 items-start">
        {/* LEFT COLUMN — Students Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          {/* Header */}
          <div className="px-6 py-4 flex items-center justify-between border-b border-gray-50 flex-wrap gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-red-50 text-[#DC2626] flex items-center justify-center">
                <User size={16} />
              </div>
              <h2 className="text-base font-bold text-gray-900">Students</h2>
            </div>

            <div className="flex items-center gap-4">
              <div className="relative">
                <Search
                  size={13}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                />
                <input
                  type="text"
                  value={studentSearch}
                  onChange={(e) => {
                    setStudentSearch(e.target.value)
                    setPage(1)
                  }}
                  placeholder="Search students..."
                  className="pl-8 pr-3 py-1.5 border border-gray-200 rounded-xl text-xs w-44 focus:outline-none focus:border-red-400 text-gray-700 placeholder:text-gray-400"
                />
              </div>
              <Link
                to="/admin/users"
                className="text-xs font-semibold text-[#DC2626] hover:underline flex items-center gap-1"
              >
                View all students <ArrowRight size={12} />
              </Link>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            {/* Table Header */}
            <div className="grid grid-cols-[1.8fr_1.1fr_0.9fr_1.3fr_30px] px-6 py-3 bg-gray-50/60 border-b border-gray-100 text-[10px] font-bold text-gray-400 uppercase tracking-widest items-center">
              <span>Student</span>
              <span>Class</span>
              <span>Completed</span>
              <span>Progress</span>
              <span></span>
            </div>

            {/* Table Rows */}
            {paginatedStudents.length === 0 ? (
              <div className="py-12 text-center text-xs text-gray-400">
                No students found
              </div>
            ) : (
              paginatedStudents.map((s, idx) => (
                <div
                  key={s.id}
                  className={`grid grid-cols-[1.8fr_1.1fr_0.9fr_1.3fr_30px] items-center px-6 py-3.5 hover:bg-gray-50/60 transition-colors ${
                    idx < paginatedStudents.length - 1 ? 'border-b border-gray-50' : ''
                  }`}
                >
                  {/* Student Name & Avatar */}
                  <div className="flex items-center gap-3 min-w-0 pr-2">
                    <div className="w-8 h-8 rounded-full bg-[#DC2626] text-white text-[11px] font-bold flex items-center justify-center flex-shrink-0">
                      {s.initials}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-gray-900 truncate">{s.name}</p>
                      <p className="text-[10px] text-gray-400 truncate">{s.email}</p>
                    </div>
                  </div>

                  {/* Class Name */}
                  <div className="text-xs text-gray-500 truncate pr-2">
                    {s.className.replace('Batch', 'Bat...')}
                  </div>

                  {/* Completed */}
                  <div className="text-xs font-medium text-gray-700">
                    {s.completed} / {s.total}
                  </div>

                  {/* Progress Bar & percentage */}
                  <div className="pr-2">
                    <div className="flex items-center justify-between text-[10px] mb-1">
                      <span className="text-gray-400">{s.completed}/{s.total}</span>
                      <span className="font-bold text-gray-900">{s.progress}%</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                      <div
                        className="bg-[#DC2626] h-full rounded-full transition-all duration-300"
                        style={{ width: `${s.progress}%` }}
                      />
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="text-right">
                    <button
                      type="button"
                      className="text-gray-300 hover:text-gray-600 transition-colors p-1"
                      title="More options"
                    >
                      <MoreHorizontal size={15} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer / Pagination */}
          <div className="px-6 py-3.5 border-t border-gray-50 flex items-center justify-between">
            <span className="text-xs text-gray-400">
              {filteredStudents.length > 0
                ? `${(currentPage - 1) * pageSize + 1}-${Math.min(
                    currentPage * pageSize,
                    filteredStudents.length
                  )} of ${filteredStudents.length} students`
                : '0 students'}
            </span>

            {totalPages > 1 && (
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="w-6 h-6 rounded flex items-center justify-center text-gray-400 hover:text-gray-700 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <ChevronLeft size={14} />
                </button>

                {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPage(p)}
                    className={`w-6 h-6 rounded text-xs font-bold flex items-center justify-center transition-colors ${
                      currentPage === p
                        ? 'bg-[#DC2626] text-white shadow-sm'
                        : 'text-gray-500 hover:bg-gray-100'
                    }`}
                  >
                    {p}
                  </button>
                ))}

                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="w-6 h-6 rounded flex items-center justify-center text-gray-400 hover:text-gray-700 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <ChevronRight size={14} />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN — Class Progress & Subject Overview */}
        <div className="space-y-5">
          {/* 1. Class Progress Card */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-red-50 text-[#DC2626] flex items-center justify-center">
                  <GraduationCap size={16} />
                </div>
                <h2 className="text-base font-bold text-gray-900">Class Progress</h2>
              </div>
              <Link
                to="/admin/classes"
                className="text-xs font-semibold text-[#DC2626] hover:underline flex items-center gap-1"
              >
                View all classes <ArrowRight size={12} />
              </Link>
            </div>

            {/* Table Header */}
            <div className="grid grid-cols-[1.5fr_0.6fr_0.6fr_1fr] text-[10px] font-bold text-gray-400 uppercase tracking-widest pb-2 border-b border-gray-100">
              <span>Class</span>
              <span className="text-center">Stud.</span>
              <span className="text-center">Prob.</span>
              <span className="text-right">Progress</span>
            </div>

            {/* Table Rows */}
            <div className="divide-y divide-gray-50">
              {filteredClasses.map((cls) => (
                <div
                  key={cls.id}
                  className="grid grid-cols-[1.5fr_0.6fr_0.6fr_1fr] items-center py-3.5 hover:bg-gray-50/50 transition-colors -mx-2 px-2 rounded-xl"
                >
                  {/* Class Info */}
                  <div className="flex items-center gap-2.5 min-w-0 pr-2">
                    <div className="w-7 h-7 rounded-full bg-[#DC2626] text-white text-xs font-bold flex items-center justify-center flex-shrink-0">
                      {cls.name.startsWith('W') ? 'W' : 'S'}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-gray-900 truncate">
                        {cls.name.length > 15 ? cls.name.slice(0, 13) + '...' : cls.name}
                      </p>
                      <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                        <span
                          className={`text-[9px] font-extrabold px-1.5 py-0.2 rounded ${
                            cls.status === 'ACTIVE'
                              ? 'bg-emerald-50 text-emerald-700'
                              : 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          {cls.status}
                        </span>
                        <span className="text-[10px] text-gray-400 flex items-center gap-0.5">
                          <Calendar size={10} /> {cls.date}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Students count */}
                  <div className="text-xs font-semibold text-gray-800 text-center">
                    {cls.studentsCount}
                  </div>

                  {/* Problems count */}
                  <div className="text-xs font-semibold text-gray-800 text-center">
                    {cls.problemsCount}
                  </div>

                  {/* Circular progress meter */}
                  <div className="flex justify-end">
                    <CircularGauge value={cls.progress} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 2. Subject Overview Card */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <div className="mb-4">
              <h2 className="text-sm font-bold text-gray-900">Subject Overview</h2>
              <p className="text-[11px] text-gray-400 mt-0.5">
                Review rate · click to filter
              </p>
            </div>

            <div className="space-y-4">
              {subjectStats.map((sub) => {
                const isSelected = selectedSubject === sub.name
                return (
                  <div
                    key={sub.name}
                    onClick={() => {
                      setSelectedSubject((curr) => (curr === sub.name ? null : sub.name))
                      setPage(1)
                    }}
                    className={`cursor-pointer rounded-xl p-2 -mx-2 transition-colors ${
                      isSelected ? 'bg-gray-50 ring-1 ring-gray-200' : 'hover:bg-gray-50/60'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span className="font-bold text-gray-800">{sub.name}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] text-gray-400">{sub.subs} subs</span>
                        <span
                          className={`font-bold ${
                            sub.name === 'DSA'
                              ? 'text-amber-500'
                              : sub.name === 'OS'
                              ? 'text-purple-600'
                              : 'text-emerald-500'
                          }`}
                        >
                          {sub.rate}%
                        </span>
                      </div>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                      <div
                        className={`${sub.color} h-full rounded-full transition-all duration-300`}
                        style={{ width: `${sub.rate}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>

            <p className="text-[11px] text-gray-400 mt-5 pt-3 border-t border-gray-50">
              Click a subject to filter the whole dashboard.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
