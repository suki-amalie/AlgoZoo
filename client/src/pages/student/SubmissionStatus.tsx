import { useState, useEffect } from 'react'
import { useParams, Link, useSearchParams, useLocation } from 'react-router-dom'
import {
  ChevronLeft, ChevronRight, FileText, Code2, CheckCircle, Clock, ExternalLink, Paperclip
} from 'lucide-react'
import { Badge } from '../../components/ui/Badge'
import { getSubmissionById, type SubmissionRecord } from '../../utils/studentStore'

export function SubmissionStatus() {
  const { id = '1' } = useParams()
  const [searchParams] = useSearchParams()
  const location = useLocation()
  const [tick, setTick] = useState(0)

  const fromClass = searchParams.get('fromClass') || (location.state as any)?.fromClass

  useEffect(() => {
    const handleUpdate = () => setTick((t) => t + 1)
    window.addEventListener('algozoo_store_updated', handleUpdate)
    return () => window.removeEventListener('algozoo_store_updated', handleUpdate)
  }, [])

  const sub: SubmissionRecord | undefined = getSubmissionById(id)

  if (!sub) {
    return (
      <div className="py-16 text-center">
        <h2 className="text-xl font-bold text-gray-800 mb-2">Submission not found</h2>
        <Link to="/student/submissions" className="text-accent text-sm font-semibold hover:underline">
          Back to My Submissions
        </Link>
      </div>
    )
  }

  return (
    <div>
      {/* Breadcrumb matching Figma */}
      <div className="flex items-center gap-2 text-xs text-gray-400 mb-4 flex-wrap">
        {fromClass ? (
          <>
            <Link
              to={`/student/classes/${fromClass}/problems`}
              className="flex items-center gap-1 text-gray-500 hover:text-accent font-medium"
            >
              <ChevronLeft size={14} /> Back to Problems
            </Link>
            <span className="text-gray-300">|</span>
            <Link to="/student/classes" className="text-gray-400 hover:text-accent">
              My Classes
            </Link>
            <ChevronRight size={12} className="text-gray-300" />
            <Link
              to={`/student/classes/${fromClass}/overview`}
              className="text-gray-400 hover:text-accent"
            >
              {sub.class || 'WeCamp Batch 22'}
            </Link>
            <ChevronRight size={12} className="text-gray-300" />
            <Link
              to={`/student/classes/${fromClass}/problems`}
              className="text-gray-400 hover:text-accent"
            >
              Problems
            </Link>
            <ChevronRight size={12} className="text-gray-300" />
            <span className="text-gray-800 font-semibold">{sub.problem}</span>
          </>
        ) : (
          <>
            <Link
              to="/student/submissions"
              className="flex items-center gap-1 text-gray-500 hover:text-accent font-medium"
            >
              <ChevronLeft size={14} /> My Submissions
            </Link>
            <span className="text-gray-300">|</span>
            <Link to="/student/submissions" className="text-gray-400 hover:text-accent">
              My Submissions
            </Link>
            <ChevronRight size={12} className="text-gray-300" />
            <span className="text-gray-800 font-semibold">{sub.problem}</span>
          </>
        )}
      </div>

      {/* Title */}
      <h1 className="text-2xl font-bold text-gray-900 mb-6">{sub.problem}</h1>

      {/* Two-column: left (problem + solution), right (info + feedback) */}
      <div className="flex gap-5 items-start">
        {/* LEFT */}
        <div className="flex-1 min-w-0 space-y-5">
          {/* Problem description card */}
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden border border-gray-100">
            <div className="flex items-center gap-2 px-6 py-3.5 border-b border-gray-100 bg-gray-50/70">
              <FileText size={14} className="text-gray-400" />
              <span className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">
                Problem
              </span>
              <span className="ml-1 text-xs font-bold text-gray-800">{sub.problem}</span>
            </div>
            <div className="px-6 py-5 space-y-4">
              <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">
                {sub.problemDescription}
              </p>

              {sub.constraints && sub.constraints.length > 0 && (
                <div>
                  <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">
                    Constraints
                  </p>
                  <div className="text-xs text-gray-600 space-y-0.5 pl-3">
                    {sub.constraints.map((c, i) => (
                      <p key={i}>{c}</p>
                    ))}
                  </div>
                </div>
              )}

              {sub.examples && sub.examples.length > 0 && (
                <div>
                  <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">
                    Examples
                  </p>
                  <div className="space-y-2">
                    {sub.examples.map((ex, i) => (
                      <div
                        key={i}
                        className="bg-gray-50 rounded-xl px-4 py-3 text-xs font-mono text-gray-700 space-y-0.5"
                      >
                        <p>Input: {ex.input}</p>
                        <p>Output: {ex.output}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {sub.resourceUrl && (
                <div className="pt-1">
                  <a
                    href={sub.resourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-sm text-[#DC2626] hover:underline font-semibold"
                  >
                    View on LeetCode <ExternalLink size={13} />
                  </a>
                </div>
              )}
            </div>
          </div>

          {/* My Solution Header */}
          <div className="flex items-center gap-2.5 pt-1">
            <div className="w-6 h-6 rounded-full bg-[#DC2626] text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0 shadow-sm">
              ME
            </div>
            <h2 className="text-base font-bold text-gray-900">My Solution</h2>
          </div>

          {/* Solution blocks */}
          {sub.solution.map((block, i) => (
            <div
              key={block.id || i}
              className="bg-white rounded-2xl shadow-sm overflow-hidden border border-gray-100"
            >
              {block.type === 'text' && (
                <>
                  <div className="flex items-center gap-2 px-6 py-3 border-b border-gray-100 bg-gray-50/70">
                    <FileText size={14} className="text-gray-400" />
                    <span className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">
                      Explanation
                    </span>
                  </div>
                  <div className="px-6 py-4 text-sm text-gray-700 leading-relaxed whitespace-pre-line">
                    {block.content}
                  </div>
                </>
              )}

              {block.type === 'code' && (
                <>
                  <div className="flex items-center justify-between px-6 py-3 border-b border-gray-800 bg-[#111827]">
                    <div className="flex items-center gap-2">
                      <Code2 size={14} className="text-gray-400" />
                      <span className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">
                        Code
                      </span>
                    </div>
                    <span className="text-xs font-semibold text-gray-400 bg-gray-800 px-2.5 py-0.5 rounded-lg border border-gray-700">
                      {block.language}
                    </span>
                  </div>
                  <div className="bg-[#0B1120] px-6 py-4 font-mono text-xs overflow-auto">
                    {block.content.split('\n').map((line, j) => (
                      <div key={j} className="flex hover:bg-gray-800/40">
                        <span className="text-gray-600 w-7 flex-shrink-0 text-right mr-4 select-none text-xs leading-6">
                          {j + 1}
                        </span>
                        <span className="text-gray-200 leading-6">{line || ' '}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {block.type === 'image' && (
                <>
                  <div className="flex items-center gap-2 px-6 py-3 border-b border-gray-100 bg-gray-50/70">
                    <Paperclip size={14} className="text-gray-400" />
                    <span className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">
                      Image/File
                    </span>
                  </div>
                  <div className="px-6 py-5">
                    {block.preview ? (
                      <img
                        src={block.preview}
                        alt="Uploaded submission"
                        className="max-h-80 w-auto rounded-xl mx-auto border border-gray-100 shadow-sm object-contain"
                      />
                    ) : (
                      <div className="border-2 border-dashed border-gray-200 rounded-xl py-8 text-center text-xs text-gray-400">
                        Attachment preview unavailable
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          ))}

          {fromClass && (
            <div className="pt-2">
              <Link
                to={`/student/classes/${fromClass}/problems`}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-gray-200 bg-white text-xs font-semibold text-gray-700 hover:bg-gray-50 shadow-sm transition-colors"
              >
                <ChevronLeft size={14} /> Back to Problems
              </Link>
            </div>
          )}
        </div>

        {/* RIGHT — sidebar */}
        <div className="w-[300px] flex-shrink-0 space-y-4">
          {/* Submission Info */}
          <div className="bg-white rounded-2xl border border-gray-200/80 p-5 space-y-4 shadow-sm">
            <h3 className="font-bold text-gray-900 text-sm">Submission Info</h3>
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">
                Problem
              </p>
              <p className="text-sm font-semibold text-gray-900">{sub.problem}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">
                Class
              </p>
              {fromClass ? (
                <Link
                  to={`/student/classes/${fromClass}/problems`}
                  className="text-sm font-semibold text-accent hover:underline flex items-center gap-1 group"
                  title="Back to class problems"
                >
                  {sub.class}
                  <ChevronRight size={13} className="group-hover:translate-x-0.5 transition-transform" />
                </Link>
              ) : (
                <p className="text-sm font-semibold text-gray-900">{sub.class}</p>
              )}
            </div>
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">
                Submitted
              </p>
              <p className="text-sm font-semibold text-gray-900">{sub.submittedAt}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">
                Status
              </p>
              <div className="flex items-center gap-1.5">
                {sub.status === 'Reviewed' ? (
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-green-700 bg-green-50 px-2.5 py-1 rounded-full">
                    <CheckCircle size={14} className="text-green-500" /> Reviewed
                  </span>
                ) : (
                  <Badge variant="pending">Pending Review</Badge>
                )}
              </div>
            </div>
          </div>

          {/* Trainer Feedback */}
          <div className="bg-white rounded-2xl border border-gray-200/80 p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <FileText size={14} className="text-gray-400" />
              <h3 className="font-bold text-gray-900 text-sm">Trainer Feedback</h3>
            </div>

            {sub.feedback ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-full bg-accent text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0">
                    {sub.feedback.trainerInitials}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-gray-900">{sub.feedback.trainer}</p>
                    <p className="text-[11px] text-gray-400">{sub.feedback.date}</p>
                  </div>
                </div>
                <div className="bg-green-50 border border-green-100 rounded-xl px-4 py-3 text-xs text-gray-700 leading-relaxed">
                  {sub.feedback.text}
                </div>
              </div>
            ) : (
              <div className="text-center py-5">
                <div className="w-10 h-10 rounded-full bg-gray-50 text-gray-300 flex items-center justify-center mx-auto mb-2.5">
                  <Clock size={20} />
                </div>
                <p className="text-xs font-bold text-gray-700">Waiting for feedback</p>
                <p className="text-[11px] text-gray-400 mt-1 leading-relaxed max-w-[200px] mx-auto">
                  Your trainer will review your submission and leave feedback here.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
