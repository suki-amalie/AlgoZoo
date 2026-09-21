import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  ArrowLeft, CheckCircle2, Clock, Code2, Download, FileText, ImageIcon, Loader2, MessageSquare, Paperclip,
} from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { studentService } from '../../services/studentService'
import { getFileUrl } from '../../services/fileService'
import { sanitizeHtml } from '../../utils/sanitizeHtml'
import type { StudentProblemDetail } from '../../types/classProblem'
import type { SubmissionContentBlock } from '../../types/submission'

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

function AttachmentPreview({ block }: { block: SubmissionContentBlock }) {
  const rawSrc = block.file_id ? getFileUrl(block.file_id) : undefined
  const lower = block.filename?.toLowerCase() ?? ''
  const showImg = block.type === 'image' || IMAGE_EXTS.some((ext) => lower.endsWith(ext))
  const isPdf = lower.endsWith('.pdf')
  const blobUrl = useFileBlob(rawSrc)
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
      {isPdf && blobUrl && (
        <iframe src={blobUrl} title={label} className="w-full h-96 border-t border-gray-100" />
      )}
    </div>
  )
}

export function SubmissionStatus() {
  const { id = '' } = useParams()
  const { user } = useAuth()
  const [detail, setDetail] = useState<StudentProblemDetail | null>(null)
  const [className, setClassName] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    studentService.getProblem(id)
      .then((response) => {
        setDetail(response.data)
        return response.data.classId
      })
      .then((classId) =>
        studentService.getClasses().then((response) => {
          const current = response.data.find((c) => c.classId === classId)
          if (current) setClassName(current.name)
        })
      )
      .catch((requestError) => setError(requestError instanceof Error ? requestError.message : 'Unable to load submission'))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) return <div className="py-16 flex justify-center gap-2 text-sm text-gray-400"><Loader2 size={16} className="animate-spin" /> Loading submission...</div>
  if (error) return <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
  if (!detail || !detail.problem || !detail.submission) return <p className="text-sm text-gray-500">Submission not found.</p>

  const problem = detail.problem
  const submission = detail.submission

  const formatSubmitDate = (dateStr: string) => {
    const d = new Date(dateStr)
    return (
      d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) +
      ' at ' +
      d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
    )
  }

  const formatShortDate = (dateStr: string | null) =>
    dateStr ? new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : ''

  return (
    <div>
      {/* Back button */}
      <Link
        to="/student/submissions"
        className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-accent font-medium transition-colors mb-3"
      >
        <ArrowLeft size={15} /> My Submissions
      </Link>

      {/* Page title */}
      <h1 className="text-2xl font-bold text-gray-900 mb-6">{problem.title}</h1>

      {/* Main layout */}
      <div className="flex flex-col lg:grid lg:grid-cols-[1fr_300px] gap-5">
        {/* Left: problem card + my solution */}
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
                View resource
                <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
              </a>
            )}
          </div>

          {/* My Solution */}
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
                    <div
                      className="rich-text-output text-sm text-gray-700 whitespace-pre-line leading-relaxed"
                      dangerouslySetInnerHTML={{ __html: sanitizeHtml(block.content ?? '') }}
                    />
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
        </div>

        {/* Right sidebar */}
        <div className="space-y-4">
          {/* Submission Info */}
          <div className="bg-white rounded-2xl shadow-sm p-5 space-y-4 text-sm">
            <h3 className="font-semibold text-gray-900">Submission Info</h3>
            <div>
              <p className="text-xs text-gray-400 mb-0.5">Problem</p>
              <p className="font-medium text-gray-900">{problem.title}</p>
            </div>
            {className && (
              <div>
                <p className="text-xs text-gray-400 mb-0.5">Class</p>
                <p className="font-medium text-gray-900">{className}</p>
              </div>
            )}
            <div>
              <p className="text-xs text-gray-400 mb-0.5">Submitted</p>
              <p className="font-medium text-gray-900">{formatSubmitDate(submission.createdAt)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-0.5">Status</p>
              {detail.status === 'Reviewed' ? (
                <span className="inline-flex items-center gap-1 text-green-600 font-medium">
                  <CheckCircle2 size={13} /> Reviewed
                </span>
              ) : detail.status === 'Pending' ? (
                <span className="inline-flex items-center gap-1 text-amber-500 font-medium">
                  <Clock size={13} /> Pending review
                </span>
              ) : detail.status === 'Late' ? (
                <span className="inline-flex items-center gap-1 text-orange-500 font-medium">
                  <Clock size={13} /> Late
                </span>
              ) : (
                <span className="text-gray-400">—</span>
              )}
            </div>
          </div>

          {/* Trainer Feedback */}
          {submission.feedback && (
            <div className="bg-white rounded-2xl shadow-sm p-5 text-sm">
              <div className="flex items-center gap-2 mb-4">
                <MessageSquare size={14} className="text-gray-400 flex-shrink-0" />
                <h3 className="font-semibold text-gray-900">Trainer Feedback</h3>
              </div>
              {submission.reviewedBy && (
                <div className="flex items-center gap-2.5 mb-3">
                  <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                    {submission.reviewedBy.fullname
                      .split(' ')
                      .filter(Boolean)
                      .slice(0, 2)
                      .map((n) => n[0]?.toUpperCase() || '')
                      .join('')}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{submission.reviewedBy.fullname}</p>
                    <p className="text-xs text-gray-400">{formatShortDate(submission.reviewedAt)}</p>
                  </div>
                </div>
              )}
              <p className="text-gray-700 leading-relaxed">{submission.feedback}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
