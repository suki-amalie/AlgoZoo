import { api } from './api'

import type {
  RunCodeRequest,
  RunCodeResponse,
  TraceCodeRequest,
  TraceCodeResponse,
} from '../types/execution'

export const executionService = {
  run: (data: RunCodeRequest) =>
    api.post<RunCodeResponse>(
      '/execution/run',
      data
    ),

  trace: (data: TraceCodeRequest) =>
    api.post<TraceCodeResponse>(
      '/execution/trace',
      data
    ),
}
