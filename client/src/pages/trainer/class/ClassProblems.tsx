import { useCallback, useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Plus, Search, X, Check, ChevronRight, ChevronDown, Trash2, Loader2 } from 'lucide-react'
import { ClassTabNav } from '../../../components/layout/ClassTabNav'
import { TypeBadge } from '../../../components/ui/Badge'
import { Button } from '../../../components/ui/Button'
import { ProgressBar } from '../../../components/ui/ProgressBar'
import { useProblems } from '../../../hooks/useProblems'
import { useClassDetail } from '../../../hooks/useClassDetail'
import { getProblemDetail, mapProblemType } from '../../../services/problemService'
import {
  getClassProblems,
  assignProblemToClass,
  removeClassProblem,
  type ClassProblem,
} from '../../../services/classroomService'
import type { ProblemType, Problem } from '../../../types/problem'

const typeOrder: ProblemType[] = ['DSA', 'OS', 'Database', 'Other']

// Same problem bank shown on the Problem Bank page — Assign Problems should never show a different list.
type BankProblem = Problem

type Selected = { problem: BankProblem; deadline: string; deadlineTime: string }

function formatDeadline(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

export function ClassProblems() {
  const { classId = '' } = useParams()
  const { classDetail } = useClassDetail(classId)
  const className = classDetail?.className ?? '...'
  const { problems: problemBank, loading: bankLoading } = useProblems()

  // Assigned problems list state
  const [problems, setProblems] = useState<ClassProblem[]>([])
  const [problemsLoading, setProblemsLoading] = useState(true)
  const [problemsError, setProblemsError] = useState<string | null>(null)
  const [removeTarget, setRemoveTarget] = useState<ClassProblem | null>(null)
  const [removing, setRemoving] = useState(false)
  const [removeError, setRemoveError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})

  const loadProblems = useCallback(() => {
    if (!classId) return
    setProblemsLoading(true)
    setProblemsError(null)
    getClassProblems(classId)
      .then(setProblems)
      .catch((err) => setProblemsError(err instanceof Error ? err.message : 'Failed to load assigned problems'))
      .finally(() => setProblemsLoading(false))
  }, [classId])

  useEffect(() => { loadProblems() }, [loadProblems])

  // Assign modal state
  const [showModal, setShowModal] = useState(false)
  const [bankSearch, setBankSearch] = useState('')
  const [selected, setSelected] = useState<Selected[]>([])
  const [assigned, setAssigned] = useState(false)
  const [assigning, setAssigning] = useState(false)
  const [assignError, setAssignError] = useState<string | null>(null)
  const [preview, setPreview] = useState<BankProblem | null>(null)
  const [previewLoading, setPreviewLoading] = useState(false)

  const handlePreview = async (p: BankProblem) => {
    setPreview(p)
    setPreviewLoading(true)
    try {
      setPreview(await getProblemDetail(p.id))
    } catch {
      // keep the list-shape data if the detail fetch fails
    } finally {
      setPreviewLoading(false)
    }
  }

  const tabs = [
    { label: 'Overview', to: `/trainer/classes/${classId}/overview` },
    { label: 'Problems', to: `/trainer/classes/${classId}/problems` },
    { label: 'Submissions', to: `/trainer/classes/${classId}/submissions` },
    { label: 'Students', to: `/trainer/classes/${classId}/students` },
  ]

  // Filter & group assigned problems
  const filtered = problems.filter((p) =>
    (p.title ?? '').toLowerCase().includes(search.toLowerCase())
  )
  const isSearching = search.trim() !== ''

  const grouped = typeOrder.reduce<Record<string, ClassProblem[]>>((acc, type) => {
    const items = filtered.filter((p) => mapProblemType(p.problemType) === type)
    if (items.length > 0) acc[type] = items
    return acc
  }, {})

  const toggleGroup = (type: string) => {
    if (isSearching) return
    setCollapsed((prev) => ({ ...prev, [type]: !prev[type] }))
  }

  // Modal helpers
  const filteredBank = problemBank.filter((p) =>
    p.title.toLowerCase().includes(bankSearch.toLowerCase())
  )

  const toggleProblem = (p: BankProblem) => {
    setSelected((prev) =>
      prev.find((s) => s.problem.id === p.id)
        ? prev.filter((s) => s.problem.id !== p.id)
        : [...prev, { problem: p, deadline: '', deadlineTime: '' }]
    )
  }

  const setDeadline = (id: string, deadline: string) => {
    setSelected((prev) => prev.map((s) => s.problem.id === id ? { ...s, deadline } : s))
  }

  const setDeadlineTime = (id: string, deadlineTime: string) => {
    setSelected((prev) => prev.map((s) => s.problem.id === id ? { ...s, deadlineTime } : s))
  }

  const handleAssign = async () => {
    setAssigning(true)
    setAssignError(null)
    try {
      for (const { problem, deadline, deadlineTime } of selected) {
        const deadlineIso = deadline ? new Date(`${deadline}T${deadlineTime || '23:59'}`).toISOString() : null
        await assignProblemToClass(classId, problem.id, deadlineIso)
      }
      setAssigned(true)
      loadProblems()
    } catch (err) {
      setAssignError(err instanceof Error ? err.message : 'Could not assign these problems')
    } finally {
      setAssigning(false)
    }
  }

  const handleRemove = async () => {
    if (!removeTarget?.problem_id) return
    setRemoving(true)
    setRemoveError(null)
    try {
      await removeClassProblem(classId, removeTarget.problem_id)
      setProblems((prev) => prev.filter((p) => p.problem_id !== removeTarget.problem_id))
      setRemoveTarget(null)
    } catch (err) {
      setRemoveError(err instanceof Error ? err.message : 'Could not remove this problem')
    } finally {
      setRemoving(false)
    }
  }

  const closeModal = () => {
    setShowModal(false)
    setSelected([])
    setAssigned(false)
    setAssignError(null)
    setBankSearch('')
    setPreview(null)
  }

  return (
    <div>
      <ClassTabNav
        crumbs={[
          { label: 'My Classes', to: '/trainer/classes' },
          { label: className, to: `/trainer/classes/${classId}/overview` },
          { label: 'Problems' },
        ]}
        title={className}
        tabs={tabs}
      />

      {/* Header row */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Assigned Problems</h2>
          <p className="text-sm text-gray-400">{problems.length} problems assigned</p>
        </div>
        <Button onClick={() => setShowModal(true)}>
          <Plus size={15} /> Assign Problems
        </Button>
      </div>

      {/* Search bar */}
      <div className="mb-4">
        <div className="relative max-w-xs">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search problems..."
            className="w-full pl-8 pr-4 py-2 border border-gray-200 rounded-xl bg-white text-sm focus:outline-none focus:border-accent/50"
          />
        </div>
      </div>

      {problemsError && (
        <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 mb-4 text-sm text-red-600">{problemsError}</div>
      )}

      {/* Grouped problem list */}
      {problemsLoading ? (
        <div className="bg-white rounded-2xl shadow-sm py-16 flex items-center justify-center text-sm text-gray-400 gap-2">
          <Loader2 size={16} className="animate-spin" /> Loading assigned problems...
        </div>
      ) : Object.keys(grouped).length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm py-12 text-center text-sm text-gray-400">
          No problems found
        </div>
      ) : (
        <div className="space-y-3">
          {typeOrder.filter((type) => grouped[type]).map((type) => {
            const items = grouped[type]
            const isOpen = isSearching ? true : !collapsed[type]
            const totalSubmitted = items.reduce((sum, p) => sum + p.submitted_count, 0)
            const totalExpected = items.reduce((sum, p) => sum + p.total_students, 0)
            const groupPct = totalExpected > 0 ? Math.round((totalSubmitted / totalExpected) * 100) : 0

            return (
              <div key={type} className="bg-white rounded-2xl shadow-sm overflow-hidden">
                {/* Group header */}
                <button
                  onClick={() => toggleGroup(type)}
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
                  <div className="flex items-center gap-4">
                    <span className="text-xs text-gray-400">
                      {totalSubmitted} / {totalExpected} submitted · {groupPct}%
                    </span>
                    <Link
                      to={`/trainer/classes/${classId}/submissions?topic=${encodeURIComponent(type)}`}
                      onClick={(e) => e.stopPropagation()}
                      className="text-xs text-accent font-semibold hover:underline flex items-center gap-0.5"
                    >
                      View Submissions <ChevronRight size={12} />
                    </Link>
                  </div>
                </button>

                {/* Problem rows */}
                {isOpen && (
                  <div className="border-t border-gray-100">
                    <div className="grid grid-cols-[1fr_110px_200px_140px_36px] px-5 py-2 bg-gray-50/60 border-b border-gray-100">
                      {['PROBLEM', 'DEADLINE', 'SUBMISSION PROGRESS', 'ACTION', ''].map((h) => (
                        <span key={h} className="text-[10px] font-bold text-gray-400 tracking-widest">{h}</span>
                      ))}
                    </div>
                    {items.map((p, i) => {
                      const pct = p.total_students > 0 ? Math.round((p.submitted_count / p.total_students) * 100) : 0
                      return (
                        <div
                          key={p.class_problem_id}
                          className={`group grid grid-cols-[1fr_110px_200px_140px_36px] items-center px-5 py-3.5 hover:bg-gray-50 transition-colors ${
                            i < items.length - 1 ? 'border-b border-gray-50' : ''
                          }`}
                        >
                          <Link
                            to={`/trainer/classes/${classId}/submissions?problem=${encodeURIComponent(p.title ?? '')}`}
                            className="text-sm font-medium text-gray-900 hover:text-accent transition-colors"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {p.title}
                          </Link>
                          <span className="text-sm text-gray-500">{formatDeadline(p.deadline)}</span>
                          <div className="pr-4">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs text-gray-400">{p.submitted_count}/{p.total_students}</span>
                              <span className="text-xs font-medium text-gray-600">{pct}%</span>
                            </div>
                            <ProgressBar value={pct} />
                          </div>
                          <Link
                            to={`/trainer/classes/${classId}/submissions?problem=${encodeURIComponent(p.title ?? '')}`}
                            className="text-xs text-accent font-semibold hover:underline flex items-center gap-0.5"
                          >
                            View Submissions <ChevronRight size={12} />
                          </Link>
                          <button
                            onClick={(e) => { e.stopPropagation(); setRemoveError(null); setRemoveTarget(p) }}
                            className="flex items-center justify-center w-7 h-7 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Remove Problem Confirmation Modal */}
      {removeTarget && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
            <div className="p-6 space-y-4">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center flex-shrink-0">
                  <Trash2 size={18} className="text-red-500" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 text-base">Remove from class?</h3>
                  <p className="text-sm text-gray-500 mt-1">
                    <span className="font-medium text-gray-800">"{removeTarget.title}"</span> will be removed from {className}. The problem will remain in the Problem Bank.
                  </p>
                </div>
              </div>
              {removeError && (
                <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2">{removeError}</p>
              )}
              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => { setRemoveTarget(null); setRemoveError(null) }}
                  disabled={removing}
                  className="flex-1 py-2 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={() => void handleRemove()}
                  disabled={removing}
                  className="flex-1 py-2 rounded-xl bg-red-500 text-white text-sm font-semibold hover:bg-red-600 transition-colors disabled:opacity-50"
                >
                  {removing ? 'Removing...' : 'Remove'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Assign Problems Modal — 3 panels */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="font-bold text-gray-900">Assign Problems to {className}</h3>
              <button onClick={closeModal}><X size={18} className="text-gray-400 hover:text-gray-700" /></button>
            </div>

            {assigned ? (
              <div className="p-10 flex flex-col items-center gap-3 text-center">
                <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center">
                  <Check size={24} className="text-green-600" />
                </div>
                <p className="font-bold text-gray-900 text-lg">Problems assigned!</p>
                <p className="text-sm text-gray-400">{selected.length} problem{selected.length !== 1 ? 's' : ''} added to {className}</p>
                <Button onClick={closeModal} className="mt-2 px-8 justify-center">Done</Button>
              </div>
            ) : (
              <div className="flex divide-x divide-gray-100" style={{ height: '480px' }}>

                {/* LEFT: Problem Bank list */}
                <div className="w-56 flex flex-col flex-shrink-0 min-h-0">
                  <div className="p-3 border-b border-gray-100 flex-shrink-0">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Problem Bank</p>
                    <div className="relative">
                      <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        value={bankSearch}
                        onChange={(e) => setBankSearch(e.target.value)}
                        placeholder="Search..."
                        className="w-full pl-7 pr-2 py-1.5 border border-gray-200 rounded-lg bg-gray-50 text-xs focus:outline-none focus:border-accent/50"
                      />
                    </div>
                  </div>
                  <div className="flex-1 min-h-0 overflow-y-auto py-1">
                    {bankLoading && (
                      <p className="text-xs text-gray-400 text-center py-8">Loading problem bank...</p>
                    )}
                    {!bankLoading && filteredBank.map((p) => {
                      const isSelected = selected.some((s) => s.problem.id === p.id)
                      const isPreviewed = preview?.id === p.id
                      return (
                        <button
                          key={p.id}
                          onClick={() => void handlePreview(p)}
                          className={`w-full text-left flex items-center gap-2 px-3 py-2.5 transition-colors ${
                            isPreviewed
                              ? 'bg-accent/8 border-l-2 border-accent'
                              : 'hover:bg-gray-50 border-l-2 border-transparent'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleProblem(p)}
                            className="accent-red-600 flex-shrink-0"
                          />
                          <div className="flex-1 min-w-0">
                            <p className={`text-xs font-medium truncate ${isPreviewed ? 'text-accent' : 'text-gray-800'}`}>{p.title}</p>
                          </div>
                        </button>
                      )
                    })}
                    {!bankLoading && filteredBank.length === 0 && (
                      <p className="text-xs text-gray-400 text-center py-8">No problems found</p>
                    )}
                  </div>
                </div>

                {/* MIDDLE: Problem detail preview */}
                <div className="flex-1 flex flex-col overflow-hidden">
                  {preview ? (
                    <>
                      <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/60">
                        <div className="flex items-center gap-2 mb-1">
                          <TypeBadge type={preview.type} />
                        </div>
                        <h4 className="font-bold text-gray-900 text-base">{preview.title}</h4>
                      </div>
                      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
                        {previewLoading && (
                          <p className="text-xs text-gray-400">Loading details...</p>
                        )}
                        <div>
                          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Description</p>
                          <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">{preview.description}</p>
                        </div>
                        {preview.resource_url && (
                          <div>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Resource</p>
                            <a
                              href={preview.resource_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm text-accent hover:underline break-all"
                            >
                              {preview.resource_url}
                            </a>
                          </div>
                        )}
                      </div>
                      <div className="px-6 py-3 border-t border-gray-100">
                        <button
                          onClick={() => toggleProblem(preview)}
                          className={`w-full py-2 rounded-xl text-sm font-semibold transition-colors ${
                            selected.some((s) => s.problem.id === preview.id)
                              ? 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                              : 'bg-accent text-white hover:bg-accent/90'
                          }`}
                        >
                          {selected.some((s) => s.problem.id === preview.id) ? 'Remove from selection' : '+ Add to selection'}
                        </button>
                      </div>
                    </>
                  ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-center px-6">
                      <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-3">
                        <Search size={20} className="text-gray-300" />
                      </div>
                      <p className="text-sm font-medium text-gray-500">Select a problem to preview</p>
                      <p className="text-xs text-gray-400 mt-1">Click any problem on the left to see its details</p>
                    </div>
                  )}
                </div>

                {/* RIGHT: Selected problems */}
                <div className="w-64 flex flex-col flex-shrink-0">
                  <div className="px-4 py-3 border-b border-gray-100">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                      Selected ({selected.length})
                    </p>
                  </div>
                  <div className="flex-1 overflow-y-auto p-3 space-y-2">
                    {selected.length === 0 && (
                      <p className="text-xs text-gray-400 text-center py-8">No problems selected yet</p>
                    )}
                    {selected.map(({ problem, deadline, deadlineTime }) => (
                      <div key={problem.id} className="bg-gray-50 rounded-xl p-3 space-y-2">
                        <div className="flex items-start justify-between gap-1">
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-gray-900 truncate">{problem.title}</p>
                            <div className="mt-0.5 flex items-center">
                              <TypeBadge type={problem.type} />
                            </div>
                          </div>
                          <button onClick={() => toggleProblem(problem)} className="text-gray-300 hover:text-red-400 flex-shrink-0 mt-0.5">
                            <X size={13} />
                          </button>
                        </div>
                        <div>
                          <label className="text-[10px] text-gray-400 mb-1 block">Deadline (optional)</label>
                          <div className="flex gap-1.5">
                            <input
                              type="date"
                              value={deadline}
                              onChange={(e) => setDeadline(problem.id, e.target.value)}
                              className="w-1/2 min-w-0 border border-gray-200 rounded-lg px-2 py-1 text-xs bg-white focus:outline-none focus:border-accent/60"
                            />
                            <input
                              type="time"
                              value={deadlineTime}
                              onChange={(e) => setDeadlineTime(problem.id, e.target.value)}
                              className="w-1/2 min-w-0 border border-gray-200 rounded-lg px-2 py-1 text-xs bg-white focus:outline-none focus:border-accent/60"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="p-3 border-t border-gray-100 space-y-2">
                    {assignError && <p className="text-xs text-red-500">{assignError}</p>}
                    <Button
                      onClick={() => void handleAssign()}
                      disabled={selected.length === 0 || assigning}
                      className="w-full justify-center"
                    >
                      {assigning ? 'Assigning...' : 'Assign to Class'}
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}