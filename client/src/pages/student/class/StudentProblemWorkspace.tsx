import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import {
  ChevronLeft, ChevronRight, FileText, Code2, Paperclip,
  Trash2, Plus, Send, ExternalLink, MessageCircle, Check, X, AlignLeft
} from 'lucide-react'
import { Badge } from '../../../components/ui/Badge'
import {
  submitProblem,
  isProblemSubmitted,
  getProblemStatus,
  type ContentBlock as StoreContentBlock
} from '../../../utils/studentStore'

// ─── Types ─────────────────────────────────────────────────────────────────────

type ContentBlock = StoreContentBlock

type ProblemData = {
  id: number
  title: string
  description: string
  constraints: string[]
  examples: { input: string; output: string }[]
  resourceUrl: string
  topic: string
  difficulty: string
  deadline: string
  status: string
}

// ─── Mock DB ───────────────────────────────────────────────────────────────────

const problemsDB: Record<string, ProblemData> = {
  '1': {
    id: 1,
    title: 'Two Sum',
    description:
      'Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.\n\nYou may assume that each input would have exactly one solution, and you may not use the same element twice.',
    constraints: ['2 ≤ nums.length ≤ 10⁴', '-10⁹ ≤ nums[i] ≤ 10⁹', 'Only one valid answer exists'],
    examples: [
      { input: 'nums = [2,7,11,15], target = 9', output: '[0,1]' },
      { input: 'nums = [3,2,4], target = 6', output: '[1,2]' },
    ],
    resourceUrl: 'https://leetcode.com/problems/two-sum/',
    topic: 'DSA',
    difficulty: 'Easy',
    deadline: 'September 20, 2026',
    status: 'Reviewed',
  },
  '2': {
    id: 2,
    title: 'Binary Search',
    description:
      'Given an array of integers nums which is sorted in ascending order, and an integer target, write a function to search target in nums. If target exists, return its index. Otherwise, return -1.',
    constraints: [
      '1 ≤ nums.length ≤ 10⁴',
      '-10⁴ < nums[i], target < 10⁴',
      'All integers in nums are unique',
      'nums is sorted in ascending order',
    ],
    examples: [
      { input: 'nums = [-1,0,3,5,9,12], target = 9', output: '4' },
      { input: 'nums = [-1,0,3,5,9,12], target = 2', output: '-1' },
    ],
    resourceUrl: 'https://leetcode.com/problems/binary-search/',
    topic: 'DSA',
    difficulty: 'Easy',
    deadline: 'September 22, 2026',
    status: 'Pending review',
  },
  '3': {
    id: 3,
    title: 'Reverse Linked List',
    description:
      'Given the head of a singly linked list, reverse the list, and return the reversed list.',
    constraints: [
      'The number of nodes in the list is the range [0, 5000]',
      '-5000 ≤ Node.val ≤ 5000',
    ],
    examples: [{ input: 'head = [1,2,3,4,5]', output: '[5,4,3,2,1]' }],
    resourceUrl: 'https://leetcode.com/problems/reverse-linked-list/',
    topic: 'DSA',
    difficulty: 'Easy',
    deadline: 'September 25, 2026',
    status: 'Not started',
  },
  '4': {
    id: 4,
    title: 'Process Scheduling',
    description:
      'Implement a process scheduler that supports FCFS (First Come First Served) and SJF (Shortest Job First) scheduling algorithms.',
    constraints: ['1 ≤ processes ≤ 100', 'Burst time > 0'],
    examples: [
      { input: 'processes = [(1,6),(2,8),(3,7)], algo = "FCFS"', output: 'Avg waiting time: 7.0' },
    ],
    resourceUrl: '',
    topic: 'OS',
    difficulty: 'Medium',
    deadline: 'September 18, 2026',
    status: 'Not started',
  },
  '5': {
    id: 5,
    title: 'Memory Management',
    description:
      'Implement memory allocation strategies: First Fit, Best Fit, and Worst Fit for a simulated memory block system.',
    constraints: ['Memory size ≤ 1024 MB', '1 ≤ processes ≤ 50'],
    examples: [
      { input: 'memory = 100, requests = [20, 30, 10]', output: 'Allocated: [0-19, 20-49, 50-59]' },
    ],
    resourceUrl: '',
    topic: 'OS',
    difficulty: 'Medium',
    deadline: 'September 28, 2026',
    status: 'Not started',
  },
  '6': {
    id: 6,
    title: 'SQL Queries',
    description:
      'Write SQL queries to retrieve, filter, join, and aggregate data from a relational database schema.',
    constraints: ['Use standard SQL syntax', 'Optimize for readability'],
    examples: [
      { input: 'SELECT name FROM students WHERE grade > 8', output: 'Alice, Bob, Charlie' },
    ],
    resourceUrl: '',
    topic: 'Database',
    difficulty: 'Easy',
    deadline: 'October 1, 2026',
    status: 'Not started',
  },
}

const defaultInitialBlocks: Record<string, ContentBlock[]> = {
  '3': [
    {
      id: 'block-1',
      type: 'text',
      content: 'Use the two-pointer approach. Start from the head and reverse each node by changing it',
    },
    {
      id: 'block-2',
      type: 'code',
      language: 'Python',
      content: `def reverse_list(head):
    prev = None
    curr = head
    
    while curr:
        next_node = curr.next
        curr.next = prev
        prev = curr
        curr = next_node
        
    return prev`,
    },
    {
      id: 'block-3',
      type: 'image',
      preview: '/leetcode_submission_sample.png',
      name: 'leetcode_submission.png',
    },
  ],
}

const LANGUAGES = ['Python', 'JavaScript', 'Java', 'C++', 'C', 'Go', 'Rust']

let blockIdCounter = 100
function nextId() {
  return `block-${++blockIdCounter}`
}

// ─── Component ─────────────────────────────────────────────────────────────────

export function StudentProblemWorkspace() {
  const { classId = '2', problemId = '3' } = useParams()
  const navigate = useNavigate()
  const problem = problemsDB[problemId] ?? problemsDB['3']

  const [alreadySubmitted, setAlreadySubmitted] = useState(() => isProblemSubmitted(problemId))
  const [blocks, setBlocks] = useState<ContentBlock[]>(() => {
    return defaultInitialBlocks[problemId] ? [...defaultInitialBlocks[problemId]] : []
  })
  const [showAddMenu, setShowAddMenu] = useState(false)
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [showSuccessModal, setShowSuccessModal] = useState(false)

  useEffect(() => {
    const checkStatus = () => {
      setAlreadySubmitted(isProblemSubmitted(problemId))
    }
    window.addEventListener('algozoo_store_updated', checkStatus)
    return () => window.removeEventListener('algozoo_store_updated', checkStatus)
  }, [problemId])

  // ─── Block CRUD ──────────────────────────────────────────────────────────────

  const addBlock = (type: 'text' | 'code' | 'image') => {
    const id = nextId()
    if (type === 'text') {
      setBlocks((prev) => [...prev, { id, type: 'text', content: '' }])
    } else if (type === 'code') {
      setBlocks((prev) => [...prev, { id, type: 'code', language: 'Python', content: '' }])
    } else {
      setBlocks((prev) => [...prev, { id, type: 'image', preview: '' }])
    }
    setShowAddMenu(false)
  }

  const removeBlock = (id: string) => {
    setBlocks((prev) => prev.filter((b) => b.id !== id))
  }

  const updateBlock = (id: string, patch: Partial<ContentBlock>) => {
    setBlocks((prev) =>
      prev.map((b) => (b.id === id ? ({ ...b, ...patch } as ContentBlock) : b))
    )
  }

  const handleImageSelect = (id: string, file: File) => {
    const url = URL.createObjectURL(file)
    updateBlock(id, { file, preview: url, name: file.name } as Partial<ContentBlock>)
  }

  // ─── Submit Actions ──────────────────────────────────────────────────────────

  const handleConfirmSubmit = () => {
    setShowConfirmModal(false)
    setShowSuccessModal(true)
  }

  const handleDone = () => {
    setShowSuccessModal(false)
    submitProblem(problemId, {
      title: problem.title,
      description: problem.description,
      constraints: problem.constraints,
      examples: problem.examples,
      resourceUrl: problem.resourceUrl,
      topic: problem.topic,
      blocks,
    })
    // Navigate directly to My Submissions detail page as requested!
    navigate(`/student/submissions/${problemId}?fromClass=${classId}`)
  }

  const currentStatus = alreadySubmitted ? 'Pending review' : problem.status

  return (
    <div>
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-gray-400 mb-4 flex-wrap">
        <Link
          to={`/student/classes/${classId}/problems`}
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
          to={`/student/classes/${classId}/overview`}
          className="text-gray-400 hover:text-accent"
        >
          WeCamp Batch 22
        </Link>
        <ChevronRight size={12} className="text-gray-300" />
        <Link
          to={`/student/classes/${classId}/problems`}
          className="text-gray-400 hover:text-accent"
        >
          Problems
        </Link>
        <ChevronRight size={12} className="text-gray-300" />
        <span className="text-gray-800 font-semibold">{problem.title}</span>
      </div>

      {/* Title */}
      <h1 className="text-2xl font-bold text-gray-900 mb-6">{problem.title}</h1>

      {/* Two-column layout */}
      <div className="flex gap-5 items-start">
        {/* LEFT — Problem + Solution */}
        <div className="flex-1 min-w-0 space-y-5">
          {/* Problem description card */}
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden border border-gray-100">
            <div className="flex items-center gap-2 px-6 py-3.5 border-b border-gray-100 bg-gray-50/70">
              <FileText size={14} className="text-gray-400" />
              <span className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">
                Problem
              </span>
              <span className="ml-1 text-xs font-bold text-gray-800">{problem.title}</span>
            </div>
            <div className="px-6 py-5 space-y-4">
              <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">
                {problem.description}
              </p>

              {problem.constraints.length > 0 && (
                <div>
                  <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">
                    Constraints
                  </p>
                  <div className="text-xs text-gray-600 space-y-0.5 pl-3">
                    {problem.constraints.map((c, i) => (
                      <p key={i}>{c}</p>
                    ))}
                  </div>
                </div>
              )}

              {problem.examples.length > 0 && (
                <div>
                  <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">
                    Examples
                  </p>
                  <div className="space-y-2">
                    {problem.examples.map((ex, i) => (
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

              {problem.resourceUrl && (
                <div className="pt-1">
                  <a
                    href={problem.resourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-sm text-[#DC2626] hover:underline font-semibold"
                  >
                    View resource <ExternalLink size={13} />
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

          {/* If no blocks, show ADD CONTENT BLOCK card matching Figma */}
          {blocks.length === 0 && (
            <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-4">
                ADD CONTENT BLOCK
              </p>
              <div className="flex gap-3 flex-wrap">
                <button
                  type="button"
                  onClick={() => addBlock('text')}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors shadow-sm"
                >
                  <AlignLeft size={16} className="text-gray-400" /> Text
                </button>
                <button
                  type="button"
                  onClick={() => addBlock('code')}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors shadow-sm"
                >
                  <Code2 size={16} className="text-gray-400" /> Code
                </button>
                <button
                  type="button"
                  onClick={() => addBlock('image')}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors shadow-sm"
                >
                  <Paperclip size={16} className="text-gray-400" /> Image/File
                </button>
              </div>
            </div>
          )}

          {/* Content blocks list */}
          {blocks.map((block) => (
            <div
              key={block.id}
              className="bg-white rounded-2xl shadow-sm overflow-hidden border border-gray-100"
            >
              {/* ── Text block ── */}
              {block.type === 'text' && (
                <>
                  <div className="flex items-center justify-between px-6 py-3 border-b border-gray-100 bg-gray-50/70">
                    <div className="flex items-center gap-2">
                      <FileText size={14} className="text-gray-400" />
                      <span className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">
                        TEXT
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeBlock(block.id)}
                      className="text-gray-300 hover:text-red-500 transition-colors"
                      title="Remove block"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                  <div className="px-6 py-4">
                    <textarea
                      value={block.content}
                      onChange={(e) => updateBlock(block.id, { content: e.target.value })}
                      placeholder="Write your explanation, approach, or notes..."
                      rows={4}
                      className="w-full text-sm text-gray-700 placeholder:text-gray-300 resize-none focus:outline-none leading-relaxed"
                    />
                  </div>
                </>
              )}

              {/* ── Code block ── */}
              {block.type === 'code' && (
                <>
                  <div className="flex items-center justify-between px-6 py-3 border-b border-gray-800 bg-[#111827]">
                    <div className="flex items-center gap-2">
                      <Code2 size={14} className="text-gray-400" />
                      <span className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">
                        CODE
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <select
                        value={block.language}
                        onChange={(e) => updateBlock(block.id, { language: e.target.value })}
                        className="bg-[#1F2937] text-gray-200 text-xs rounded-lg px-2.5 py-1 border border-gray-700 focus:outline-none"
                      >
                        {LANGUAGES.map((l) => (
                          <option key={l} value={l}>
                            {l}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => removeBlock(block.id)}
                        className="text-gray-500 hover:text-red-400 transition-colors"
                        title="Remove block"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                  <div className="bg-[#0B1120] px-6 py-4">
                    <textarea
                      value={block.content}
                      onChange={(e) => updateBlock(block.id, { content: e.target.value })}
                      placeholder={`Paste your ${block.language} code here...`}
                      rows={14}
                      className="w-full bg-transparent text-gray-200 font-mono text-xs leading-relaxed placeholder:text-gray-600 resize-none focus:outline-none"
                    />
                  </div>
                </>
              )}

              {/* ── Image/File block ── */}
              {block.type === 'image' && (
                <>
                  <div className="flex items-center justify-between px-6 py-3 border-b border-gray-100 bg-gray-50/70">
                    <div className="flex items-center gap-2">
                      <Paperclip size={14} className="text-gray-400" />
                      <span className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">
                        IMAGE/FILE
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeBlock(block.id)}
                      className="text-gray-300 hover:text-red-500 transition-colors"
                      title="Remove block"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                  <div className="px-6 py-5">
                    {block.preview ? (
                      <div className="relative group">
                        <img
                          src={block.preview}
                          alt="Upload preview"
                          className="max-h-80 w-auto rounded-xl mx-auto border border-gray-100 shadow-sm object-contain"
                        />
                      </div>
                    ) : (
                      <label className="cursor-pointer block">
                        <input
                          type="file"
                          accept="image/*,.pdf,.doc,.docx,.txt"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0]
                            if (file) handleImageSelect(block.id, file)
                          }}
                        />
                        <div className="border-2 border-dashed border-gray-200 rounded-xl py-12 flex flex-col items-center gap-2.5 hover:border-accent/40 hover:bg-gray-50/50 transition-colors">
                          <Paperclip size={24} className="text-gray-300" />
                          <p className="text-xs font-semibold text-gray-400">
                            Click to upload image/file
                          </p>
                        </div>
                      </label>
                    )}
                  </div>
                </>
              )}
            </div>
          ))}

          {/* + Add content button */}
          {blocks.length > 0 && (
            <div className="relative pt-1">
              <button
                type="button"
                onClick={() => setShowAddMenu((prev) => !prev)}
                className="w-full py-3 border-2 border-dashed border-gray-200 rounded-2xl text-xs font-semibold text-gray-400 hover:border-[#DC2626]/40 hover:text-[#DC2626] transition-colors flex items-center justify-center gap-2 bg-white/50"
              >
                <Plus size={14} /> Add content
              </button>

              {showAddMenu && (
                <div className="absolute left-1/2 -translate-x-1/2 mt-2 bg-white rounded-2xl shadow-xl border border-gray-100 p-2 flex gap-1.5 z-10 animate-in fade-in zoom-in-95 duration-100">
                  <button
                    type="button"
                    onClick={() => addBlock('text')}
                    className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <FileText size={14} className="text-gray-400" /> Text
                  </button>
                  <button
                    type="button"
                    onClick={() => addBlock('code')}
                    className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <Code2 size={14} className="text-gray-400" /> Code
                  </button>
                  <button
                    type="button"
                    onClick={() => addBlock('image')}
                    className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <Paperclip size={14} className="text-gray-400" /> Image/File
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* RIGHT — Sidebar */}
        <div className="w-[300px] flex-shrink-0 space-y-4">
          {/* Problem Info */}
          <div className="bg-white rounded-2xl border border-gray-200/80 p-5 space-y-4 shadow-sm">
            <h3 className="font-bold text-gray-900 text-sm">Problem Info</h3>
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">
                Topic
              </p>
              <Badge variant={problem.topic}>{problem.topic}</Badge>
            </div>
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">
                Difficulty
              </p>
              <Badge variant={problem.difficulty.toLowerCase()}>{problem.difficulty}</Badge>
            </div>
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">
                Deadline
              </p>
              <p className="text-sm font-semibold text-gray-900">{problem.deadline}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">
                Status
              </p>
              <div className="flex items-center gap-1.5 text-xs font-medium text-gray-500">
                <span
                  className={`w-2 h-2 rounded-full ${
                    currentStatus === 'Reviewed'
                      ? 'bg-green-500'
                      : currentStatus === 'Pending review'
                      ? 'bg-orange-400'
                      : 'bg-gray-300'
                  }`}
                />
                {currentStatus}
              </div>
            </div>
          </div>

          {/* Trainer Feedback */}
          <div className="bg-white rounded-2xl border border-gray-200/80 p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <MessageCircle size={14} className="text-gray-400" />
              <h3 className="font-bold text-gray-900 text-sm">Trainer Feedback</h3>
            </div>
            <div className="text-center py-5">
              <div className="w-10 h-10 rounded-full bg-gray-50 text-gray-300 flex items-center justify-center mx-auto mb-2.5">
                <MessageCircle size={20} />
              </div>
              <p className="text-xs font-bold text-gray-700">Not submitted yet</p>
              <p className="text-[11px] text-gray-400 mt-1 leading-relaxed max-w-[200px] mx-auto">
                Submit your solution to receive feedback from your trainer.
              </p>
            </div>
          </div>

          {/* Submit button */}
          <button
            type="button"
            onClick={() => setShowConfirmModal(true)}
            className="w-full bg-[#DC2626] hover:bg-[#B91C1C] text-white font-semibold py-3.5 rounded-xl flex items-center justify-center gap-2 transition-colors shadow-sm text-sm"
          >
            <Send size={15} /> Submit Solution
          </button>
        </div>
      </div>

      {/* ── Submit Confirmation Modal (Matching Figma) ── */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 backdrop-blur-[1px]">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl text-center relative animate-in fade-in zoom-in-95 duration-150 border border-gray-100">
            {/* Red circle icon */}
            <div className="w-12 h-12 rounded-full bg-[#FEE2E2] text-[#DC2626] flex items-center justify-center mx-auto mb-3.5">
              <Send size={18} className="translate-x-0.5" />
            </div>

            <h3 className="text-base font-bold text-gray-900 mb-2">Submit your solution?</h3>

            <p className="text-xs text-gray-500 mb-6 leading-relaxed max-w-[280px] mx-auto">
              Are you sure you want to submit your solution for{' '}
              <strong className="text-gray-800 font-bold">"{problem.title}"</strong>? You can only
              submit once.
            </p>

            <div className="flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="px-6 py-2.5 rounded-xl border border-gray-200 text-xs font-bold text-gray-600 hover:bg-gray-50 transition-colors shadow-sm"
              >
                No
              </button>
              <button
                type="button"
                onClick={handleConfirmSubmit}
                className="px-5 py-2.5 rounded-xl bg-[#DC2626] hover:bg-[#B91C1C] text-white text-xs font-bold flex items-center gap-2 shadow-sm transition-colors"
              >
                <Send size={13} /> Yes, submit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Submit Success Modal (Matching Figma) ── */}
      {showSuccessModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 backdrop-blur-[1px]">
          <div className="bg-white rounded-2xl max-w-sm w-full shadow-2xl overflow-hidden relative animate-in fade-in zoom-in-95 duration-150 border border-gray-100">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-3.5 border-b border-gray-100">
              <span className="text-sm font-bold text-gray-900">Submit Solution</span>
              <button
                type="button"
                onClick={handleDone}
                className="text-gray-400 hover:text-gray-600 transition-colors p-1"
              >
                <X size={16} />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 text-center">
              <div className="w-12 h-12 rounded-full border-2 border-[#10B981] text-[#10B981] flex items-center justify-center mx-auto mb-3 mt-1">
                <Check size={26} strokeWidth={2.5} />
              </div>

              <h3 className="text-lg font-bold text-gray-900 mb-1">Solution submitted!</h3>
              <p className="text-xs text-gray-400 mb-6">{problem.title}</p>

              <button
                type="button"
                onClick={handleDone}
                className="px-10 py-2.5 rounded-xl bg-[#DC2626] hover:bg-[#B91C1C] text-white text-xs font-bold shadow-sm transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
