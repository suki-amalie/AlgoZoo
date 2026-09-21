import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { FileText, Code2, ImageIcon, Paperclip, Download, ChevronLeft, ChevronRight, Check, Loader2 } from 'lucide-react'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { getSubmissionDetail, reviewSubmission } from '../../services/submissionService'
import { getFileUrl } from '../../services/fileService'
import { getProblemDetail } from '../../services/problemService'
import { sanitizeHtml } from '../../utils/sanitizeHtml'
import type { SubmissionDetail, ContentBlock } from '../../types/submission'
import type { Problem } from '../../types/problem'

const IMAGE_EXTS = ['.jpg', '.jpeg', '.png', '.gif', '.webp']

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

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs text-gray-400 mb-0.5">{label}</p>
      <p className="text-sm font-medium text-gray-900">{value}</p>
    </div>
  )
}

function BlockView({ block }: { block: ContentBlock }) {
  const rawSrc = block.file_id ? getFileUrl(block.file_id) : undefined
  const lower = block.filename?.toLowerCase() ?? ''
  const blobUrl = useFileBlob(rawSrc)

  if (block.type === 'text') {
    return (
      <div>
        <div className="flex items-center gap-2 px-5 py-3 border-b border-gray-100 bg-gray-50">
          <FileText size={13} className="text-gray-400" />
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Explanation</span>
        </div>
        <div
          className="rich-text-output px-5 py-4 text-sm text-gray-700 leading-relaxed whitespace-pre-line"
          dangerouslySetInnerHTML={{ __html: sanitizeHtml(block.content ?? '') }}
        />
      </div>
    )
  }

  if (block.type === 'code') {
    return (
      <div>
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-700 bg-gray-900">
          <div className="flex items-center gap-2">
            <Code2 size={13} className="text-gray-400" />
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Code</span>
          </div>
          <span className="text-xs text-gray-500 capitalize">{block.language}</span>
        </div>
        <div className="bg-gray-900 px-5 py-4 font-mono text-sm overflow-auto">
          {(block.content ?? '').split('\n').map((line, i) => (
            <div key={i} className="flex hover:bg-gray-800/40">
              <span className="text-gray-600 w-7 flex-shrink-0 text-right mr-4 select-none text-xs leading-6">{i + 1}</span>
              <span className="text-gray-200 leading-6">{line || ' '}</span>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (block.type === 'image') {
    return (
      <div>
        <div className="flex items-center gap-2 px-5 py-3 border-b border-gray-100 bg-gray-50">
          <ImageIcon size={13} className="text-gray-400" />
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Screenshot</span>
          <span className="text-xs text-gray-400 ml-1">{block.filename}</span>
          {blobUrl && (
            <a href={blobUrl} download={block.filename} className="ml-auto inline-flex items-center gap-1 text-xs text-accent hover:underline">
              <Download size={12} /> Download
            </a>
          )}
        </div>
        <div className="p-5 bg-gray-50 min-h-24 flex items-center justify-center">
          {blobUrl ? (
            <img src={blobUrl} alt={block.filename ?? 'Submitted screenshot'} className="max-w-full max-h-[600px] rounded-lg" />
          ) : (
            <div className="flex flex-col items-center gap-2 text-gray-400">
              <ImageIcon size={28} />
              <p className="text-xs">{block.filename}</p>
            </div>
          )}
        </div>
      </div>
    )
  }

  if (block.type === 'file') {
    const isPdf = lower.endsWith('.pdf')
    const isImageFile = IMAGE_EXTS.some(ext => lower.endsWith(ext))
    return (
      <div>
        <div className={`flex items-center gap-3 px-5 py-4${isImageFile ? ' border-b border-gray-100 bg-gray-50' : ''}`}>
          {isImageFile ? <ImageIcon size={15} className="text-gray-400 flex-shrink-0" /> : <Paperclip size={15} className="text-gray-400 flex-shrink-0" />}
          {blobUrl ? (
            <a href={blobUrl} download={block.filename} className="text-sm text-accent hover:underline inline-flex items-center gap-1.5 flex-1 min-w-0">
              <span className="truncate">{block.filename}</span>
              <Download size={13} className="flex-shrink-0" />
            </a>
          ) : (
            <span className="text-sm text-gray-700 flex-1 truncate">{block.filename}</span>
          )}
        </div>
        {blobUrl && isImageFile && (
          <div className="p-5 bg-gray-50 flex items-center justify-center">
            <img src={blobUrl} alt={block.filename ?? 'Attached image'} className="max-w-full max-h-[600px] rounded-lg" />
          </div>
        )}
        {blobUrl && isPdf && (
          <iframe src={blobUrl} title={block.filename ?? 'PDF preview'} className="w-full h-[600px] border-t border-gray-100" />
        )}
      </div>
    )
  }

  return null
}

function initials(name: string) {
  return name.split(' ').filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase()
}

export function ReviewSubmission() {
  const { id = '' } = useParams()

  const [submission, setSubmission] = useState<SubmissionDetail | null>(null)
  const [problem, setProblem] = useState<Problem | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [feedback, setFeedback] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!id) return
    let cancelled = false
    setLoading(true)
    setError(null)
    getSubmissionDetail(id)
      .then((s) => {
        if (cancelled) return
        setSubmission(s)
        setFeedback(s.feedback ?? '')
        if (s.problem?.id) {
          getProblemDetail(s.problem.id).then((p) => { if (!cancelled) setProblem(p) }).catch(() => {})
        }
      })
      .catch((err) => { if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load submission') })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [id])

  const handleMarkReviewed = async () => {
    if (!submission) return
    setSaving(true)
    try {
      await reviewSubmission(id, feedback)
      setSubmission((prev) => (prev ? { ...prev, status: 'review', feedback } : prev))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save this review')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="py-16 flex items-center justify-center text-sm text-gray-400 gap-2">
        <Loader2 size={16} className="animate-spin" /> Loading submission...
      </div>
    )
  }

  if (error && !submission) {
    return <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-sm text-red-600">{error}</div>
  }
  if (!submission) return null

  const done = submission.status === 'review'
  const studentName = submission.student?.name ?? 'Unknown student'
  const classId = submission.class?.id ?? ''

  return (
    <div>
      {/* Back + Breadcrumb */}
      <div className="flex items-center gap-3 mb-5 flex-wrap">
        <Link
          to={`/trainer/classes/${classId}/submissions`}
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-accent font-medium transition-colors"
        >
          <ChevronLeft size={15} /> Back to Submissions
        </Link>
        <span className="text-gray-200">|</span>
        <div className="flex items-center gap-1.5 text-sm text-gray-400 flex-wrap">
        <Link to="/trainer/classes" className="hover:text-accent">My Classes</Link>
        <ChevronRight size={13} className="text-gray-300" />
        <Link to={`/trainer/classes/${classId}/overview`} className="hover:text-accent">{submission.class?.className}</Link>
        <ChevronRight size={13} className="text-gray-300" />
        <Link to={`/trainer/classes/${classId}/submissions`} className="hover:text-accent">Submissions</Link>
        <ChevronRight size={13} className="text-gray-300" />
        <span className="text-gray-700 font-medium">{studentName}</span>
        </div>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-accent text-white text-sm flex items-center justify-center font-bold flex-shrink-0">
            {initials(studentName)}
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">{studentName}</h1>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {done ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-semibold bg-green-100 text-green-700">
              <Check size={11} /> Reviewed
            </span>
          ) : (
            <Badge variant="pending">Pending</Badge>
          )}
          {submission.is_late && <Badge variant="late">Late</Badge>}
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 mb-4 text-sm text-red-600">{error}</div>
      )}

      {/* Two-column layout: solution left, feedback right */}
      <div className="flex gap-5 items-start">
        {/* LEFT: problem description + content blocks */}
        <div className="flex-1 min-w-0 space-y-3">
          {/* Problem description card */}
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <div className="flex items-center gap-2 px-5 py-3 border-b border-gray-100 bg-gray-50">
              <FileText size={13} className="text-gray-400" />
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Problem</span>
              <span className="ml-1 text-xs font-bold text-gray-700">{submission.problem?.title}</span>
            </div>
            <div className="px-5 py-4 space-y-3">
              {problem ? (
                <>
                  <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">
                    {problem.description || ''}
                  </p>
                  {problem.resource_url && (
                    <a href={problem.resource_url} target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-accent hover:underline">
                      View resource →
                    </a>
                  )}
                </>
              ) : (
                <p className="text-xs text-gray-400">Loading problem details...</p>
              )}
            </div>
          </div>

          {/* Student submission blocks */}
          <div className="flex items-center gap-2 px-1">
            <div className="w-7 h-7 rounded-full bg-accent text-white text-[10px] flex items-center justify-center font-bold flex-shrink-0">
              {initials(studentName)}
            </div>
            <span className="text-sm font-semibold text-gray-700">Student's Submission</span>
          </div>
          {submission.content_blocks.map((block, i) => (
            <div key={i} className="bg-white rounded-2xl shadow-sm overflow-hidden">
              <BlockView block={block} />
            </div>
          ))}
          {submission.content_blocks.length === 0 && (
            <div className="bg-white rounded-2xl shadow-sm py-8 text-center text-sm text-gray-400">
              No content in this submission.
            </div>
          )}
        </div>

        {/* RIGHT: submission info + feedback */}
        <div className="w-[300px] flex-shrink-0 space-y-4">
          {/* Submission info */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
            <h3 className="font-semibold text-gray-800 text-sm">Submission Info</h3>
            <InfoRow label="Student" value={studentName} />
            <InfoRow label="Problem" value={submission.problem?.title ?? '—'} />
            <InfoRow label="Class" value={submission.class?.className ?? '—'} />
            <InfoRow label="Submitted" value={new Date(submission.submitted_at).toLocaleString()} />
            <InfoRow
              label="Status"
              value={
                <span className="inline-flex items-center gap-1.5">
                  {done
                    ? <span className="inline-flex items-center gap-1 text-xs font-semibold text-green-700"><Check size={11} /> Reviewed</span>
                    : <Badge variant="pending">Pending</Badge>}
                  {submission.is_late && <Badge variant="late">Late</Badge>}
                </span>
              }
            />
          </div>

          {/* Feedback */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
            <h3 className="font-semibold text-gray-800 text-sm">Feedback</h3>

            {done ? (
              /* Read-only feedback display */
              <div className="bg-green-50 border border-green-100 rounded-xl px-4 py-3 text-sm text-gray-700 leading-relaxed whitespace-pre-line min-h-[80px]">
                {feedback || <span className="text-gray-400 italic">No feedback written.</span>}
              </div>
            ) : (
              /* Editable textarea */
              <textarea
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                rows={10}
                placeholder={`Write feedback for ${studentName}…\n\nExamples:\n- Great approach using hash map\n- Check edge case: empty array\n- Clean, readable code`}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-accent/60 resize-none"
              />
            )}

            {done ? null : (
              <>
                <Button
                  variant="success"
                  className="w-full justify-center"
                  onClick={() => void handleMarkReviewed()}
                  disabled={saving || !feedback.trim()}
                >
                  {saving ? 'Saving...' : 'Mark as Reviewed'}
                </Button>
                <p className="text-xs text-center text-gray-400">
                  Student sees feedback after you mark as reviewed.
                </p>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
