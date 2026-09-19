import { api } from './api'
import type { BackendProblemType, Difficulty, Problem, ProblemDetailResponse, ProblemDraft, ProblemListResponse } from '../types/problem'

const typeToUi: Record<BackendProblemType, Problem['type']> = { DSA: 'DSA', OS: 'OS', DB: 'Database', OTHER: 'Other' }
const typeToBackend: Record<Problem['type'], BackendProblemType> = { DSA: 'DSA', OS: 'OS', Database: 'DB', Other: 'OTHER' }
const difficultyToUi = (value: 'Easy' | 'Medium' | 'Hard' | null): Difficulty | null => value === 'Easy' ? 'easy' : value === 'Hard' ? 'hard' : value === 'Medium' ? 'medium' : null
const difficultyToBackend = (value: Difficulty) => value === 'easy' ? 'Easy' : value === 'hard' ? 'Hard' : 'Medium'
let resourceId = 1

function normalize(item: ProblemDetailResponse['data'] | ProblemListResponse['data'][number]): Problem {
  return {
    id: item.problem_id,
    title: item.title,
    type: typeToUi[item.problemType],
    difficulty: difficultyToUi(item.difficulty),
    description: 'description' in item ? item.description || '' : '',
    resources: 'problemUrl' in item && item.problemUrl ? [{ id: resourceId++, label: 'Link', url: item.problemUrl }] : [],
    resource_url: 'problemUrl' in item ? item.problemUrl : undefined,
  }
}

export function mapProblemType(value: string | null | undefined): Problem['type'] {
  return typeToUi[value as BackendProblemType] || 'Other'
}

export async function listProblems(params?: { search?: string; difficulty?: Difficulty }) {
  const query = new URLSearchParams()
  if (params?.search) query.set('search', params.search)
  if (params?.difficulty) query.set('difficulty', difficultyToBackend(params.difficulty))
  const suffix = query.toString() ? `?${query}` : ''
  const response = await api.get<ProblemListResponse>(`/problems${suffix}`)
  return response.data.map(normalize)
}

export async function getProblemDetail(id: string) {
  return normalize((await api.get<ProblemDetailResponse>(`/problems/${id}`)).data)
}

function toPayload(draft: ProblemDraft) {
  return { title: draft.title, description: draft.description, problemType: typeToBackend[draft.type], difficulty: draft.type === 'DSA' && draft.difficulty ? difficultyToBackend(draft.difficulty) : null, problemUrl: draft.resources[0]?.url || undefined }
}

export async function createProblem(draft: ProblemDraft) {
  return normalize((await api.post<ProblemDetailResponse>('/problems', toPayload(draft))).data)
}

export async function updateProblem(id: string, draft: ProblemDraft) {
  return normalize((await api.patch<ProblemDetailResponse>(`/problems/${id}`, toPayload(draft))).data)
}

export async function deleteProblem(id: string) {
  await api.delete(`/problems/${id}`)
}
