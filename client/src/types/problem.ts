export type ProblemType = 'DSA' | 'OS' | 'Database' | 'Other'
export type Difficulty = 'easy' | 'medium' | 'hard'
export type ProblemDifficulty = 'Easy' | 'Medium' | 'Hard'

export type Resource = { id: number; label: string; url: string; filename?: string }
export type ProblemDraft = { title: string; type: ProblemType; difficulty: Difficulty | null; description: string; resources: Resource[] }
export type Problem = { id: string; title: string; type: ProblemType; difficulty: Difficulty | null; description: string; resources: Resource[]; resource_url?: string }

export type BackendProblemType = 'OS' | 'DB' | 'DSA' | 'OTHER'
export interface ProblemListItem { problem_id: string; title: string; difficulty: ProblemDifficulty | null; problemType: BackendProblemType; created_by: string }
export interface ProblemListResponse { status: string; message: string; total: number; data: ProblemListItem[] }
export interface ProblemDetailResponse { status: string; message: string; data: { problem_id: string; title: string; description?: string; difficulty: ProblemDifficulty | null; problemType: BackendProblemType; problemUrl?: string; created_by: string } }
export interface CreateProblemRequest { title: string; description?: string; problemType: BackendProblemType; difficulty?: ProblemDifficulty | null; problemUrl?: string }
export interface CreateProblemResponse extends ProblemDetailResponse {}
export interface UpdateProblemRequest extends Partial<CreateProblemRequest> {}
export interface UpdateProblemResponse extends ProblemDetailResponse {}
export interface DeleteProblemResponse { status: string; message: string }
