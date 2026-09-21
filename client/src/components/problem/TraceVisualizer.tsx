import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, ChevronLeft, ChevronRight, Info, Maximize2, Minimize2, Pause, Play, Terminal } from 'lucide-react'
import type { TraceFrame, TraceHeapEntry, TraceResult, TraceValue } from '../../types/execution'

interface TraceVisualizerProps {
  code: string
  trace: TraceResult
  language: string
}

const ROW_H = 22
const HEADER_H = 24
const FRAME_X = 16
const FRAME_W = 220
const FRAME_GAP = 14
const BOX_W = 170
const BOX_GAP_X = 36
const BOX_GAP_Y = 36
const MAX_HEAP_COLS = 3
const HEAP_ORIGIN_X = FRAME_X + FRAME_W + 60
const HEAP_ORIGIN_Y = 20
const MAX_ROWS_SHOWN = 5
const PLAY_INTERVAL_MS = 700

function formatPrimitive(value: string | number | boolean | null, language: string): string {
  const isPython = language === 'Python'
  if (value === null) return isPython ? 'None' : 'null'
  if (typeof value === 'boolean') {
    if (!isPython) return String(value)
    return value ? 'True' : 'False'
  }
  if (typeof value === 'string') {
    const quoted = `'${value}'`
    return quoted.length > 22 ? quoted.slice(0, 20) + "...'" : quoted
  }
  return String(value)
}

// Only values were ever truncated — a long variable/attribute name (e.g.
// lengthOfLongestSubstring) rendered at full length, wide enough on its own to run
// into a right-aligned value no matter how short that value is. Cap names too.
function truncateName(name: string, max = 14): string {
  return name.length > max ? name.slice(0, max - 1) + '…' : name
}

interface HeapRow {
  label: string
  value: TraceValue | null
  text?: string
}

function formatValue(v: TraceValue, language: string): string {
  if (v.kind === 'undefined') return 'undefined'
  if (v.kind === 'uninitialized') return 'uninitialized'
  return v.kind === 'value' ? formatPrimitive(v.value, language) : '<ref>'
}

function heapEntryRows(entry: TraceHeapEntry, language: string): HeapRow[] {
  let rows: HeapRow[]
  if ('fields' in entry) {
    rows = entry.fields.map(([name, v]) => ({ label: name, value: v }))
  } else if ('items' in entry && entry.type === 'dict') {
    const dictItems = entry.items as [TraceValue, TraceValue][]
    rows = dictItems.map(([k, v]) => ({ label: formatValue(k, language), value: v }))
  } else if ('items' in entry) {
    const listItems = entry.items as TraceValue[]
    rows = listItems.map((v, i) => ({ label: String(i), value: v }))
  } else {
    rows = [{ label: '', value: null, text: entry.repr }]
  }
  if (rows.length > MAX_ROWS_SHOWN) {
    const shown = rows.slice(0, MAX_ROWS_SHOWN - 1)
    shown.push({ label: '', value: null, text: `+${rows.length - (MAX_ROWS_SHOWN - 1)} more` })
    return shown
  }
  return rows
}

function curvePath(p1: { x: number; y: number }, p2: { x: number; y: number }): string {
  const dx = Math.max(36, Math.abs(p2.x - p1.x) * 0.35)
  const dir = p2.x >= p1.x ? 1 : -1
  const c1x = p1.x + dx * dir
  const c2x = p2.x - dx * dir
  return `M ${p1.x} ${p1.y} C ${c1x} ${p1.y}, ${c2x} ${p2.y}, ${p2.x} ${p2.y}`
}

function TraceBanners({ trace }: { trace: TraceResult }) {
  return (
    <>
      {trace.error && (
        <div className="flex items-start gap-2 rounded-xl bg-red-50 px-3 py-2.5 text-sm text-red-700">
          <AlertTriangle size={15} className="flex-none mt-0.5" />
          <span>
            {trace.error.type}: {trace.error.message}
            {trace.error.line ? ` (line ${trace.error.line})` : ''}
          </span>
        </div>
      )}
      {trace.truncated && (
        <div className="flex items-start gap-2 rounded-xl bg-amber-50 px-3 py-2.5 text-sm text-amber-700">
          <Info size={15} className="flex-none mt-0.5" />
          <span>The trace was stopped early (too many steps to fully visualize) — showing what ran before the cutoff.</span>
        </div>
      )}
    </>
  )
}

export function TraceVisualizer({ code, trace, language }: TraceVisualizerProps) {
  const [stepIndex, setStepIndex] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [expanded, setExpanded] = useState(false)

  const codeLines = useMemo(() => code.split('\n'), [code])
  const steps = trace.steps

  // Reserving a fixed 3-column grid regardless of how many heap objects actually exist
  // wastes width on simple traces (e.g. just a list and a dict), shrinking everything more
  // than necessary once scaled to fit the container. Size the grid to what's actually there.
  const totalHeapObjects = useMemo(() => {
    const ids = new Set<string>()
    for (const step of steps) {
      for (const id of Object.keys(step.heap)) ids.add(id)
    }
    return ids.size
  }, [steps])
  const heapCols = Math.max(1, Math.min(MAX_HEAP_COLS, totalHeapObjects))

  // Stable heap layout: each object id gets a permanent grid slot the first time it appears,
  // so boxes never move once placed even as later steps add/remove reachable objects.
  const heapLayout = useMemo(() => {
    const layout: Record<string, { col: number; row: number }> = {}
    let index = 0
    for (const step of steps) {
      for (const id of Object.keys(step.heap)) {
        if (!(id in layout)) {
          layout[id] = { col: index % heapCols, row: Math.floor(index / heapCols) }
          index += 1
        }
      }
    }
    return layout
  }, [steps, heapCols])

  const boxHeight = HEADER_H + MAX_ROWS_SHOWN * ROW_H
  const heapGridRows = Math.max(1, Math.ceil(totalHeapObjects / heapCols))
  const heapGridHeight = heapGridRows * boxHeight + (heapGridRows - 1) * BOX_GAP_Y

  const maxFrameColumnHeight = useMemo(() => {
    let max = 0
    for (const step of steps) {
      let y = 0
      for (const frame of step.frames) {
        y += HEADER_H + Math.max(1, frame.vars.length) * ROW_H + FRAME_GAP
      }
      if (y > max) max = y
    }
    return max
  }, [steps])

  const viewBoxWidth = HEAP_ORIGIN_X + heapCols * BOX_W + (heapCols - 1) * BOX_GAP_X + 20
  const viewBoxHeight = Math.max(maxFrameColumnHeight, heapGridHeight, 160) + 20

  useEffect(() => {
    if (!playing) return
    const id = setInterval(() => {
      setStepIndex((i) => {
        if (i >= steps.length - 1) {
          setPlaying(false)
          return i
        }
        return i + 1
      })
    }, PLAY_INTERVAL_MS)
    return () => clearInterval(id)
  }, [playing, steps.length])

  useEffect(() => {
    if (!expanded) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setExpanded(false)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [expanded])

  if (!steps.length) {
    return <TraceBanners trace={trace} />
  }

  const step = steps[Math.min(stepIndex, steps.length - 1)]

  function boxPos(id: string) {
    const slot = heapLayout[id]
    if (!slot) return { x: HEAP_ORIGIN_X, y: HEAP_ORIGIN_Y }
    return {
      x: HEAP_ORIGIN_X + slot.col * (BOX_W + BOX_GAP_X),
      y: HEAP_ORIGIN_Y + slot.row * (boxHeight + BOX_GAP_Y),
    }
  }

  function heapAnchor(id: string, fromX: number) {
    const pos = boxPos(id)
    const midY = pos.y + boxHeight / 2
    if (fromX < pos.x) return { x: pos.x, y: midY }
    if (fromX > pos.x + BOX_W) return { x: pos.x + BOX_W, y: midY }
    return { x: pos.x + BOX_W / 2, y: pos.y }
  }

  // Build frame boxes (top to bottom = call order) and collect arrow specs as we go.
  const frameEls: React.ReactNode[] = []
  const arrows: { d: string }[] = []
  let cursorY = 0

  step.frames.forEach((frame: TraceFrame, fi: number) => {
    const rowCount = Math.max(1, frame.vars.length)
    const height = HEADER_H + rowCount * ROW_H
    const y = cursorY
    const isActive = fi === step.frames.length - 1

    frameEls.push(
      <g key={`frame-${fi}`}>
        <rect x={FRAME_X} y={y} width={FRAME_W} height={height} rx={10} fill={isActive ? '#ecebfd' : 'white'} stroke={isActive ? '#5750e8' : '#e5e7eb'} />
        <text x={FRAME_X + 10} y={y + 16} fontSize={12} fontWeight={700} fill="#6b7280" letterSpacing="0.03em">
          {frame.fn.toUpperCase()}
        </text>
        <line x1={FRAME_X} y1={y + HEADER_H} x2={FRAME_X + FRAME_W} y2={y + HEADER_H} stroke="#e5e7eb" />
        {frame.vars.length === 0 ? (
          <text x={FRAME_X + 12} y={y + HEADER_H + 16} fontSize={12.5} fontStyle="italic" fill="#9ca3af">
            no locals
          </text>
        ) : (
          frame.vars.map(([name, v], vi) => {
            const rowY = y + HEADER_H + vi * ROW_H
            const midY = rowY + ROW_H / 2 + 4
            if (v.kind === 'ref') {
              const src = { x: FRAME_X + FRAME_W, y: rowY + ROW_H / 2 }
              const dst = heapAnchor(v.id, src.x)
              arrows.push({ d: curvePath(src, dst) })
            }
            return (
              <g key={name}>
                <text x={FRAME_X + 12} y={midY} fontSize={13.5} fill="#374151">
                  <title>{name}</title>
                  {truncateName(name)}
                </text>
                {v.kind === 'ref' ? (
                  <circle cx={FRAME_X + FRAME_W - 10} cy={rowY + ROW_H / 2} r={3} fill="#5750e8" />
                ) : (
                  <text x={FRAME_X + FRAME_W - 12} y={midY} fontSize={12.5} fill="#9ca3af" textAnchor="end" fontStyle="italic">
                    {formatValue(v, language)}
                  </text>
                )}
                {vi > 0 && <line x1={FRAME_X} y1={rowY} x2={FRAME_X + FRAME_W} y2={rowY} stroke="#f3f4f6" />}
              </g>
            )
          })
        )}
      </g>
    )
    cursorY += height + FRAME_GAP
  })

  const heapEls: React.ReactNode[] = []
  Object.entries(step.heap).forEach(([id, entry]) => {
    const pos = boxPos(id)
    const rows = heapEntryRows(entry, language)
    const height = HEADER_H + rows.length * ROW_H
    const col = heapLayout[id]?.col ?? 0

    heapEls.push(
      <g key={id}>
        <rect x={pos.x} y={pos.y} width={BOX_W} height={height} rx={10} fill="#f8f9fb" stroke="#e5e7eb" />
        <text x={pos.x + 10} y={pos.y + 16} fontSize={11} fontWeight={700} fill="#9ca3af" letterSpacing="0.03em">
          {entry.type.toUpperCase()}
        </text>
        <line x1={pos.x} y1={pos.y + HEADER_H} x2={pos.x + BOX_W} y2={pos.y + HEADER_H} stroke="#e5e7eb" />
        {rows.map((row, ri) => {
          const rowY = pos.y + HEADER_H + ri * ROW_H
          const midY = rowY + ROW_H / 2 + 4

          if (row.text !== undefined) {
            return (
              <text key={ri} x={pos.x + 10} y={midY} fontSize={12} fill="#9ca3af" fontStyle="italic">
                {row.text}
              </text>
            )
          }

          const isRef = row.value?.kind === 'ref'
          const targetCol = isRef ? heapLayout[(row.value as { id: string }).id]?.col ?? col : col
          const exitLeft = isRef && targetCol < col

          if (isRef) {
            const src = exitLeft ? { x: pos.x, y: rowY + ROW_H / 2 } : { x: pos.x + BOX_W, y: rowY + ROW_H / 2 }
            const dst = heapAnchor((row.value as { id: string }).id, src.x)
            arrows.push({ d: curvePath(src, dst) })
          }

          return (
            <g key={ri}>
              <text x={pos.x + 10} y={midY} fontSize={12.5} fill="#374151">
                <title>{row.label}</title>
                {truncateName(row.label)}
              </text>
              {isRef ? (
                <circle cx={exitLeft ? pos.x + 6 : pos.x + BOX_W - 6} cy={rowY + ROW_H / 2} r={3} fill="#5750e8" />
              ) : row.value ? (
                <text x={pos.x + BOX_W - 10} y={midY} fontSize={12} fill="#9ca3af" textAnchor="end" fontStyle="italic">
                  {formatValue(row.value, language)}
                </text>
              ) : null}
            </g>
          )
        })}
      </g>
    )
  })

  const eventTag = step.event === 'call' ? '→ call' : step.event === 'return' ? '← return' : ''

  const diagramSvg = (
    <svg viewBox={`0 0 ${viewBoxWidth} ${viewBoxHeight}`} className="w-full" style={{ minWidth: 480 }}>
      <defs>
        <marker id="tv-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M0 0 L10 5 L0 10 z" fill="#5750e8" />
        </marker>
      </defs>
      <g>{frameEls}</g>
      <g>{heapEls}</g>
      <g fill="none" stroke="#5750e8" strokeWidth={1.6}>
        {arrows.map((a, i) => (
          <path key={i} d={a.d} markerEnd="url(#tv-arrow)" />
        ))}
      </g>
    </svg>
  )

  return (
    <div className="space-y-3">
      <TraceBanners trace={trace} />

      <div className="grid lg:grid-cols-2 gap-3 items-start">
      <div className="lg:order-2 bg-[#1e1e2e] rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/10">
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Code</span>
          <span className="text-xs text-gray-400">{eventTag}</span>
        </div>
        <div className="py-1 max-h-[520px] overflow-y-auto">
          {codeLines.map((line, i) => {
            const lineNo = i + 1
            const active = lineNo === step.line
            return (
              <div key={i} className={`flex gap-3 px-4 py-1 border-l-2 ${active ? 'bg-accent/20 border-accent' : 'border-transparent'}`}>
                <span className="text-gray-500 text-sm w-6 text-right flex-none font-mono">{lineNo}</span>
                <span className="text-gray-100 text-sm font-mono whitespace-pre">{line || ' '}</span>
              </div>
            )
          })}
        </div>
      </div>

      <div className="lg:order-1 lg:col-span-2 bg-white rounded-xl shadow-sm p-3 flex items-center gap-3">
        <button
          type="button"
          onClick={() => {
            setPlaying(false)
            setStepIndex((i) => Math.max(0, i - 1))
          }}
          disabled={stepIndex === 0}
          className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center disabled:opacity-40 hover:border-accent/60"
        >
          <ChevronLeft size={15} />
        </button>
        <button
          type="button"
          onClick={() => setPlaying((p) => !p)}
          className="w-9 h-9 rounded-lg bg-accent text-white flex items-center justify-center hover:bg-accent-hover"
        >
          {playing ? <Pause size={15} /> : <Play size={15} />}
        </button>
        <button
          type="button"
          onClick={() => {
            setPlaying(false)
            setStepIndex((i) => Math.min(steps.length - 1, i + 1))
          }}
          disabled={stepIndex === steps.length - 1}
          className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center disabled:opacity-40 hover:border-accent/60"
        >
          <ChevronRight size={15} />
        </button>
        <input
          type="range"
          min={0}
          max={steps.length - 1}
          value={stepIndex}
          onChange={(e) => {
            setPlaying(false)
            setStepIndex(parseInt(e.target.value, 10))
          }}
          className="flex-1 accent-accent"
        />
        <span className="text-xs text-gray-400 font-mono flex-none">
          Step {stepIndex + 1} / {steps.length}
        </span>
      </div>

      <div className="lg:order-3 bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-100">
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Memory</span>
          <button
            type="button"
            onClick={() => setExpanded(true)}
            title="Expand"
            className="text-gray-400 hover:text-accent transition-colors"
          >
            <Maximize2 size={14} />
          </button>
        </div>
        <div className="p-3 overflow-x-auto">{diagramSvg}</div>
      </div>
      </div>

      {expanded && (
        <div
          className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-6"
          onClick={() => setExpanded(false)}
        >
          <div
            className="bg-white rounded-xl shadow-xl w-full h-full max-w-6xl overflow-auto p-4"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-semibold text-gray-700">
                Memory — Step {stepIndex + 1} / {steps.length}
              </span>
              <button
                type="button"
                onClick={() => setExpanded(false)}
                title="Close"
                className="text-gray-400 hover:text-accent transition-colors"
              >
                <Minimize2 size={16} />
              </button>
            </div>
            {diagramSvg}
          </div>
        </div>
      )}

      <div className="bg-[#1e1e2e] rounded-xl overflow-hidden">
        <div className="flex items-center gap-1.5 px-4 py-2.5 border-b border-white/10">
          <Terminal size={13} className="text-gray-400" />
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Final stdout</span>
        </div>
        <pre className="px-4 py-3 text-xs text-gray-100 font-mono whitespace-pre-wrap">
          {trace.stdout || <span className="text-gray-500 italic">(no output)</span>}
        </pre>
      </div>
    </div>
  )
}
