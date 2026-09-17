import { useState, useEffect } from 'react'
import { useParams, Link, useSearchParams } from 'react-router-dom'
import {
  ArrowLeft, ChevronDown, Link2, UserMinus, Check, Plus, X,
  Copy, Clock
} from 'lucide-react'
import {
  getAdminClassById,
  updateAdminClass,
  getClassStudents,
  removeStudentFromClass,
  getClassTrainers,
  removeTrainerFromClass,
  type AdminClass,
  type AdminClassStatus,
  type ClassStudent,
  type ClassTrainer,
} from '../../utils/adminStore'

type TabType = 'general' | 'students' | 'trainers'

export function AdminManageClass() {
  const { classId } = useParams<{ classId: string }>()
  const [searchParams, setSearchParams] = useSearchParams()

  const initialTab = (searchParams.get('tab') as TabType) || 'general'
  const [activeTab, setActiveTab] = useState<TabType>(
    initialTab === 'students' || initialTab === 'trainers' ? initialTab : 'general'
  )

  const [cls, setCls] = useState<AdminClass | null>(null)
  const [students, setStudents] = useState<ClassStudent[]>([])
  const [trainers, setTrainers] = useState<ClassTrainer[]>([])

  // General tab form state
  const [nameInput, setNameInput] = useState('')
  const [descriptionInput, setDescriptionInput] = useState('')
  const [statusInput, setStatusInput] = useState<AdminClassStatus>('Active')
  const [saveToast, setSaveToast] = useState(false)

  // Registration banners
  const [showStudentLinkBanner, setShowStudentLinkBanner] = useState(false)
  const [copiedStudentLink, setCopiedStudentLink] = useState(false)

  const [showTrainerLinkBanner, setShowTrainerLinkBanner] = useState(false)
  const [copiedTrainerLink, setCopiedTrainerLink] = useState(false)

  // Remove Student modal states
  const [studentToRemove, setStudentToRemove] = useState<ClassStudent | null>(null)
  const [studentRemovedSuccess, setStudentRemovedSuccess] = useState<{ name: string; className: string } | null>(null)

  // Remove Trainer modal states
  const [trainerToRemove, setTrainerToRemove] = useState<ClassTrainer | null>(null)
  const [trainerRemovedSuccess, setTrainerRemovedSuccess] = useState<{ name: string; className: string } | null>(null)

  const loadData = () => {
    if (!classId) return
    const currentClass = getAdminClassById(classId)
    if (currentClass) {
      setCls(currentClass)
      setNameInput(currentClass.name)
      setDescriptionInput(currentClass.description)
      setStatusInput(currentClass.status)
      setStudents(getClassStudents(currentClass.id))
      setTrainers(getClassTrainers(currentClass.id))
    }
  }

  useEffect(() => {
    loadData()
    const handleStoreUpdate = () => loadData()
    window.addEventListener('algozoo_admin_store_updated', handleStoreUpdate)
    return () => window.removeEventListener('algozoo_admin_store_updated', handleStoreUpdate)
  }, [classId])

  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab)
    if (tab === 'general') {
      searchParams.delete('tab')
      setSearchParams(searchParams)
    } else {
      setSearchParams({ tab })
    }
  }

  const handleSaveGeneral = (e: React.FormEvent) => {
    e.preventDefault()
    if (!cls || !nameInput.trim()) return

    updateAdminClass(cls.id, {
      name: nameInput.trim(),
      description: descriptionInput.trim(),
      status: statusInput,
    })
    setSaveToast(true)
    setTimeout(() => setSaveToast(false), 3000)
  }

  // Copy link handlers
  const studentJoinUrl = `https://algozoo.com/join/student/8f3k2mxp9qlz`
  const handleCopyStudentLink = () => {
    navigator.clipboard?.writeText(studentJoinUrl)
    setCopiedStudentLink(true)
    setTimeout(() => setCopiedStudentLink(false), 2500)
  }

  const trainerJoinUrl = `https://algozoo.com/join/trainer/tr7n4vw1yabs`
  const handleCopyTrainerLink = () => {
    navigator.clipboard?.writeText(trainerJoinUrl)
    setCopiedTrainerLink(true)
    setTimeout(() => setCopiedTrainerLink(false), 2500)
  }

  // Remove student confirmation
  const handleConfirmRemoveStudent = () => {
    if (!cls || !studentToRemove) return
    const removedInfo = { name: studentToRemove.name, className: cls.name }
    removeStudentFromClass(cls.id, studentToRemove.id)
    setStudentToRemove(null)
    setStudentRemovedSuccess(removedInfo)
    setStudents(getClassStudents(cls.id))
  }

  // Remove trainer confirmation
  const handleConfirmRemoveTrainer = () => {
    if (!cls || !trainerToRemove) return
    const removedInfo = { name: trainerToRemove.name, className: cls.name }
    removeTrainerFromClass(cls.id, trainerToRemove.id)
    setTrainerToRemove(null)
    setTrainerRemovedSuccess(removedInfo)
    setTrainers(getClassTrainers(cls.id))
  }

  if (!cls) {
    return (
      <div className="bg-white rounded-2xl p-12 text-center border border-gray-100 shadow-sm max-w-2xl mx-auto">
        <p className="text-gray-500 font-medium mb-3">Class not found.</p>
        <Link to="/admin/classes" className="text-sm text-accent font-semibold hover:underline">
          ← Back to Classes
        </Link>
      </div>
    )
  }

  const isActive = cls.status === 'Active'

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-10">
      {/* ── Breadcrumb Navigation ── */}
      <div>
        <div className="flex items-center gap-1.5 text-xs sm:text-sm text-gray-500 mb-2">
          <Link
            to="/admin/classes"
            className="flex items-center gap-1 text-gray-500 hover:text-gray-900 font-medium transition-colors"
          >
            <ArrowLeft size={14} />
            Classes
          </Link>
          <span className="text-gray-400">/</span>
          <span className="text-gray-800 font-medium">Manage Class</span>
        </div>

        {/* ── Title & Status Badge ── */}
        <div className="flex items-center gap-3">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">{cls.name}</h1>
          <span
            className={`text-xs px-2.5 py-0.5 rounded-full font-medium inline-flex items-center gap-1.5 ${
              isActive
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
                : 'bg-gray-100 text-gray-600 border border-gray-200/60'
            }`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-emerald-500' : 'bg-gray-400'}`} />
            {cls.status}
          </span>
        </div>
      </div>

      {/* ── Navigation Tabs ── */}
      <div className="border-b border-gray-200 flex items-center gap-8">
        <button
          onClick={() => handleTabChange('general')}
          className={`text-sm font-medium pb-3 border-b-2 transition-all relative ${
            activeTab === 'general'
              ? 'text-accent border-accent font-semibold'
              : 'text-gray-500 hover:text-gray-800 border-transparent'
          }`}
        >
          General Information
        </button>
        <button
          onClick={() => handleTabChange('students')}
          className={`text-sm font-medium pb-3 border-b-2 transition-all relative ${
            activeTab === 'students'
              ? 'text-accent border-accent font-semibold'
              : 'text-gray-500 hover:text-gray-800 border-transparent'
          }`}
        >
          Students
        </button>
        <button
          onClick={() => handleTabChange('trainers')}
          className={`text-sm font-medium pb-3 border-b-2 transition-all relative ${
            activeTab === 'trainers'
              ? 'text-accent border-accent font-semibold'
              : 'text-gray-500 hover:text-gray-800 border-transparent'
          }`}
        >
          Trainers
        </button>
      </div>

      {/* ── TAB 1: General Information ── */}
      {activeTab === 'general' && (
        <div className="bg-white rounded-2xl p-6 sm:p-8 border border-gray-100 shadow-sm max-w-xl">
          <form onSubmit={handleSaveGeneral} className="space-y-5">
            <div>
              <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-2">
                CLASS NAME
              </label>
              <input
                type="text"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent bg-white shadow-2xs transition-all"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-2">
                DESCRIPTION
              </label>
              <input
                type="text"
                value={descriptionInput}
                onChange={(e) => setDescriptionInput(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent bg-white shadow-2xs transition-all"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-2">
                STATUS
              </label>
              <div className="relative">
                <select
                  value={statusInput}
                  onChange={(e) => setStatusInput(e.target.value as AdminClassStatus)}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent bg-white shadow-2xs appearance-none cursor-pointer transition-all"
                >
                  <option value="Active">Active</option>
                  <option value="Unactive">Unactive</option>
                  <option value="Archived">Archived</option>
                </select>
                <ChevronDown
                  size={16}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                />
              </div>
            </div>

            <div className="pt-2 flex items-center gap-3">
              <button
                type="submit"
                className="px-6 py-2.5 rounded-xl bg-accent hover:bg-accent-hover text-white text-sm font-semibold shadow-sm transition-all active:scale-[0.98]"
              >
                Save Changes
              </button>

              {saveToast && (
                <div className="flex items-center gap-1.5 text-xs text-emerald-600 font-medium animate-in fade-in duration-200">
                  <Check size={16} strokeWidth={2.5} />
                  <span>Changes saved successfully!</span>
                </div>
              )}
            </div>
          </form>
        </div>
      )}

      {/* ── TAB 2: Students ── */}
      {activeTab === 'students' && (
        <div className="space-y-4">
          {/* Subheader: count + action button */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-baseline gap-2">
              <h2 className="text-xl font-bold text-gray-900">Students</h2>
              <span className="text-sm text-gray-400 font-normal">
                {students.length} student{students.length !== 1 ? 's' : ''}
              </span>
            </div>

            <button
              onClick={() => setShowStudentLinkBanner((prev) => !prev)}
              className="px-4 py-2 rounded-xl border border-gray-200 bg-white text-xs sm:text-sm font-medium text-gray-700 hover:bg-gray-50 flex items-center gap-2 shadow-2xs transition-colors self-start sm:self-auto"
            >
              <Link2 size={15} className="text-gray-500" />
              <span>Get Student Join Link</span>
            </button>
          </div>

          {/* Student Registration Link Banner (Figma media_1789609930864.png) */}
          {showStudentLinkBanner && (
            <div className="bg-blue-50/60 border border-blue-200/60 rounded-2xl p-5 relative animate-in fade-in duration-200">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-blue-900">Student Registration Link</h4>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCopyStudentLink}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition-colors"
                  >
                    {copiedStudentLink ? (
                      <>
                        <Check size={14} />
                        <span>Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy size={14} />
                        <span>Copy Link</span>
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => setShowStudentLinkBanner(false)}
                    className="text-gray-400 hover:text-gray-600 p-1 rounded-lg transition-colors"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>
              <p className="text-sm font-mono text-blue-600 font-medium my-2 select-all">
                {studentJoinUrl}
              </p>
              <p className="text-xs text-gray-500">
                Share this link with students in the WeCamp Zalo group.
              </p>
            </div>
          )}

          {/* Students Table */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            {students.length === 0 ? (
              <div className="p-12 text-center text-gray-400 text-sm">
                No students currently in this class.
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/50">
                    <th className="py-3.5 px-6 text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                      NAME
                    </th>
                    <th className="py-3.5 px-6 text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                      USERNAME
                    </th>
                    <th className="py-3.5 px-6 text-[11px] font-bold text-gray-400 uppercase tracking-wider text-right sm:text-left">
                      ACTION
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {students.map((st) => (
                    <tr key={st.id} className="hover:bg-gray-50/60 transition-colors">
                      <td className="py-4 px-6 text-sm font-medium text-gray-900">
                        {st.name}
                      </td>
                      <td className="py-4 px-6 text-sm text-gray-500">
                        {st.username}
                      </td>
                      <td className="py-4 px-6 text-right sm:text-left">
                        <button
                          onClick={() => setStudentToRemove(st)}
                          className="inline-flex items-center gap-1.5 text-sm font-medium text-red-600 hover:text-red-700 transition-colors"
                        >
                          <UserMinus size={15} />
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* ── TAB 3: Trainers ── */}
      {activeTab === 'trainers' && (
        <div className="space-y-4">
          {/* Subheader: count + Invite Trainer button (Figma media_1789609930814.png) */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-baseline gap-2">
              <h2 className="text-xl font-bold text-gray-900">Trainers</h2>
              <span className="text-sm text-gray-400 font-normal">
                {trainers.length} trainer{trainers.length !== 1 ? 's' : ''}
              </span>
            </div>

            <button
              onClick={() => setShowTrainerLinkBanner((prev) => !prev)}
              className="px-4 py-2 bg-accent hover:bg-accent-hover text-white rounded-xl text-sm font-semibold flex items-center gap-1.5 shadow-sm transition-all active:scale-[0.98] self-start sm:self-auto"
            >
              <Plus size={16} strokeWidth={2.5} />
              <span>Invite Trainer</span>
            </button>
          </div>

          {/* Trainer Invitation Link Banner (Figma media_1789609930960.png) */}
          {showTrainerLinkBanner && (
            <div className="bg-purple-50/70 border border-purple-100 rounded-2xl p-5 relative animate-in fade-in duration-200">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-purple-900">Trainer Invitation Link</h4>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCopyTrainerLink}
                    className="bg-purple-600 hover:bg-purple-700 text-white px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition-colors"
                  >
                    {copiedTrainerLink ? (
                      <>
                        <Check size={14} />
                        <span>Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy size={14} />
                        <span>Copy Link</span>
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => setShowTrainerLinkBanner(false)}
                    className="text-gray-400 hover:text-gray-600 p-1 rounded-lg transition-colors"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>
              <p className="text-sm font-mono text-purple-700 font-medium my-2 select-all">
                {trainerJoinUrl}
              </p>
              <p className="text-xs text-gray-500">
                Send this link directly to the trainer. Valid for 2 days.
              </p>
            </div>
          )}

          {/* Trainers Table */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            {trainers.length === 0 ? (
              <div className="p-12 text-center text-gray-400 text-sm">
                No trainers assigned to this class yet.
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/50">
                    <th className="py-3.5 px-6 text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                      NAME
                    </th>
                    <th className="py-3.5 px-6 text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                      USERNAME
                    </th>
                    <th className="py-3.5 px-6 text-[11px] font-bold text-gray-400 uppercase tracking-wider text-right sm:text-left">
                      ACTION
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {trainers.map((tr) => (
                    <tr key={tr.id} className="hover:bg-gray-50/60 transition-colors">
                      <td className="py-4 px-6 text-sm font-medium text-gray-900">
                        {tr.name}
                      </td>
                      <td className="py-4 px-6 text-sm text-gray-500">
                        {tr.username}
                      </td>
                      <td className="py-4 px-6 text-right sm:text-left">
                        <button
                          onClick={() => setTrainerToRemove(tr)}
                          className="inline-flex items-center gap-1.5 text-sm font-medium text-red-600 hover:text-red-700 transition-colors"
                        >
                          <UserMinus size={15} />
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* ── Remove Student Confirmation Modal (Figma media_1789609930773.png) ── */}
      {studentToRemove && (
        <div className="fixed inset-0 z-50 bg-black/45 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg p-6 sm:p-7 shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
            <button
              onClick={() => setStudentToRemove(null)}
              className="absolute right-5 top-5 text-gray-400 hover:text-gray-600 p-1 rounded-lg transition-colors"
            >
              <X size={18} />
            </button>

            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-full bg-red-50 text-red-500 border border-red-100 flex items-center justify-center flex-shrink-0">
                <UserMinus size={22} />
              </div>
              <div className="pt-0.5">
                <h3 className="text-base sm:text-lg font-bold text-gray-900">
                  Remove Student from Class
                </h3>
                <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
                  Are you sure you want to remove this student from the class?
                </p>
              </div>
            </div>

            <div className="bg-blue-50/50 border border-blue-100/80 rounded-xl p-4 text-xs text-gray-600 leading-relaxed mt-5">
              You are about to remove <strong>{studentToRemove.name} ({studentToRemove.username})</strong> from <strong>{cls.name}</strong>. They will lose access to class materials, assignments, and discussions. This action can be undone by re-inviting the student.
            </div>

            <div className="flex items-center justify-end gap-3 pt-6">
              <button
                type="button"
                onClick={() => setStudentToRemove(null)}
                className="px-5 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmRemoveStudent}
                className="px-5 py-2.5 rounded-xl bg-accent hover:bg-accent-hover text-white text-sm font-semibold shadow-sm transition-all active:scale-[0.98]"
              >
                Yes, Remove
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Student Removed Successfully Modal (Figma media_1789609930925.png) ── */}
      {studentRemovedSuccess && (
        <div className="fixed inset-0 z-50 bg-black/45 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 sm:p-7 shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
            <button
              onClick={() => setStudentRemovedSuccess(null)}
              className="absolute right-5 top-5 text-gray-400 hover:text-gray-600 p-1 rounded-lg transition-colors"
            >
              <X size={18} />
            </button>

            <div className="flex flex-col items-center text-center pt-2">
              <div className="w-14 h-14 rounded-full bg-emerald-50 text-emerald-500 border border-emerald-200 flex items-center justify-center mb-3">
                <Check size={28} strokeWidth={2.5} />
              </div>

              <h3 className="text-lg font-bold text-gray-900">
                Student Removed Successfully
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                <strong>{studentRemovedSuccess.name}</strong> has been removed from <strong>{studentRemovedSuccess.className}</strong>.
              </p>
            </div>

            <div className="bg-amber-50/70 border border-amber-200/80 rounded-xl p-3.5 text-xs text-amber-900 flex items-start gap-2.5 mt-5 text-left">
              <Clock size={16} className="text-amber-600 flex-shrink-0 mt-0.5" />
              <p>
                The student will no longer have access to class materials, assignments, and discussions. You can invite them back at any time using the join link.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setStudentRemovedSuccess(null)}
              className="w-full py-2.5 rounded-xl bg-accent hover:bg-accent-hover text-white text-sm font-semibold shadow-sm mt-5 transition-all active:scale-[0.98]"
            >
              Done
            </button>
          </div>
        </div>
      )}

      {/* ── Remove Trainer Confirmation Modal ── */}
      {trainerToRemove && (
        <div className="fixed inset-0 z-50 bg-black/45 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg p-6 sm:p-7 shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
            <button
              onClick={() => setTrainerToRemove(null)}
              className="absolute right-5 top-5 text-gray-400 hover:text-gray-600 p-1 rounded-lg transition-colors"
            >
              <X size={18} />
            </button>

            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-full bg-red-50 text-red-500 border border-red-100 flex items-center justify-center flex-shrink-0">
                <UserMinus size={22} />
              </div>
              <div className="pt-0.5">
                <h3 className="text-base sm:text-lg font-bold text-gray-900">
                  Remove Trainer from Class
                </h3>
                <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
                  Are you sure you want to remove this trainer from the class?
                </p>
              </div>
            </div>

            <div className="bg-blue-50/50 border border-blue-100/80 rounded-xl p-4 text-xs text-gray-600 leading-relaxed mt-5">
              You are about to remove <strong>{trainerToRemove.name}</strong> from <strong>{cls.name}</strong>. They will lose access to class materials, assignments, and discussions. This action can be undone by re-inviting the trainer.
            </div>

            <div className="flex items-center justify-end gap-3 pt-6">
              <button
                type="button"
                onClick={() => setTrainerToRemove(null)}
                className="px-5 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmRemoveTrainer}
                className="px-5 py-2.5 rounded-xl bg-accent hover:bg-accent-hover text-white text-sm font-semibold shadow-sm transition-all active:scale-[0.98]"
              >
                Yes, Remove
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Trainer Removed Successfully Modal ── */}
      {trainerRemovedSuccess && (
        <div className="fixed inset-0 z-50 bg-black/45 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 sm:p-7 shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
            <button
              onClick={() => setTrainerRemovedSuccess(null)}
              className="absolute right-5 top-5 text-gray-400 hover:text-gray-600 p-1 rounded-lg transition-colors"
            >
              <X size={18} />
            </button>

            <div className="flex flex-col items-center text-center pt-2">
              <div className="w-14 h-14 rounded-full bg-emerald-50 text-emerald-500 border border-emerald-200 flex items-center justify-center mb-3">
                <Check size={28} strokeWidth={2.5} />
              </div>

              <h3 className="text-lg font-bold text-gray-900">
                Trainer Removed Successfully
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                <strong>{trainerRemovedSuccess.name}</strong> has been removed from <strong>{trainerRemovedSuccess.className}</strong>.
              </p>
            </div>

            <div className="bg-amber-50/70 border border-amber-200/80 rounded-xl p-3.5 text-xs text-amber-900 flex items-start gap-2.5 mt-5 text-left">
              <Clock size={16} className="text-amber-600 flex-shrink-0 mt-0.5" />
              <p>
                The trainer will no longer have access to class materials, assignments, and discussions. You can invite them back at any time using the join link.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setTrainerRemovedSuccess(null)}
              className="w-full py-2.5 rounded-xl bg-accent hover:bg-accent-hover text-white text-sm font-semibold shadow-sm mt-5 transition-all active:scale-[0.98]"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
