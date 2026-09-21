export interface RunCodeRequest {
  language: string
  code: string
  stdin?: string
}

export interface RunCodeCompileResult {
  stdout: string
  stderr: string
  exitCode: number | null
}

export interface RunCodeResult {
  language: string
  version: string
  stdout: string
  stderr: string
  output: string
  exitCode: number | null
  signal: string | null
  compile: RunCodeCompileResult | null
}

export interface RunCodeResponse {
  status: string
  data: RunCodeResult
}

export interface TraceCodeRequest {
  code: string
  language: string
  stdin?: string
}

export type TraceValue =
  | { kind: 'value'; value: string | number | boolean | null }
  | { kind: 'ref'; id: string }
  | { kind: 'undefined' }
  | { kind: 'uninitialized' }

export interface TraceFrame {
  fn: string
  line: number
  vars: [string, TraceValue][]
}

export type TraceHeapEntry =
  | { type: 'list' | 'tuple' | 'set'; items: TraceValue[] }
  | { type: 'dict'; items: [TraceValue, TraceValue][] }
  | { type: string; fields: [string, TraceValue][] }
  | { type: string; repr: string }

export interface TraceStep {
  line: number
  event: 'call' | 'line' | 'return'
  frames: TraceFrame[]
  heap: Record<string, TraceHeapEntry>
}

export interface TraceError {
  type: string
  message: string
  line: number | null
}

export interface TraceResult {
  steps: TraceStep[]
  stdout: string
  truncated: boolean
  error: TraceError | null
}

export interface TraceCodeResponse {
  status: string
  data: TraceResult
}
