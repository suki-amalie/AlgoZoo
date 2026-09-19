import { useState } from 'react'
import {
  ChevronLeft, X, Send, Settings, Lightbulb, Info, AlertCircle,
  ChevronDown, Link2, ExternalLink,
} from 'lucide-react'
import { TypeBadge } from './Badge'
import { Button } from './Button'

export type ProblemType = 'DSA' | 'OS' | 'Database' | 'Other'
export type Difficulty = 'easy' | 'medium' | 'hard'

export type Resource = {
  id: number
  label: string
  url: string
  filename?: string
}

export type ProblemDraft = {
  title: string
  type: ProblemType
  difficulty: Difficulty | null
  description: string
  resources: Resource[]
}

interface ProblemComposerProps {
  mode: 'create' | 'edit'
  initial?: ProblemDraft
  onSave: (draft: ProblemDraft) => Promise<void>
  onClose: () => void
  saving?: boolean
  error?: string | null
}

let nextResourceId = 2000

const TOPIC_ICONS: Record<ProblemType, string> = {
  DSA: '</>',
  OS: '⚙',
  Database: '🗄',
  Other: '•',
}

export function ProblemComposer({ mode, initial, onSave, onClose, saving = false, error = null }: ProblemComposerProps) {
  const [title, setTitle] = useState(initial?.title ?? '')
  const [titleError, setTitleError] = useState(false)
  const [type, setType] = useState<ProblemType>(initial?.type ?? 'DSA')
  const [difficulty, setDifficulty] = useState<Difficulty | null>(initial?.difficulty ?? null)
  const [description, setDescription] = useState(initial?.description ?? '')
  const [descriptionError, setDescriptionError] = useState(false)
  // Only keep URL-based resources (no file attachments), max one link
  const [resources, setResources] = useState<Resource[]>(
    (initial?.resources ?? []).filter((r) => !r.filename && r.url)
  )
  const [lastSeenError, setLastSeenError] = useState(error)
  const [errorDismissed, setErrorDismissed] = useState(false)
  if (error !== lastSeenError) {
    setLastSeenError(error)
    setErrorDismissed(false)
  }
  const [topicOpen, setTopicOpen] = useState(false)
  const [addLinkOpen, setAddLinkOpen] = useState(false)
  const [linkForm, setLinkForm] = useState({ label: '', url: '' })
  const isEdit = mode === 'edit'

  /* ── resource helpers (one link only) ── */
  const link = resources.find((r) => !r.filename && r.url) ?? null

  const addLink = () => {
    if (!linkForm.url.trim()) return
    setResources([{ id: nextResourceId++, label: linkForm.label, url: linkForm.url.trim() }])
    setLinkForm({ label: '', url: '' })
    setAddLinkOpen(false)
  }

  const removeLink = (id: number) =>
    setResources((prev) => prev.filter((r) => r.id !== id))

  /* ── publish ── */
  const handlePublish = async () => {
    const trimmed = title.trim()
    const missingTitle = !trimmed
    const missingDescription = !description.trim()
    setTitleError(missingTitle)
    setDescriptionError(missingDescription)
    if (missingTitle || missingDescription) return
    await onSave({ title: trimmed, type, difficulty, description, resources })
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#f0f2f5]">
      {/* ── Top bar ── */}
      <div className="bg-white border-b border-gray-200 h-14 px-6 flex items-center justify-between flex-shrink-0 shadow-sm">
        <button
          onClick={onClose}
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 font-medium transition-colors"
        >
          <ChevronLeft size={16} />
          Back to Problem Bank
        </button>
        <div className="flex items-center gap-3">
          <Button variant="secondary" size="sm" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button size="sm" onClick={() => void handlePublish()} disabled={saving}>
            <Send size={13} />
            {saving ? 'Saving...' : isEdit ? 'Save Changes' : 'Publish'}
          </Button>
        </div>
      </div>

      {error && !errorDismissed && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-[60]">
          <div className="bg-white rounded-2xl shadow-xl w-[400px] p-6 space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center flex-shrink-0">
                <AlertCircle size={20} className="text-red-500" />
              </div>
              <div>
                <p className="font-bold text-gray-900">Couldn't save this problem</p>
                <p className="text-sm text-gray-500 mt-1">{error}</p>
              </div>
            </div>
            <button
              onClick={() => setErrorDismissed(true)}
              className="w-full py-2 rounded-xl bg-accent text-white text-sm font-semibold hover:bg-accent-hover transition-colors"
            >
              OK
            </button>
          </div>
        </div>
      )}

      {/* ── Scrollable body ── */}
      <div className="flex-1 overflow-y-auto">
        <div className="px-8 pt-7 pb-3">
          <h1 className="text-2xl font-bold text-gray-900">
            {isEdit ? 'Edit Problem' : 'Create New Problem'}
          </h1>
          <p className="text-sm text-gray-400 mt-1">
            Write a new problem to add to your problem bank.{' '}
            <span className="text-gray-400">You can use rich text and attach a resource link.</span>
          </p>
        </div>

        {/* ── Two-column layout ── */}
        <div className="px-8 pb-10 grid grid-cols-[1fr_308px] gap-5 items-start">
          {/* LEFT: main form card */}
          <div className="bg-white rounded-2xl shadow-sm p-6 space-y-7">
            {/* Title */}
            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-2">
                Title <span className="text-red-500">*</span>
              </label>
              <input
                value={title}
                onChange={(e) => { setTitle(e.target.value); setTitleError(false) }}
                placeholder="e.g. Two Sum, Process vs Thread, Database Normalization..."
                maxLength={200}
                className={`w-full border rounded-xl px-4 py-2.5 text-sm focus:outline-none transition-colors ${
                  titleError
                    ? 'border-red-400 bg-red-50 placeholder:text-red-300 focus:border-red-400'
                    : 'border-gray-200 bg-gray-50 focus:border-accent/60 focus:bg-white'
                }`}
              />
              <div className="flex items-center justify-between mt-1.5">
                {titleError
                  ? <p className="text-xs text-red-500">Title is required.</p>
                  : <span />
                }
                <span className="text-xs text-gray-400 ml-auto">{title.length}/200</span>
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-2">
                Description <span className="text-red-500">*</span>
              </label>
              <div className={`border rounded-xl overflow-hidden transition-colors ${
                descriptionError
                  ? 'border-red-400'
                  : 'border-gray-200 focus-within:border-accent/40'
              }`}>
                <textarea
                  value={description}
                  onChange={(e) => { setDescription(e.target.value); setDescriptionError(false) }}
                  placeholder="Start writing your problem description here..."
                  rows={12}
                  className={`w-full px-4 py-3.5 text-sm text-gray-700 resize-y focus:outline-none leading-relaxed placeholder:text-gray-300 ${
                    descriptionError ? 'bg-red-50 placeholder:text-red-300' : 'bg-white'
                  }`}
                />
              </div>
              {descriptionError && <p className="text-xs text-red-500 mt-1.5">Description is required.</p>}
            </div>

            {/* Resources — one link only */}
            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-1">Resources</label>
              <p className="text-xs text-gray-400 mb-3">
                Attach a link to provide additional material for this problem.
              </p>

              {/* Show "Add link" only when no link exists and form is not open */}
              {!link && !addLinkOpen && (
                <button
                  onClick={() => { setAddLinkOpen(true); setLinkForm({ label: '', url: '' }) }}
                  className="inline-flex items-center gap-1.5 px-4 py-2 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <Link2 size={14} /> Add link
                </button>
              )}

              {/* Inline link form */}
              {addLinkOpen && (
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-2">
                  <input
                    value={linkForm.label}
                    onChange={(e) => setLinkForm({ ...linkForm, label: e.target.value })}
                    placeholder="Label (e.g. LeetCode)"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:border-accent/60"
                    autoFocus
                  />
                  <div className="flex gap-2">
                    <input
                      value={linkForm.url}
                      onChange={(e) => setLinkForm({ ...linkForm, url: e.target.value })}
                      placeholder="https://..."
                      className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:border-accent/60"
                      onKeyDown={(e) => { if (e.key === 'Enter') addLink() }}
                    />
                    <button
                      onClick={addLink}
                      disabled={!linkForm.url.trim()}
                      className="px-4 py-2 bg-accent text-white rounded-lg text-sm font-semibold disabled:opacity-40 hover:bg-accent-hover transition-colors"
                    >
                      Add
                    </button>
                    <button
                      onClick={() => setAddLinkOpen(false)}
                      className="px-3 py-2 text-gray-400 hover:text-gray-700 transition-colors"
                    >
                      <X size={15} />
                    </button>
                  </div>
                </div>
              )}

              {/* Saved link */}
              {link && (
                <div className="flex items-center gap-3 bg-white border border-gray-100 rounded-xl px-4 py-3">
                  <div className="w-8 h-8 rounded-lg bg-gray-50 border border-gray-100 flex items-center justify-center flex-shrink-0">
                    <ExternalLink size={14} className="text-accent" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{link.label || link.url}</p>
                    {link.url && link.label && (
                      <a
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-accent hover:underline truncate block"
                      >
                        {link.url}
                      </a>
                    )}
                  </div>
                  {/* Edit: prefill form and remove current link */}
                  <button
                    onClick={() => {
                      setLinkForm({ label: link.label, url: link.url })
                      removeLink(link.id)
                      setAddLinkOpen(true)
                    }}
                    title="Edit link"
                    className="text-gray-300 hover:text-accent flex-shrink-0 transition-colors mr-1"
                  >
                    <Link2 size={14} />
                  </button>
                  <button
                    onClick={() => removeLink(link.id)}
                    title="Remove link"
                    className="text-gray-300 hover:text-red-400 flex-shrink-0 transition-colors"
                  >
                    <X size={15} />
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* RIGHT: settings card — unchanged */}
          <div className="bg-white rounded-2xl shadow-sm p-5 space-y-5 sticky top-4">
            {/* Header */}
            <div className="flex items-center gap-2.5 pb-1">
              <div className="w-8 h-8 rounded-xl bg-gray-100 flex items-center justify-center">
                <Settings size={15} className="text-gray-500" />
              </div>
              <h3 className="text-sm font-bold text-gray-900">Problem Settings</h3>
            </div>

            <div className="w-full h-px bg-gray-100" />

            {/* Topic */}
            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-2">
                Topic <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <button
                  onClick={() => setTopicOpen((v) => !v)}
                  className="w-full flex items-center gap-2.5 px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-800 hover:border-gray-300 transition-colors"
                >
                  <span className="font-mono text-xs text-gray-500 w-5 text-center flex-shrink-0">
                    {TOPIC_ICONS[type]}
                  </span>
                  <span className="flex-1 text-left">{type}</span>
                  <ChevronDown size={14} className={`text-gray-400 transition-transform ${topicOpen ? 'rotate-180' : ''}`} />
                </button>
                {topicOpen && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setTopicOpen(false)} />
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-20 overflow-hidden">
                      {(['DSA', 'OS', 'Database', 'Other'] as const).map((t) => (
                        <button
                          key={t}
                          onClick={() => { setType(t); setDifficulty(null); setTopicOpen(false) }}
                          className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm transition-colors hover:bg-gray-50 ${
                            type === t ? 'text-accent font-semibold bg-red-50/50' : 'text-gray-700'
                          }`}
                        >
                          <span className="font-mono text-xs text-gray-400 w-5 text-center flex-shrink-0">
                            {TOPIC_ICONS[t]}
                          </span>
                          <span className="flex-1 text-left">{t}</span>
                          <span className="flex items-center"><TypeBadge type={t} /></span>
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Difficulty — DSA only, other topics don't use a difficulty level */}
            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-2">Difficulty</label>
              {type === 'DSA' ? (
                <div className="flex rounded-xl border border-gray-200 overflow-hidden">
                  {(['easy', 'medium', 'hard'] as Difficulty[]).map((d, i) => (
                    <button
                      key={d}
                      onClick={() => setDifficulty(d)}
                      className={`flex-1 py-2 text-xs font-semibold capitalize transition-colors ${
                        i > 0 ? 'border-l border-gray-200' : ''
                      } ${
                        difficulty === d
                          ? d === 'easy'
                            ? 'bg-green-50 text-green-700 border-green-200'
                            : d === 'medium'
                            ? 'bg-yellow-50 text-yellow-700 border-yellow-200'
                            : 'bg-red-50 text-red-700 border-red-200'
                          : 'text-gray-500 hover:bg-gray-50'
                      }`}
                    >
                      {d.charAt(0).toUpperCase() + d.slice(1)}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="bg-gray-50 border border-gray-100 rounded-xl px-3.5 py-2.5 flex items-start gap-2">
                  <Info size={13} className="text-gray-400 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-gray-500 leading-relaxed">
                    {type} problems don't use a difficulty level — this only applies to DSA.
                  </p>
                </div>
              )}
            </div>

            {/* Tip card */}
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex gap-3">
              <Lightbulb size={16} className="text-blue-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold text-blue-700 mb-1">Tip</p>
                <p className="text-xs text-blue-600 leading-relaxed">
                  Choose the right topic and difficulty level to help students find your problem easily.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

