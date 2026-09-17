import { useState, useEffect, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Search, Plus, Trash2,
  Calendar, Users, Check, X, AlertTriangle
} from 'lucide-react'
import {
  getAllAdminClasses,
  createAdminClass,
  deleteAdminClass,
  type AdminClass,
} from '../../utils/adminStore'

export function AdminClasses() {
  const navigate = useNavigate()
  const [classes, setClasses] = useState<AdminClass[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  
  // Modal states
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [createStep, setCreateStep] = useState<'form' | 'success'>('form')
  const [classNameInput, setClassNameInput] = useState('')
  const [descriptionInput, setDescriptionInput] = useState('')
  const [createdClassName, setCreatedClassName] = useState('')
  const [errorMsg, setErrorMsg] = useState('')

  // Delete modal state
  const [deleteTarget, setDeleteTarget] = useState<AdminClass | null>(null)

  const reloadClasses = () => {
    setClasses(getAllAdminClasses())
  }

  useEffect(() => {
    reloadClasses()
    const handleStoreUpdate = () => reloadClasses()
    window.addEventListener('algozoo_admin_store_updated', handleStoreUpdate)
    return () => window.removeEventListener('algozoo_admin_store_updated', handleStoreUpdate)
  }, [])

  const filteredClasses = useMemo(() => {
    const q = searchQuery.toLowerCase().trim()
    if (!q) return classes
    return classes.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.description.toLowerCase().includes(q) ||
        c.trainer.toLowerCase().includes(q)
    )
  }, [classes, searchQuery])

  const handleOpenCreate = () => {
    setClassNameInput('')
    setDescriptionInput('')
    setErrorMsg('')
    setCreateStep('form')
    setIsCreateOpen(true)
  }

  const handleCloseCreate = () => {
    setIsCreateOpen(false)
    setCreateStep('form')
    setClassNameInput('')
    setDescriptionInput('')
    setErrorMsg('')
  }

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!classNameInput.trim()) {
      setErrorMsg('Class name is required')
      return
    }

    const created = createAdminClass({
      name: classNameInput.trim(),
      description: descriptionInput.trim(),
    })
    setCreatedClassName(created.name)
    setCreateStep('success')
  }

  const handleDeleteConfirm = () => {
    if (!deleteTarget) return
    deleteAdminClass(deleteTarget.id)
    setDeleteTarget(null)
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="text-[11px] font-bold tracking-widest text-gray-400 uppercase">ADMIN</p>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Classes</h1>
        </div>

        <button
          onClick={handleOpenCreate}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-accent hover:bg-accent-hover text-white rounded-xl text-sm font-semibold transition-all shadow-sm active:scale-[0.98] self-start sm:self-auto"
        >
          <Plus size={18} strokeWidth={2.5} />
          Create Class
        </button>
      </div>

      {/* ── Search Input ── */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search classes..."
          className="w-full pl-9 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all shadow-2xs"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-0.5"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {/* ── Classes Grid ── */}
      {filteredClasses.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-gray-100 shadow-sm">
          <p className="text-gray-500 font-medium">No classes match your search query.</p>
          <button
            onClick={() => setSearchQuery('')}
            className="mt-3 text-sm text-accent font-semibold hover:underline"
          >
            Clear search
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredClasses.map((cls) => {
            const isActive = cls.status === 'Active'

            return (
              <div
                key={cls.id}
                onClick={() => navigate(`/admin/classes/${cls.id}/manage`)}
                className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-all flex flex-col justify-between cursor-pointer group"
              >
                <div>
                  {/* Top Bar: Icon + Title + Status + Delete Icon */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      {/* Red square badge */}
                      <span className="w-2.5 h-2.5 rounded-[2px] bg-accent flex-shrink-0" />
                      <span className="font-bold text-gray-900 text-lg group-hover:text-accent transition-colors truncate">
                        {cls.name}
                      </span>
                      <span
                        className={`text-xs px-2.5 py-0.5 rounded-full font-medium flex-shrink-0 ${
                          isActive
                            ? 'bg-emerald-50 text-emerald-600 border border-emerald-200/60'
                            : 'bg-gray-100 text-gray-500 border border-gray-200/60'
                        }`}
                      >
                        {cls.status}
                      </span>
                    </div>

                    {/* Action button (Delete only) */}
                    <div className="flex items-center gap-1 flex-shrink-0 text-gray-400">
                      <button
                        title="Delete Class"
                        onClick={(e) => {
                          e.stopPropagation()
                          setDeleteTarget(cls)
                        }}
                        className="p-1.5 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>

                  {/* Date Range */}
                  {cls.dateRange && (
                    <div className="flex items-center gap-1.5 text-xs text-gray-400 mt-2">
                      <Calendar size={13} />
                      <span>{cls.dateRange}</span>
                    </div>
                  )}

                  {/* Metadata: Students, Problems, Trainer */}
                  <div className="flex flex-wrap items-center gap-y-1.5 gap-x-4 text-xs text-gray-600 mt-3">
                    <div className="flex items-center gap-1.5 font-medium text-gray-700">
                      <Users size={14} className="text-gray-400" />
                      <span>{cls.studentsCount} students</span>
                    </div>
                    <span className="text-gray-300">•</span>
                    <span className="font-medium text-gray-700">{cls.problemsCount} problems</span>
                    <span className="text-gray-300">•</span>
                    <span className="text-gray-500">
                      Trainer:{' '}
                      <strong className="font-medium text-gray-700">{cls.trainer}</strong>
                    </span>
                  </div>
                </div>

                {/* Bottom: Progress Bar */}
                <div className="mt-5 pt-2">
                  <div className="flex items-center justify-between text-xs text-gray-500 mb-1.5">
                    <span>Progress</span>
                    <span className="font-semibold text-gray-700">{cls.progress}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-accent rounded-full transition-all duration-300"
                      style={{ width: `${Math.min(100, Math.max(0, cls.progress))}%` }}
                    />
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ── Create New Class Modal ── */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 bg-black/45 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg p-6 sm:p-7 shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900">Create New Class</h2>
              <button
                onClick={handleCloseCreate}
                className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Step 1: Input Form */}
            {createStep === 'form' && (
              <form onSubmit={handleCreateSubmit} className="mt-5 space-y-4">
                <div>
                  <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                    CLASS NAME <span className="text-accent">*</span>
                  </label>
                  <input
                    type="text"
                    value={classNameInput}
                    onChange={(e) => {
                      setClassNameInput(e.target.value)
                      if (errorMsg) setErrorMsg('')
                    }}
                    placeholder="e.g. WeCamp Batch 16"
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all"
                    autoFocus
                  />
                  {errorMsg && <p className="text-xs text-accent mt-1">{errorMsg}</p>}
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                    DESCRIPTION
                  </label>
                  <input
                    type="text"
                    value={descriptionInput}
                    onChange={(e) => setDescriptionInput(e.target.value)}
                    placeholder="e.g. A software engineering class for WeCamp Batch 16 students"
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-4">
                  <button
                    type="button"
                    onClick={handleCloseCreate}
                    className="px-5 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 rounded-xl bg-accent hover:bg-accent-hover text-white text-sm font-semibold shadow-sm transition-all active:scale-[0.98]"
                  >
                    Create Class
                  </button>
                </div>
              </form>
            )}

            {/* Step 2: Success Modal */}
            {createStep === 'success' && (
              <div className="py-8 flex flex-col items-center text-center">
                <div className="w-14 h-14 rounded-full border-2 border-emerald-500 flex items-center justify-center text-emerald-500 mb-4 animate-in zoom-in-75 duration-300">
                  <Check size={32} strokeWidth={2.5} />
                </div>
                <h3 className="text-xl font-bold text-gray-900">Class created!</h3>
                <p className="text-sm text-gray-500 mt-1">{createdClassName}</p>

                <button
                  onClick={handleCloseCreate}
                  className="mt-6 px-8 py-2.5 rounded-xl bg-accent hover:bg-accent-hover text-white text-sm font-semibold transition-all shadow-sm active:scale-[0.98]"
                >
                  Done
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Delete Confirmation Modal ── */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 bg-black/45 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3 text-red-600 mb-3">
              <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center flex-shrink-0">
                <AlertTriangle size={20} />
              </div>
              <h3 className="text-lg font-bold text-gray-900">Delete Class</h3>
            </div>
            <p className="text-sm text-gray-600 mb-6">
              Are you sure you want to delete <strong>{deleteTarget.name}</strong>? This action cannot be undone.
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirm}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-semibold shadow-sm"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
