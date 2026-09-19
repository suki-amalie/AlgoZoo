import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  AlignLeft, CheckCircle2, ChevronLeft, ChevronRight, Clock,
  Code2, Download, ExternalLink, FileText, ImageIcon, Loader2,
  MessageSquare, Paperclip, Plus, Send, Trash2,
} from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { Badge, TypeBadge, StatusDot } from '../../components/ui/Badge'
import { useAuth } from '../../hooks/useAuth'
import { studentService } from '../../services/studentService'
import { uploadFile, getFileUrl } from '../../services/fileService'
import type { StudentProblemDetail } from '../../types/classProblem'
import type { SubmissionContentBlock } from '../../types/submission'

// ── Draft block types ───────────────────────────────────────────────
type TextBlockDraft = { id: string; type: 'text'; content: string }
type CodeBlockDraft = { id: string; type: 'code'; content: string; language: string }
type FileBlockDraft = { id: string; type: 'image' | 'file'; file: File; previewUrl: string; filename: string }
type BlockDraft = TextBlockDraft | CodeBlockDraft | FileBlockDraft

const LANGUAGES = ['Python', 'JavaScript', 'Java', 'C++', 'TypeScript']
const IMAGE_EXTS = ['.jpg', '.jpeg', '.png', '.gif', '.webp']
let _blockId = 0
const genId = () => String(_blockId++)

// ── Blob URL hook (for submitted attachment preview) ─────────────────
function useFileBlob(src: string | undefined): string | undefined {
  const [blobUrl, setBlobUrl] = useState<string | undefined>()
  useEffect(() => {
    if (!src) return
    let active = true
    let created: string | undefined
    fetch(src, { credentials: 'include' })
      .then(r => r.ok ? r.blob() : Promise.reject())
      .then(b => {
        if (!active) return
        created = URL.createObjectURL(b)
        setBlobUrl(created)
      })
      .catch(() => {})
    return () => {
      active = false
      if (created) URL.revokeObjectURL(created)
    }
  }, [src])
  return blobUrl
}

// ── Attachment preview (read-only, for submitted blocks) ─────────────
function AttachmentPreview({ block }: { block: SubmissionContentBlock }) {
  const rawSrc = block.file_id ? getFileUrl(block.file_id) : undefined
  const lower = block.filename?.toLowerCase() ?? ''
  const showImg = block.type === 'image' || IMAGE_EXTS.some(ext => lower.endsWith(ext))
  const blobUrl = useFileBlob(showImg ? rawSrc : undefined)
  const label = block.filename || 'Uploaded file'
  return (
    <div className="border-b border-gray-50 last:border-b-0">
      <div className="flex items-center gap-2 px-5 py-3 bg-gray-50 border-b border-gray-100">
        {showImg ? <ImageIcon size={13} className="text-gray-400" /> : <Paperclip size={13} className="text-gray-400" />}
        <span className="text-xs text-gray-500 flex-1 truncate">{label}</span>
        {blobUrl && (
          <a href={blobUrl} download={label} className="inline-flex items-center gap-1 text-xs text-accent hover:underline flex-shrink-0">
            <Download size={12} /> Download
          </a>
        )}
      </div>
      {showImg && blobUrl && (
        <div className="px-5 py-4 flex justify-center">
          <img src={blobUrl} alt={label} className="max-w-full max-h-96 rounded-lg" />
        </div>
      )}
    </div>
  )
}

// ── Text block editor ────────────────────────────────────────────────
function TextEditor({ block, onChange, onDelete }: {
  block: TextBlockDraft; onChange: (v: string) => void; onDelete: () => void
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-100">
        <div className="flex items-center gap-1.5">
          <AlignLeft size={13} className="text-gray-400" />
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Text</span>
        </div>
        <button onClick={onDelete} className="text-gray-300 hover:text-red-400 transition-colors">
          <Trash2 size={14} />
        </button>
      </div>
      <textarea
        value={block.content}
        onChange={e => onChange(e.target.value)}
        placeholder="Write your explanation, approach, or notes..."
        rows={4}
        className="w-full px-4 py-3 text-sm text-gray-700 resize-y focus:outline-none"
      />
    </div>
  )
}

// ── Code block editor ────────────────────────────────────────────────
function CodeEditor({ block, onChange, onLangChange, onDelete }: {
  block: CodeBlockDraft; onChange: (v: string) => void; onLangChange: (v: string) => void; onDelete: () => void
}) {
  return (
    <div className="rounded-xl overflow-hidden bg-[#1e1e2e]">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/10">
        <div className="flex items-center gap-1.5">
          <Code2 size={13} className="text-gray-400" />
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Code</span>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={block.language}
            onChange={e => onLangChange(e.target.value)}
            className="bg-white/10 text-gray-300 text-xs rounded-lg px-2 py-1 border border-white/20 focus:outline-none cursor-pointer"
          >
            {LANGUAGES.map(l => <option key={l} value={l}>{l}</option>)}
          </select>
          <button onClick={onDelete} className="text-gray-500 hover:text-red-400 transition-colors">
            <Trash2 size={14} />
          </button>
        </div>
      </div>
      <textarea
        value={block.content}
        onChange={e => onChange(e.target.value)}
        rows={12}
        placeholder={`Paste your ${block.language} code here...`}
        className="w-full px-4 py-4 text-sm text-gray-100 font-mono resize-y focus:outline-none bg-transparent"
      />
    </div>
  )
}

// ── File/Image block editor ──────────────────────────────────────────
function FileEditor({ block, onDelete }: { block: FileBlockDraft; onDelete: () => void }) {
  const isImage = block.type === 'image'
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-100">
        <div className="flex items-center gap-1.5 min-w-0">
          {isImage ? <ImageIcon size={13} className="text-gray-400 flex-shrink-0" /> : <Paperclip size={13} className="text-gray-400 flex-shrink-0" />}
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider flex-shrink-0">
            {isImage ? 'Image' : 'File'}
          </span>
          <span className="text-xs text-gray-500 ml-1 truncate">{block.filename}</span>
        </div>
        <button onClick={onDelete} className="text-gray-300 hover:text-red-400 transition-colors flex-shrink-0 ml-2">
          <Trash2 size={14} />
        </button>
      </div>
      {isImage ? (
        <div className="px-4 py-3 flex justify-center">
          <img src={block.previewUrl} alt={block.filename} className="max-w-full max-h-64 rounded-lg object-contain" />
        </div>
      ) : (
        <div className="px-4 py-3 flex items-center gap-2 text-sm text-gray-500">
          <Paperclip size={14} className="text-gray-400" /> {block.filename}
        </div>
      )}
    </div>
  )
}

// ── Block type picker ────────────────────────────────────────────────
function BlockPicker({ onAddText, onAddCode, onAddFile }: {
  onAddText: () => void; onAddCode: () => void; onAddFile: () => void
}) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <button
        onClick={onAddText}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-xs font-medium text-gray-600 hover:border-accent/50 hover:text-accent transition-colors shadow-sm"
      >
        <AlignLeft size={13} /> Text
      </button>
      <button
        onClick={onAddCode}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-xs font-medium text-gray-600 hover:border-accent/50 hover:text-accent transition-colors shadow-sm"
      >
        <Code2 size={13} /> Code
      </button>
      <button
        onClick={onAddFile}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-xs font-medium text-gray-600 hover:border-accent/50 hover:text-accent transition-colors shadow-sm"
      >
        <Paperclip size={13} /> Image / File
      </button>
    </div>
  )
}

// ── Main page ────────────────────────────────────────────────────────
export function ProblemWorkspace() {
  const { classId = '', problemId = '' } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()

  const [detail, setDetail] = useState<StudentProblemDetail | null>(null)
  const [className, setClassName] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Draft blocks for the solution editor
  const [blocks, setBlocks] = useState<BlockDraft[]>([])
  const [showBlockPicker, setShowBlockPicker] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const blocksRef = useRef<BlockDraft[]>([])
  blocksRef.current = blocks

  // Revoke all file preview URLs on unmount
  useEffect(() => {
    return () => {
      for (const b of blocksRef.current) {
        if (b.type === 'image' || b.type === 'file') {
          URL.revokeObjectURL((b as FileBlockDraft).previewUrl)
        }
      }
    }
  }, [])

  useEffect(() => {
    studentService.getProblem(problemId)
      .then(res => setDetail(res.data))
      .catch(err => setError(err instanceof Error ? err.message : 'Unable to load problem'))
      .finally(() => setLoading(false))

    studentService.getClasses()
      .then(res => {
        const current = res.data.find(c => c.classId === classId)
        if (current) setClassName(current.name)
      })
      .catch(() => {})
  }, [problemId, classId])

  // Block management
  const addTextBlock = () => {
    setBlocks(prev => [...prev, { id: genId(), type: 'text', content: '' }])
    setShowBlockPicker(false)
  }
  const addCodeBlock = () => {
    setBlocks(prev => [...prev, { id: genId(), type: 'code', content: '', language: 'Python' }])
    setShowBlockPicker(false)
  }
  const triggerFileInput = () => {
    fileInputRef.current?.click()
    setShowBlockPicker(false)
  }
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const isImage = file.type.startsWith('image/')
    setBlocks(prev => [...prev, {
      id: genId(),
      type: isImage ? 'image' : 'file',
      file,
      previewUrl: URL.createObjectURL(file),
      filename: file.name,
    }])
    if (fileInputRef.current) fileInputRef.current.value = ''
  }
  const updateBlock = (id: string, updates: Partial<BlockDraft>) => {
    setBlocks(prev => prev.map(b => b.id === id ? { ...b, ...updates } as BlockDraft : b))
  }
  const removeBlock = (id: string) => {
    setBlocks(prev => {
      const b = prev.find(x => x.id === id)
      if (b && (b.type === 'image' || b.type === 'file')) {
        URL.revokeObjectURL((b as FileBlockDraft).previewUrl)
      }
      return prev.filter(x => x.id !== id)
    })
  }

  const submit = async () => {
    if (submitting || !detail) return
    const hasContent = blocks.some(b =>
      b.type === 'text' ? b.content.trim() !== '' :
      b.type === 'code' ? b.content.trim() !== '' : true
    )
    if (blocks.length === 0 || !hasContent) {
      setError('Please add at least one content block.')
      return
    }
    const rawType = detail.problem?.problemType as string ?? ''
    const pType = rawType === 'DB' ? 'Database' : rawType === 'OTHER' ? 'Other' : rawType
    if (pType === 'DSA') {
      const hasCode = blocks.some(b => b.type === 'code' && b.content.trim())
      const hasFile = blocks.some(b => b.type === 'image' || b.type === 'file')
      if (!hasCode || !hasFile) {
        setError('DSA submissions require a code block and a screenshot or solution file.')
        return
      }
    }
    setSubmitting(true)
    setError('')
    try {
      const contentBlocks: Array<{ type: 'code' | 'text' | 'image' | 'file'; content?: string; language?: string; file_id?: string; filename?: string }> = []
      for (const b of blocks) {
        if (b.type === 'text') {
          contentBlocks.push({ type: 'text', content: b.content })
        } else if (b.type === 'code') {
          contentBlocks.push({ type: 'code', content: b.content, language: b.language })
        } else {
          const uploaded = await uploadFile(b.file)
          contentBlocks.push({ type: b.type, file_id: uploaded.data.file_id, filename: uploaded.data.filename })
        }
      }
      await studentService.createSubmission({ class_problem_id: problemId, content_blocks: contentBlocks })
      navigate(`/student/classes/${classId}/problems`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to submit solution')
    } finally {
      setSubmitting(false)
    }
  }

  // ── Loading / error / empty states ───────────────────────────────
  if (loading) {
    return (
      <div className="py-16 flex justify-center gap-2 text-sm text-gray-400">
        <Loader2 size={16} className="animate-spin" /> Loading problem...
      </div>
    )
  }
  if (error && !detail) {
    return <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
  }
  if (!detail || !detail.problem) {
    return <p className="text-sm text-gray-500">Problem not found.</p>
  }

  const problem = detail.problem
  const rawType = problem.problemType as string
  const problemType = rawType === 'DB' ? 'Database' : rawType === 'OTHER' ? 'Other' : rawType
  const submitted = Boolean(detail.submission)
  const submission = detail.submission

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr)
    return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
  }
  const formatDateTime = (dateStr: string) => {
    const d = new Date(dateStr)
    return (
      d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) +
      ' at ' +
      d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
    )
  }
  const formatShortDate = (dateStr: string | null) =>
    dateStr ? new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : ''

  const statusKey = !detail.status ? 'not-started' :
    detail.status === 'Pending' ? 'pending' :
    detail.status === 'Late' ? 'late' :
    detail.status === 'Reviewed' ? 'reviewed' : 'not-started'

  const statusLabel = !detail.status ? 'Not started' :
    detail.status === 'Pending' ? 'Pending review' : detail.status

  const canSubmit = !submitting && blocks.some(b =>
    b.type === 'text' ? b.content.trim() !== '' :
    b.type === 'code' ? b.content.trim() !== '' : true
  )

  return (
    <div>
      {/* Breadcrumb */}
      <div className="flex items-center gap-3 mb-3 flex-wrap">
        <Link
          to={`/student/classes/${classId}/problems`}
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-accent font-medium transition-colors"
        >
          <ChevronLeft size={15} /> Back to Problems
        </Link>
        <span className="text-gray-200 text-sm">|</span>
        <div className="flex items-center gap-1.5 text-sm text-gray-400 flex-wrap">
          <Link to="/student/classes" className="hover:text-accent transition-colors">My Classes</Link>
          {className && (
            <>
              <ChevronRight size={13} className="text-gray-300 flex-shrink-0" />
              <span className="text-gray-700 font-medium">{className}</span>
            </>
          )}
          <ChevronRight size={13} className="text-gray-300 flex-shrink-0" />
          <Link to={`/student/classes/${classId}/problems`} className="hover:text-accent transition-colors">Problems</Link>
          <ChevronRight size={13} className="text-gray-300 flex-shrink-0" />
          <span className="text-gray-700 font-medium">{problem.title}</span>
        </div>
      </div>

      {/* Page title */}
      <h1 className="text-2xl font-bold text-gray-900 mb-6">{problem.title}</h1>

      {/* Hidden file input */}
      <input ref={fileInputRef} type="file" accept=".png,.jpg,.jpeg,.gif,.webp,.pdf" onChange={handleFileChange} className="hidden" />

      {/* Main 2-column layout */}
      <div className="flex flex-col lg:grid lg:grid-cols-[1fr_300px] gap-5">

        {/* ── Left column ─────────────────────────────────────────── */}
        <div className="space-y-4">

          {/* Problem card */}
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <div className="flex items-center gap-2 mb-4">
              <FileText size={13} className="text-gray-400 flex-shrink-0" />
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Problem</span>
              <span className="text-sm font-semibold text-gray-700">{problem.title}</span>
            </div>
            <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">
              {problem.description || 'No description available.'}
            </p>
            {problem.problemUrl && (
              <a
                href={problem.problemUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 mt-5 text-sm text-accent hover:underline"
              >
                View resource <ExternalLink size={13} />
              </a>
            )}
          </div>

          {/* My Solution */}
          {submitted && submission ? (
            /* Read-only submitted view */
            <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
              <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100">
                <div className="w-7 h-7 rounded-full bg-accent flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                  {user?.initials || 'ME'}
                </div>
                <span className="font-semibold text-gray-900">My Solution</span>
                <span className="ml-auto inline-flex items-center gap-1 text-xs text-green-600 bg-green-50 px-2.5 py-1 rounded-full font-medium">
                  <CheckCircle2 size={11} /> Submitted
                </span>
              </div>
              {submission.contentBlocks.map((block, i) => (
                <div key={i}>
                  {block.type === 'text' && (
                    <div className="px-5 py-4 border-b border-gray-50 last:border-b-0">
                      <div className="flex items-center gap-1.5 mb-3">
                        <FileText size={13} className="text-gray-400" />
                        <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Text</span>
                      </div>
                      <p className="text-sm text-gray-700 whitespace-pre-line leading-relaxed">{block.content}</p>
                    </div>
                  )}
                  {block.type === 'code' && (
                    <div className="mx-4 my-4 rounded-xl overflow-hidden bg-[#1e1e2e]">
                      <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/10">
                        <div className="flex items-center gap-1.5">
                          <Code2 size={13} className="text-gray-400" />
                          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Code</span>
                        </div>
                        {block.language && <span className="text-xs text-gray-400">{block.language}</span>}
                      </div>
                      <pre className="px-4 py-4 text-sm text-gray-100 overflow-x-auto font-mono leading-relaxed">{block.content}</pre>
                    </div>
                  )}
                  {(block.type === 'image' || block.type === 'file') && (
                    <AttachmentPreview block={block} />
                  )}
                </div>
              ))}
            </div>
          ) : (
            /* Multi-block solution editor */
            <div>
              <div className="flex items-center gap-2.5 mb-3">
                <div className="w-7 h-7 rounded-full bg-accent flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                  {user?.initials || 'ME'}
                </div>
                <span className="font-semibold text-gray-900">My Solution</span>
              </div>

              <div className="space-y-3">
                {/* Existing blocks */}
                {blocks.map(block => (
                  <div key={block.id}>
                    {block.type === 'text' && (
                      <TextEditor
                        block={block}
                        onChange={v => updateBlock(block.id, { content: v })}
                        onDelete={() => removeBlock(block.id)}
                      />
                    )}
                    {block.type === 'code' && (
                      <CodeEditor
                        block={block}
                        onChange={v => updateBlock(block.id, { content: v })}
                        onLangChange={v => updateBlock(block.id, { language: v })}
                        onDelete={() => removeBlock(block.id)}
                      />
                    )}
                    {(block.type === 'image' || block.type === 'file') && (
                      <FileEditor
                        block={block as FileBlockDraft}
                        onDelete={() => removeBlock(block.id)}
                      />
                    )}
                  </div>
                ))}

                {/* Block picker — empty state or "Add content" */}
                {blocks.length === 0 ? (
                  <div className="bg-white rounded-2xl shadow-sm px-5 py-6">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Add content block</p>
                    <BlockPicker onAddText={addTextBlock} onAddCode={addCodeBlock} onAddFile={triggerFileInput} />
                  </div>
                ) : showBlockPicker ? (
                  <div className="rounded-xl border border-dashed border-accent/40 bg-accent/5 px-4 py-3">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2">Add content block</p>
                    <BlockPicker onAddText={addTextBlock} onAddCode={addCodeBlock} onAddFile={triggerFileInput} />
                  </div>
                ) : (
                  <button
                    onClick={() => setShowBlockPicker(true)}
                    className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-dashed border-gray-200 text-sm text-gray-400 hover:border-accent/50 hover:text-accent transition-colors"
                  >
                    <Plus size={14} /> Add content
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ── Right sidebar ────────────────────────────────────────── */}
        <div className="space-y-4">

          {/* Problem Info card */}
          <div className="bg-white rounded-2xl shadow-sm p-5 space-y-4 text-sm">
            <h3 className="font-semibold text-gray-900">Problem Info</h3>
            <div>
              <p className="text-xs text-gray-400 mb-1.5">Topic</p>
              <TypeBadge type={problemType} />
            </div>
            {problem.difficulty && (
              <div>
                <p className="text-xs text-gray-400 mb-1.5">Difficulty</p>
                <Badge variant={problem.difficulty.toLowerCase()}>{problem.difficulty}</Badge>
              </div>
            )}
            <div>
              <p className="text-xs text-gray-400 mb-0.5">Deadline</p>
              <p className="font-medium text-gray-900">
                {detail.deadline ? formatDate(detail.deadline) : 'No deadline'}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-1">Status</p>
              <span className="inline-flex items-center text-sm font-medium text-gray-700">
                <StatusDot status={statusKey} />{statusLabel}
              </span>
            </div>
          </div>

          {/* Trainer Feedback card */}
          <div className="bg-white rounded-2xl shadow-sm p-5 text-sm">
            <div className="flex items-center gap-2 mb-4">
              <MessageSquare size={14} className="text-gray-400 flex-shrink-0" />
              <h3 className="font-semibold text-gray-900">Trainer Feedback</h3>
            </div>
            {!submitted ? (
              /* No submission yet */
              <div className="flex flex-col items-center py-4 text-center">
                <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center mb-3">
                  <MessageSquare size={18} className="text-gray-300" />
                </div>
                <p className="font-medium text-gray-700 text-sm mb-1">Not submitted yet</p>
                <p className="text-xs text-gray-400 leading-relaxed">Submit your solution to receive feedback from your trainer.</p>
              </div>
            ) : submission?.feedback ? (
              /* Has feedback */
              <>
                {submission.reviewedBy && (
                  <div className="flex items-center gap-2.5 mb-3">
                    <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                      {submission.reviewedBy.fullname
                        .split(' ').filter(Boolean).slice(0, 2)
                        .map(n => n[0]?.toUpperCase() || '').join('')}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{submission.reviewedBy.fullname}</p>
                      <p className="text-xs text-gray-400">{formatShortDate(submission.reviewedAt)}</p>
                    </div>
                  </div>
                )}
                <p className="text-gray-700 leading-relaxed">{submission.feedback}</p>
              </>
            ) : (
              /* Submitted but no feedback yet */
              <div className="flex flex-col items-center py-4 text-center">
                <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center mb-3">
                  <Clock size={18} className="text-gray-300" />
                </div>
                <p className="font-medium text-gray-700 text-sm mb-1">Awaiting feedback</p>
                <p className="text-xs text-gray-400 leading-relaxed">Your trainer hasn't reviewed your solution yet.</p>
              </div>
            )}
          </div>

          {/* Submit Solution — only when not yet submitted */}
          {!submitted && (
            <div>
              {error && <p className="mb-3 text-sm text-red-600 bg-red-50 rounded-xl px-3 py-2">{error}</p>}
              {problemType === 'DSA' && (
                <p className="mb-3 text-xs text-gray-500">DSA submissions require a code block and a screenshot or solution file.</p>
              )}
              <Button
                onClick={submit}
                disabled={!canSubmit}
                className="w-full justify-center"
              >
                <Send size={14} /> {submitting ? 'Submitting...' : 'Submit Solution'}
              </Button>
            </div>
          )}

          {/* Submission info when already submitted */}
          {submitted && submission && (
            <div className="bg-white rounded-2xl shadow-sm p-5 space-y-3 text-sm">
              <h3 className="font-semibold text-gray-900">Submission Info</h3>
              <div>
                <p className="text-xs text-gray-400 mb-0.5">Submitted</p>
                <p className="font-medium text-gray-900">{formatDateTime(submission.createdAt)}</p>
              </div>
              {submission.isLate && (
                <div>
                  <span className="inline-flex items-center gap-1 text-orange-500 font-medium text-xs">
                    <Clock size={12} /> Submitted late
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
