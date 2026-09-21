import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  AlignLeft, Bold, CheckCircle2, ChevronLeft, ChevronRight, Clock, Columns3,
  Code2, Download, Eye, ExternalLink, FileText, ImageIcon, Italic, List, ListOrdered, Loader2,
  MessageSquare, Minus, Paperclip, Palette, Play, Plus, Rows3, Send, Table as TableIcon, Terminal, Trash2, Underline,
} from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { Badge, TypeBadge, StatusDot } from '../../components/ui/Badge'
import { CodeEditor as MonacoCodeEditor } from '../../components/ui/CodeEditor'
import { TraceVisualizer } from '../../components/problem/TraceVisualizer'
import { useAuth } from '../../hooks/useAuth'
import { studentService } from '../../services/studentService'
import { executionService } from '../../services/executionService'
import { uploadFile, getFileUrl } from '../../services/fileService'
import { sanitizeHtml } from '../../utils/sanitizeHtml'
import type { StudentProblemDetail } from '../../types/classProblem'
import type { SubmissionContentBlock } from '../../types/submission'
import type { RunCodeResult, TraceResult } from '../../types/execution'

const VISUALIZABLE_LANGUAGES = ['Python', 'JavaScript', 'C++']

// ── Draft block types ───────────────────────────────────────────────
type TextBlockDraft = { id: string; type: 'text'; content: string }
type CodeBlockDraft = { id: string; type: 'code'; content: string; language: string }
type FileBlockDraft = { id: string; type: 'image' | 'file'; file: File; previewUrl: string; filename: string }
type BlockDraft = TextBlockDraft | CodeBlockDraft | FileBlockDraft

const LANGUAGES = ['Python', 'JavaScript', 'Java', 'C++', 'TypeScript']
const MONACO_LANGUAGE: Record<string, string> = {
  Python: 'python',
  JavaScript: 'javascript',
  Java: 'java',
  'C++': 'cpp',
  TypeScript: 'typescript',
}
const IMAGE_EXTS = ['.jpg', '.jpeg', '.png', '.gif', '.webp']
const TEXT_COLORS = ['#111827', '#dc2626', '#2563eb', '#16a34a', '#d97706', '#7c3aed']
const FONT_SIZES = [
  { label: 'Small', px: '12px' },
  { label: 'Normal', px: '14px' },
  { label: 'Large', px: '18px' },
  { label: 'X-Large', px: '24px' },
]
let _blockId = 0
const genId = () => String(_blockId++)

// Rich text content is HTML — a cleared contentEditable can still leave a
// stray <br>, so check for actual text rather than a non-empty string.
const isTextBlockEmpty = (html: string) => html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim() === ''

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

// ── Formatting toolbar button (keeps the contentEditable's selection alive) ──
function ToolbarButton({ title, onClick, children }: { title: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onMouseDown={e => e.preventDefault()}
      onClick={onClick}
      title={title}
      className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-500 hover:bg-gray-200 hover:text-gray-800 transition-colors"
    >
      {children}
    </button>
  )
}

// ── Table row/column add-or-remove button (icon + a small +/- badge) ────────
function TableEditButton({ title, onClick, icon: Icon, action }: {
  title: string; onClick: () => void; icon: typeof Rows3; action: 'add' | 'remove'
}) {
  return (
    <button
      type="button"
      onMouseDown={e => e.preventDefault()}
      onClick={onClick}
      title={title}
      className="h-7 px-1.5 flex items-center gap-0.5 rounded-lg text-gray-500 hover:bg-gray-200 hover:text-gray-800 transition-colors"
    >
      <Icon size={13} />
      {action === 'add' ? <Plus size={10} /> : <Minus size={10} />}
    </button>
  )
}

// ── Text block editor (rich text: bold, italic, underline, size, colour, lists, table) ──
function TextEditor({ block, onChange, onDelete }: {
  block: TextBlockDraft; onChange: (v: string) => void; onDelete: () => void
}) {
  const editorRef = useRef<HTMLDivElement>(null)
  const initialized = useRef(false)
  const savedRange = useRef<Range | null>(null)
  const [insideTable, setInsideTable] = useState(false)
  const [showTableSizePicker, setShowTableSizePicker] = useState(false)
  const [tableRows, setTableRows] = useState(3)
  const [tableCols, setTableCols] = useState(3)

  // Initialize the editable DOM from the draft once; after that the DOM
  // is the source of truth so typing doesn't fight React re-renders/caret jumps.
  useEffect(() => {
    if (editorRef.current && !initialized.current) {
      editorRef.current.innerHTML = block.content
      initialized.current = true
    }
    document.execCommand('defaultParagraphSeparator', false, 'br')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Track the live selection while it's inside this editor, since opening a
  // <select> or the native colour picker steals focus and would otherwise lose it.
  // Also track whether the caret is inside a table cell, to show row/column controls.
  useEffect(() => {
    const handleSelectionChange = () => {
      const sel = window.getSelection()
      if (sel && sel.rangeCount > 0 && editorRef.current?.contains(sel.anchorNode)) {
        savedRange.current = sel.getRangeAt(0).cloneRange()
        const node = sel.anchorNode
        const el = node && (node.nodeType === Node.ELEMENT_NODE ? node as Element : node.parentElement)
        setInsideTable(Boolean(el?.closest('td, th')))
      }
    }
    document.addEventListener('selectionchange', handleSelectionChange)
    return () => document.removeEventListener('selectionchange', handleSelectionChange)
  }, [])

  const getCurrentCell = (): HTMLTableCellElement | null => {
    const node = savedRange.current?.startContainer
    if (!node) return null
    const el = node.nodeType === Node.ELEMENT_NODE ? node as Element : node.parentElement
    return (el?.closest('td, th') as HTMLTableCellElement | null) ?? null
  }

  const emitChange = () => {
    if (editorRef.current) onChange(editorRef.current.innerHTML)
  }

  const applyToSelection = (run: () => void) => {
    const editor = editorRef.current
    if (!editor) return
    editor.focus()
    const sel = window.getSelection()
    if (sel && savedRange.current) {
      sel.removeAllRanges()
      sel.addRange(savedRange.current)
    }
    run()
    emitChange()
  }

  // execCommand('bold'/'italic'/'underline') is reliable as long as styleWithCSS
  // is off — force legacy tags (<b>/<i>/<u>) so output always matches the sanitizer allow-list.
  const execLegacy = (command: string) => applyToSelection(() => {
    document.execCommand('styleWithCSS', false, 'false')
    document.execCommand(command)
  })

  const applyBold = () => execLegacy('bold')
  const applyItalic = () => execLegacy('italic')
  const applyUnderline = () => execLegacy('underline')
  const applyBulletList = () => execLegacy('insertUnorderedList')
  const applyNumberedList = () => execLegacy('insertOrderedList')

  // Font size and colour are wrapped manually with the Range API instead of
  // execCommand('fontSize'/'foreColor') — those commands emit either a legacy
  // <font> tag or a CSS <span>, depending on the current (persistent, shared)
  // styleWithCSS mode, so a size picked right after using colour (which needs
  // styleWithCSS on) could silently produce the wrong markup and never apply.
  const wrapSelectionWithStyle = (prop: 'fontSize' | 'color', value: string) => {
    const sel = window.getSelection()
    if (!sel || sel.rangeCount === 0) return
    const range = sel.getRangeAt(0)
    if (range.collapsed) return
    const span = document.createElement('span')
    span.style[prop] = value
    span.appendChild(range.extractContents())
    range.insertNode(span)
    const newRange = document.createRange()
    newRange.selectNodeContents(span)
    sel.removeAllRanges()
    sel.addRange(newRange)
  }

  const applyFontSize = (px: string) => applyToSelection(() => {
    wrapSelectionWithStyle('fontSize', px)
  })

  const applyColor = (color: string) => applyToSelection(() => {
    wrapSelectionWithStyle('color', color)
  })

  const insertTable = (rows: number, cols: number) => applyToSelection(() => {
    document.execCommand('styleWithCSS', false, 'false')
    const cell = '<td>&nbsp;</td>'
    const row = `<tr>${cell.repeat(cols)}</tr>`
    document.execCommand('insertHTML', false, `<table class="rich-table">${row.repeat(rows)}</table><br>`)
  })

  // Row/column edits act on whichever table cell the caret was last in.
  const addRowBelow = () => applyToSelection(() => {
    const cell = getCurrentCell()
    const row = cell?.parentElement as HTMLTableRowElement | null
    const table = row?.closest('table') as HTMLTableElement | null
    if (!row || !table) return
    const newRow = table.insertRow(row.rowIndex + 1)
    for (let i = 0; i < row.cells.length; i++) {
      newRow.insertCell(i).innerHTML = '&nbsp;'
    }
  })

  const deleteRow = () => applyToSelection(() => {
    const cell = getCurrentCell()
    const row = cell?.parentElement as HTMLTableRowElement | null
    const table = row?.closest('table') as HTMLTableElement | null
    if (!row || !table) return
    if (table.rows.length <= 1) {
      table.remove()
      return
    }
    table.deleteRow(row.rowIndex)
  })

  const addColumnRight = () => applyToSelection(() => {
    const cell = getCurrentCell()
    const row = cell?.parentElement as HTMLTableRowElement | null
    const table = row?.closest('table') as HTMLTableElement | null
    if (!cell || !row || !table) return
    const colIndex = cell.cellIndex
    Array.from(table.rows).forEach(r => {
      r.insertCell(colIndex + 1).innerHTML = '&nbsp;'
    })
  })

  const deleteColumn = () => applyToSelection(() => {
    const cell = getCurrentCell()
    const row = cell?.parentElement as HTMLTableRowElement | null
    const table = row?.closest('table') as HTMLTableElement | null
    if (!cell || !row || !table) return
    if (row.cells.length <= 1) {
      table.remove()
      return
    }
    const colIndex = cell.cellIndex
    Array.from(table.rows).forEach(r => {
      r.deleteCell(colIndex)
    })
  })

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

      {/* Formatting toolbar */}
      <div className="flex items-center gap-2 px-4 py-2 border-b border-gray-100 bg-gray-50 flex-wrap">
        <div className="flex items-center gap-0.5">
          <ToolbarButton title="Bold" onClick={applyBold}><Bold size={14} /></ToolbarButton>
          <ToolbarButton title="Italic" onClick={applyItalic}><Italic size={14} /></ToolbarButton>
          <ToolbarButton title="Underline" onClick={applyUnderline}><Underline size={14} /></ToolbarButton>
        </div>

        <div className="w-px h-5 bg-gray-200" />

        <div className="flex items-center gap-0.5">
          <ToolbarButton title="Bullet list" onClick={applyBulletList}><List size={14} /></ToolbarButton>
          <ToolbarButton title="Numbered list" onClick={applyNumberedList}><ListOrdered size={14} /></ToolbarButton>

          <div className="relative">
            <ToolbarButton title="Insert table" onClick={() => setShowTableSizePicker(v => !v)}>
              <TableIcon size={14} />
            </ToolbarButton>
            {showTableSizePicker && (
              <div className="absolute z-10 top-full left-0 mt-1 w-40 bg-white border border-gray-200 rounded-lg shadow-lg p-3 flex flex-col gap-2">
                <label className="flex items-center justify-between text-xs text-gray-500">
                  Rows
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={tableRows}
                    onChange={e => setTableRows(Math.min(10, Math.max(1, Number(e.target.value) || 1)))}
                    className="w-14 text-xs border border-gray-200 rounded px-1.5 py-0.5 text-gray-700 focus:outline-none"
                  />
                </label>
                <label className="flex items-center justify-between text-xs text-gray-500">
                  Columns
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={tableCols}
                    onChange={e => setTableCols(Math.min(10, Math.max(1, Number(e.target.value) || 1)))}
                    className="w-14 text-xs border border-gray-200 rounded px-1.5 py-0.5 text-gray-700 focus:outline-none"
                  />
                </label>
                <button
                  type="button"
                  onClick={() => { insertTable(tableRows, tableCols); setShowTableSizePicker(false) }}
                  className="mt-1 text-xs font-medium text-white bg-accent hover:bg-accent-hover rounded-lg py-1 transition-colors"
                >
                  Insert
                </button>
              </div>
            )}
          </div>
        </div>

        {insideTable && (
          <>
            <div className="w-px h-5 bg-gray-200" />
            <div className="flex items-center gap-0.5">
              <TableEditButton title="Insert row below" icon={Rows3} action="add" onClick={addRowBelow} />
              <TableEditButton title="Delete row" icon={Rows3} action="remove" onClick={deleteRow} />
              <TableEditButton title="Insert column right" icon={Columns3} action="add" onClick={addColumnRight} />
              <TableEditButton title="Delete column" icon={Columns3} action="remove" onClick={deleteColumn} />
            </div>
          </>
        )}

        <div className="w-px h-5 bg-gray-200" />

        <select
          defaultValue=""
          onMouseDown={() => {
            const sel = window.getSelection()
            if (sel && sel.rangeCount > 0) savedRange.current = sel.getRangeAt(0).cloneRange()
          }}
          onChange={e => {
            const px = e.target.value
            e.target.value = ''
            if (px) applyFontSize(px)
          }}
          title="Text size"
          className="text-xs rounded-lg border border-gray-200 bg-white px-1.5 py-1 text-gray-600 focus:outline-none cursor-pointer"
        >
          <option value="" disabled>Size</option>
          {FONT_SIZES.map(s => <option key={s.px} value={s.px}>{s.label}</option>)}
        </select>

        <div className="flex items-center gap-1">
          {TEXT_COLORS.map(c => (
            <button
              key={c}
              type="button"
              onMouseDown={e => e.preventDefault()}
              onClick={() => applyColor(c)}
              title={c}
              style={{ backgroundColor: c }}
              className="w-5 h-5 rounded-full border border-gray-200"
            />
          ))}
          <label
            title="Custom colour"
            className="w-5 h-5 rounded-full border border-gray-200 flex items-center justify-center cursor-pointer relative overflow-hidden"
          >
            <Palette size={11} className="text-gray-400" />
            <input
              type="color"
              onMouseDown={() => {
                const sel = window.getSelection()
                if (sel && sel.rangeCount > 0) savedRange.current = sel.getRangeAt(0).cloneRange()
              }}
              onChange={e => applyColor(e.target.value)}
              className="absolute inset-0 opacity-0 cursor-pointer"
            />
          </label>
        </div>
      </div>

      <div
        ref={editorRef}
        contentEditable
        onInput={emitChange}
        data-placeholder="Write your explanation, approach, or notes..."
        className="rich-text-input w-full px-4 py-3 text-sm text-gray-700 focus:outline-none min-h-[100px]"
        suppressContentEditableWarning
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
      <MonacoCodeEditor
        value={block.content}
        onChange={onChange}
        language={MONACO_LANGUAGE[block.language] ?? 'plaintext'}
        height="360px"
        bare
      />
    </div>
  )
}

// ── File/Image block editor ──────────────────────────────────────────
function FileEditor({ block, onDelete }: { block: FileBlockDraft; onDelete: () => void }) {
  const isImage = block.type === 'image'
  const isPdf = block.filename.toLowerCase().endsWith('.pdf')
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
      ) : isPdf ? (
        <iframe src={block.previewUrl} title={block.filename} className="w-full h-64" />
      ) : (
        <div className="px-4 py-3 flex items-center gap-2 text-sm text-gray-500">
          <Paperclip size={14} className="text-gray-400" /> {block.filename}
        </div>
      )}
    </div>
  )
}

// ── Block type picker (which types show depends on problem type) ─────
function BlockPicker({ onAddText, onAddCode, onAddFile }: {
  onAddText?: () => void; onAddCode?: () => void; onAddFile: () => void
}) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      {onAddText && (
        <button
          onClick={onAddText}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-xs font-medium text-gray-600 hover:border-accent/50 hover:text-accent transition-colors shadow-sm"
        >
          <AlignLeft size={13} /> Text
        </button>
      )}
      {onAddCode && (
        <button
          onClick={onAddCode}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-xs font-medium text-gray-600 hover:border-accent/50 hover:text-accent transition-colors shadow-sm"
        >
          <Code2 size={13} /> Code
        </button>
      )}
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

  // DSA-only: running/visualizing whichever code block is present
  const [running, setRunning] = useState(false)
  const [runResult, setRunResult] = useState<RunCodeResult | null>(null)
  const [runError, setRunError] = useState('')
  const [lastSuccessfulRun, setLastSuccessfulRun] = useState<{ code: string; language: string } | null>(null)
  const [visualizing, setVisualizing] = useState(false)
  const [traceResult, setTraceResult] = useState<TraceResult | null>(null)
  const [tracedCode, setTracedCode] = useState<string | null>(null)
  const [traceError, setTraceError] = useState('')

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

  // DSA problems are the only ones that get a code block at all (see BlockPicker
  // restriction below), so Run/Visualize just needs to find it — there's no separate
  // problemType check needed here.
  const codeBlock = blocks.find((b): b is CodeBlockDraft => b.type === 'code')

  const handleRun = async () => {
    if (!codeBlock || !codeBlock.content.trim() || running) return
    setRunning(true)
    setRunError('')
    setRunResult(null)
    try {
      const response = await executionService.run({ language: codeBlock.language, code: codeBlock.content })
      setRunResult(response.data)
      const succeeded = response.data.exitCode === 0 && !response.data.stderr && !response.data.compile?.stderr
      setLastSuccessfulRun(succeeded ? { code: codeBlock.content, language: codeBlock.language } : null)
    } catch (requestError) {
      setRunError(requestError instanceof Error ? requestError.message : 'Unable to run code')
      setLastSuccessfulRun(null)
    } finally {
      setRunning(false)
    }
  }

  const canVisualize = Boolean(
    codeBlock &&
    VISUALIZABLE_LANGUAGES.includes(codeBlock.language) &&
    lastSuccessfulRun?.code === codeBlock.content &&
    lastSuccessfulRun?.language === codeBlock.language
  )

  const handleVisualize = async () => {
    if (!codeBlock || !canVisualize || visualizing) return
    setVisualizing(true)
    setTraceError('')
    try {
      const response = await executionService.trace({ code: codeBlock.content, language: codeBlock.language })
      setTraceResult(response.data)
      setTracedCode(codeBlock.content)
    } catch (requestError) {
      setTraceError(requestError instanceof Error ? requestError.message : 'Unable to visualize code')
    } finally {
      setVisualizing(false)
    }
  }

  const submit = async () => {
    if (submitting || !detail) return
    const hasContent = blocks.some(b =>
      b.type === 'text' ? !isTextBlockEmpty(b.content) :
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
  const isDSA = problemType === 'DSA'
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
    b.type === 'text' ? !isTextBlockEmpty(b.content) :
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

      {/* Full-width stack: Problem description, then My Solution, then info row */}
      <div className="space-y-5">

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
          ) : (
            /* Multi-block solution editor — code blocks only for DSA problems */
            <div>
              <div className="flex items-center gap-2.5 mb-3">
                <div className="w-7 h-7 rounded-full bg-accent flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                  {user?.initials || 'ME'}
                </div>
                <span className="font-semibold text-gray-900">My Solution</span>
              </div>

              {isDSA && (
                <p className="mb-3 text-xs text-gray-500">DSA submissions require a code block and a screenshot or solution file.</p>
              )}

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
                      <>
                        <CodeEditor
                          block={block}
                          onChange={v => updateBlock(block.id, { content: v })}
                          onLangChange={v => updateBlock(block.id, { language: v })}
                          onDelete={() => removeBlock(block.id)}
                        />
                        {block.id === codeBlock?.id && (
                          <div className="mt-2 bg-white rounded-xl border border-gray-100 shadow-sm p-3">
                            <div className="flex items-center gap-2">
                              <Button type="button" variant="secondary" size="sm" onClick={handleRun} disabled={!block.content.trim() || running}>
                                {running ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
                                {running ? 'Running...' : 'Run Code'}
                              </Button>
                              <Button
                                type="button"
                                variant="secondary"
                                size="sm"
                                onClick={handleVisualize}
                                disabled={!canVisualize || visualizing}
                                title={
                                  !VISUALIZABLE_LANGUAGES.includes(block.language)
                                    ? `Visualization is available for ${VISUALIZABLE_LANGUAGES.join(', ')} only`
                                    : !canVisualize
                                      ? 'Run your code successfully first'
                                      : undefined
                                }
                              >
                                {visualizing ? <Loader2 size={14} className="animate-spin" /> : <Eye size={14} />}
                                {visualizing ? 'Visualizing...' : 'Visualize'}
                              </Button>
                            </div>
                            {!VISUALIZABLE_LANGUAGES.includes(block.language) && (
                              <p className="mt-2 text-xs text-gray-400">Step-by-step visualization is available for {VISUALIZABLE_LANGUAGES.join(', ')} only, for now.</p>
                            )}
                            {runError && <p className="mt-2 text-sm text-red-600">{runError}</p>}
                            {runResult && (
                              <div className="mt-3 rounded-xl overflow-hidden bg-[#1e1e2e] text-sm font-mono">
                                <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/10">
                                  <div className="flex items-center gap-1.5">
                                    <Terminal size={13} className="text-gray-400" />
                                    <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Output</span>
                                  </div>
                                  <span className="text-xs text-gray-400">
                                    {runResult.language} {runResult.version} · exit {runResult.exitCode ?? '—'}
                                  </span>
                                </div>
                                {runResult.compile?.stderr && (
                                  <pre className="px-4 pt-3 text-amber-300 whitespace-pre-wrap break-words">{runResult.compile.stderr}</pre>
                                )}
                                <pre className="px-4 py-3 text-gray-100 whitespace-pre-wrap break-words">
                                  {runResult.stdout || <span className="text-gray-500">(no output)</span>}
                                </pre>
                                {runResult.stderr && (
                                  <pre className="px-4 pb-3 text-red-400 whitespace-pre-wrap break-words">{runResult.stderr}</pre>
                                )}
                              </div>
                            )}
                            {traceError && <p className="mt-3 text-sm text-red-600">{traceError}</p>}
                            {traceResult && tracedCode === block.content && (
                              <div className="mt-3">
                                <TraceVisualizer code={block.content} trace={traceResult} language={block.language} />
                              </div>
                            )}
                          </div>
                        )}
                      </>
                    )}
                    {(block.type === 'image' || block.type === 'file') && (
                      <FileEditor
                        block={block as FileBlockDraft}
                        onDelete={() => removeBlock(block.id)}
                      />
                    )}
                  </div>
                ))}

                {/* Block picker — empty state or "Add content"; code blocks are DSA-only,
                    text blocks are for every other problem type */}
                {blocks.length === 0 ? (
                  <div className="bg-white rounded-2xl shadow-sm px-5 py-6">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Add content block</p>
                    <BlockPicker
                      onAddText={isDSA ? undefined : addTextBlock}
                      onAddCode={isDSA ? addCodeBlock : undefined}
                      onAddFile={triggerFileInput}
                    />
                  </div>
                ) : showBlockPicker ? (
                  <div className="rounded-xl border border-dashed border-accent/40 bg-accent/5 px-4 py-3">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2">Add content block</p>
                    <BlockPicker
                      onAddText={isDSA ? undefined : addTextBlock}
                      onAddCode={isDSA ? addCodeBlock : undefined}
                      onAddFile={triggerFileInput}
                    />
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

        {/* ── Info row: Problem Info / Trainer Feedback / Submit ────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">

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

          {/* Submit Solution / Submission Info */}
          <div className="space-y-4">
            {!submitted && (
              <div>
                {error && <p className="mb-3 text-sm text-red-600 bg-red-50 rounded-xl px-3 py-2">{error}</p>}
                <Button
                  onClick={submit}
                  disabled={!canSubmit}
                  className="w-full justify-center"
                >
                  <Send size={14} /> {submitting ? 'Submitting...' : 'Submit Solution'}
                </Button>
              </div>
            )}

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
    </div>
  )
}
