import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Plus, X, ChevronLeft, Pencil, Trash2, ExternalLink, Paperclip, Loader2 } from 'lucide-react'
import { TypeBadge, Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Toast } from '../../components/ui/Toast'
import { ProblemComposer } from '../../components/problem/ProblemComposer'
import type { ProblemType, Difficulty, ProblemDraft, Problem } from '../../types/problem'
import { useProblems } from '../../hooks/useProblems'
import { getProblemDetail, createProblem, updateProblem, deleteProblem } from '../../services/problemService'

const difficultyVariant: Record<Difficulty, string> = {
  easy: 'easy',
  medium: 'medium',
  hard: 'hard',
}

type Modal =
  | { mode: 'create' }
  | { mode: 'edit'; target: Problem }
  | { mode: 'delete'; target: Problem }

export function TrainerProblems() {
  const navigate = useNavigate()
  const { problems, setProblems, loading, error, refetch } = useProblems()
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<'all' | ProblemType>('all')
  const [detail, setDetail] = useState<Problem | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [modal, setModal] = useState<Modal | null>(null)
  const [saving, setSaving] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  const filtered = problems.filter((p) => {
    const q = search.toLowerCase()
    return p.title.toLowerCase().includes(q) && (typeFilter === 'all' || p.type === typeFilter)
  })

  const openDetail = async (p: Problem) => {
    setDetail(p)
    setDetailLoading(true)
    try {
      setDetail(await getProblemDetail(p.id))
    } catch {
      // keep the list-shape data if the detail fetch fails
    } finally {
      setDetailLoading(false)
    }
  }

  const openCreate = () => { setActionError(null); setModal({ mode: 'create' }) }
  const openEdit = async (p: Problem) => {
    setDetail(null)
    setActionError(null)
    const full = p.description || p.resources.length ? p : await getProblemDetail(p.id).catch(() => p)
    setModal({ mode: 'edit', target: full })
  }
  const openDelete = (p: Problem) => { setDetail(null); setActionError(null); setModal({ mode: 'delete', target: p }) }
  const closeModal = () => { setModal(null); setActionError(null) }

  const handleSave = async (draft: ProblemDraft) => {
    if (!modal) return
    setSaving(true)
    setActionError(null)
    try {
      if (modal.mode === 'create') {
        const created = await createProblem(draft)
        setProblems((prev) => [created, ...prev])
        setToast('Problem created successfully')
      } else if (modal.mode === 'edit') {
        const id = modal.target.id
        const updated = await updateProblem(id, draft)
        setProblems((prev) => prev.map((p) => (p.id === id ? updated : p)))
        setDetail((prev) => (prev?.id === id ? updated : prev))
        setToast('Changes saved successfully')
      }
      closeModal()
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Could not save this problem')
      throw err
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (modal?.mode !== 'delete') return
    setSaving(true)
    setActionError(null)
    try {
      await deleteProblem(modal.target.id)
      setProblems((prev) => prev.filter((p) => p.id !== modal.target.id))
      setToast('Problem deleted successfully')
      closeModal()
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Could not delete this problem')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-7">
        <div>
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-accent font-medium transition-colors mb-2"
          >
            <ChevronLeft size={15} /> Back
          </button>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1">Problem Bank</p>
          <h1 className="text-2xl font-bold text-gray-900">Problems</h1>
          <p className="text-sm text-gray-400 mt-0.5">{loading ? 'Loading…' : `${problems.length} problems`}</p>
        </div>
        <Button onClick={openCreate}>
          <Plus size={15} /> Create New Problem
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-5">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search problems..."
            className="pl-8 pr-3 py-2 border border-gray-200 rounded-xl bg-white text-sm focus:outline-none focus:border-accent/50 w-56"
          />
        </div>
        <div className="flex bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
          {(['all', 'DSA', 'OS', 'Database', 'Other'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={`px-3 py-2 text-xs font-semibold transition-colors ${
                typeFilter === t ? 'bg-accent text-white' : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              {t === 'all' ? 'All' : t}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="flex items-center justify-between gap-3 bg-red-50 border border-red-100 rounded-xl px-4 py-3 mb-5 text-sm text-red-600">
          <span>{error}</span>
          <button onClick={() => void refetch()} className="font-semibold hover:underline flex-shrink-0">Retry</button>
        </div>
      )}

      {/* Problem list */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="grid grid-cols-[48px_1fr_120px_90px_88px] border-b border-gray-100 px-6 py-3">
          {['#', 'TITLE', 'TYPE', 'DIFFICULTY', ''].map((h, i) => (
            <span key={i} className="text-[10px] font-bold text-gray-400 tracking-widest">{h}</span>
          ))}
        </div>
        <div className="overflow-y-auto" style={{ maxHeight: '440px' }}>
          {loading ? (
            <div className="py-12 flex items-center justify-center text-sm text-gray-400 gap-2">
              <Loader2 size={16} className="animate-spin" /> Loading problems...
            </div>
          ) : (
            <>
              {filtered.map((p, i) => (
                <div
                  key={p.id}
                  className={`group grid grid-cols-[48px_1fr_120px_90px_88px] items-center px-6 py-4 hover:bg-gray-50 transition-colors ${
                    i < filtered.length - 1 ? 'border-b border-gray-50' : ''
                  }`}
                >
                  <span className="text-sm text-gray-400 cursor-pointer" onClick={() => void openDetail(p)}>{i + 1}</span>
                  <span
                    className="text-sm font-semibold text-gray-900 cursor-pointer hover:text-accent transition-colors"
                    onClick={() => void openDetail(p)}
                  >
                    {p.title}
                  </span>
                  <div className="cursor-pointer" onClick={() => void openDetail(p)}>
                    <TypeBadge type={p.type} />
                  </div>
                  <div className="flex items-center cursor-pointer" onClick={() => void openDetail(p)}>
                    {p.type === 'DSA' && p.difficulty ? (
                      <Badge variant={difficultyVariant[p.difficulty]}>
                        {p.difficulty.charAt(0).toUpperCase() + p.difficulty.slice(1)}
                      </Badge>
                    ) : (
                      <span className="text-xs text-gray-300">—</span>
                    )}
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity justify-end">
                    <button
                      onClick={(e) => { e.stopPropagation(); void openEdit(p) }}
                      title="Edit"
                      className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-accent hover:bg-accent/10 transition-colors"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); openDelete(p) }}
                      title="Delete"
                      className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
              {filtered.length === 0 && (
                <div className="py-12 text-center text-sm text-gray-400">No problems found</div>
              )}
            </>
          )}
        </div>
      </div>

      {/* ── Detail drawer ── */}
      {detail && (
        <div className="fixed inset-0 bg-black/30 flex justify-end z-40" onClick={() => setDetail(null)}>
          <div className="w-[520px] bg-white h-full shadow-2xl flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
              <h3 className="font-bold text-gray-900">Problem Details</h3>
              <button onClick={() => setDetail(null)} className="text-gray-400 hover:text-gray-700"><X size={18} /></button>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
              <div className="flex items-center gap-2 flex-wrap">
                <TypeBadge type={detail.type} />
                {detail.type === 'DSA' && detail.difficulty && (
                  <Badge variant={difficultyVariant[detail.difficulty]}>
                    {detail.difficulty.charAt(0).toUpperCase() + detail.difficulty.slice(1)}
                  </Badge>
                )}
              </div>
              <h2 className="text-xl font-bold text-gray-900">{detail.title}</h2>
              {detailLoading && (
                <p className="text-xs text-gray-400 flex items-center gap-1.5"><Loader2 size={12} className="animate-spin" /> Loading details...</p>
              )}
              {detail.description && (
                <div>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Description</p>
                  <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">
                    {detail.description}
                  </p>
                </div>
              )}
              {detail.resources.length > 0 && (
                <div>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Resources</p>
                  <div className="space-y-1.5">
                    {detail.resources.map((r) => (
                      r.filename ? (
                        <div key={r.id} className="flex items-center gap-2 text-sm text-gray-600">
                          <Paperclip size={13} className="text-gray-400 flex-shrink-0" />
                          {r.filename}
                        </div>
                      ) : (
                        <a
                          key={r.id}
                          href={r.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 text-sm text-accent font-medium hover:underline"
                        >
                          <ExternalLink size={13} className="flex-shrink-0" />
                          {r.label || r.url}
                        </a>
                      )
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2 px-6 py-4 border-t border-gray-100 flex-shrink-0">
              <Button onClick={() => void openEdit(detail)} size="sm"><Pencil size={13} /> Edit</Button>
              <Button variant="danger" onClick={() => openDelete(detail)} size="sm"><Trash2 size={13} /> Delete</Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete confirmation ── */}
      {modal?.mode === 'delete' && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl w-[400px] p-6">
            <div className="flex items-start gap-4 mb-5">
              <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center flex-shrink-0">
                <Trash2 size={18} className="text-red-500" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900">Delete problem?</h3>
                <p className="text-sm text-gray-500 mt-1">
                  <span className="font-semibold text-gray-800">"{modal.target.title}"</span> will be permanently removed from the problem bank.
                </p>
              </div>
            </div>
            {actionError && <p className="text-xs text-red-500 mb-3">{actionError}</p>}
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={closeModal} disabled={saving}>Cancel</Button>
              <Button variant="danger" onClick={() => void handleDelete()} disabled={saving}>
                {saving ? 'Deleting...' : 'Delete'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Create / Edit composer (full-screen) ── */}
      {(modal?.mode === 'create' || modal?.mode === 'edit') && (
        <ProblemComposer
          mode={modal.mode}
          initial={
            modal.mode === 'edit'
              ? {
                  title: modal.target.title,
                  type: modal.target.type,
                  difficulty: modal.target.difficulty,
                  description: modal.target.description,
                  resources: modal.target.resources,
                }
              : undefined
          }
          onSave={handleSave}
          onClose={closeModal}
          saving={saving}
          error={actionError}
        />
      )}

      {toast && <Toast message={toast} onClose={() => setToast(null)} />}
    </div>
  )
}
