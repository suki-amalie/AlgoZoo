export type ProblemStatus = 'not-started' | 'pending' | 'reviewed'

export type ContentBlock =
  | { id: string; type: 'text'; content: string }
  | { id: string; type: 'code'; language: string; content: string }
  | { id: string; type: 'image'; file?: File | null; preview: string; name?: string }

export type SubmissionRecord = {
  id: number
  problem: string
  problemId: number
  problemDescription: string
  constraints: string[]
  examples: { input: string; output: string }[]
  resourceUrl: string
  class: string
  type: string
  submittedAt: string
  status: 'Reviewed' | 'Pending'
  solution: ContentBlock[]
  feedback?: {
    trainer: string
    trainerInitials: string
    date: string
    text: string
  }
}

const STORAGE_SUBMISSIONS_KEY = 'algozoo_student_submissions_list'
const STORAGE_SUBMISSION_DATA_KEY = 'algozoo_submission_details'

const DEFAULT_SUBMISSION_IDS = ['1', '2']

const DEFAULT_SUBMISSIONS: Record<string, SubmissionRecord> = {
  '1': {
    id: 1,
    problemId: 1,
    problem: 'Two Sum',
    type: 'DSA',
    problemDescription:
      'Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.\n\nYou may assume that each input would have exactly one solution, and you may not use the same element twice.',
    constraints: ['2 ≤ nums.length ≤ 10⁴', '-10⁹ ≤ nums[i] ≤ 10⁹', 'Only one valid answer exists'],
    examples: [
      { input: 'nums = [2,7,11,15], target = 9', output: '[0,1]' },
      { input: 'nums = [3,2,4], target = 6', output: '[1,2]' },
    ],
    resourceUrl: 'https://leetcode.com/problems/two-sum/',
    class: 'WeCamp Batch 22',
    submittedAt: 'Sep 10, 2026 at 4:32 PM',
    status: 'Reviewed',
    solution: [
      {
        id: 's1-1',
        type: 'text',
        content:
          'My approach is to use a hash map to store previously seen numbers. For each number, I check if the complement (target - current) already exists in the map. This gives O(n) time complexity.',
      },
      {
        id: 's1-2',
        type: 'code',
        language: 'Python',
        content:
          'def two_sum(nums, target):\n    seen = {}\n    for i, num in enumerate(nums):\n        complement = target - num\n        if complement in seen:\n            return [seen[complement], i]\n        seen[num] = i\n    return []',
      },
    ],
    feedback: {
      trainer: 'Alex Nguyen',
      trainerInitials: 'AN',
      date: 'Sep 15, 2026',
      text: 'Great use of hash map for O(n) solution! The code is clean and readable. Consider adding a comment about the time/space complexity trade-off. Well done!',
    },
  },
  '2': {
    id: 2,
    problemId: 2,
    problem: 'Binary Search',
    type: 'DSA',
    problemDescription:
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
    class: 'WeCamp Batch 22',
    submittedAt: 'Sep 14, 2026 at 2:15 PM',
    status: 'Pending',
    solution: [
      {
        id: 's2-1',
        type: 'text',
        content:
          'I implemented binary search using left/right pointers, narrowing the range until the target is found or the range is empty.',
      },
      {
        id: 's2-2',
        type: 'code',
        language: 'Python',
        content:
          'def binary_search(nums, target):\n    left, right = 0, len(nums) - 1\n    while left <= right:\n        mid = (left + right) // 2\n        if nums[mid] == target:\n            return mid\n        elif nums[mid] < target:\n            left = mid + 1\n        else:\n            right = mid - 1\n    return -1',
      },
    ],
  },
  '3': {
    id: 3,
    problemId: 3,
    problem: 'Reverse Linked List',
    type: 'DSA',
    problemDescription:
      'Given the head of a singly linked list, reverse the list, and return the reversed list.',
    constraints: ['The number of nodes in the list is the range [0, 5000]', '-5000 ≤ Node.val ≤ 5000'],
    examples: [{ input: 'head = [1,2,3,4,5]', output: '[5,4,3,2,1]' }],
    resourceUrl: 'https://leetcode.com/problems/reverse-linked-list/',
    class: 'WeCamp Batch 22',
    submittedAt: 'Sep 17, 2026 at 8:15 AM',
    status: 'Pending',
    solution: [
      {
        id: 's3-1',
        type: 'text',
        content:
          'Use the two-pointer approach. Start from the head and reverse each node by changing it',
      },
      {
        id: 's3-2',
        type: 'code',
        language: 'Python',
        content:
          'def reverse_list(head):\n    prev = None\n    curr = head\n\n    while curr:\n        next_node = curr.next\n        curr.next = prev\n        prev = curr\n        curr = next_node\n\n    return prev',
      },
      {
        id: 's3-3',
        type: 'image',
        preview: '/leetcode_submission_sample.png',
        name: 'leetcode_submission.png',
      },
    ],
  },
}

export function getSubmittedProblemIds(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_SUBMISSIONS_KEY)
    if (raw) return JSON.parse(raw)
  } catch {
    // fallback
  }
  return DEFAULT_SUBMISSION_IDS
}

export function isProblemSubmitted(problemId: number | string): boolean {
  const ids = getSubmittedProblemIds()
  return ids.includes(String(problemId))
}

export function getProblemStatus(problemId: number | string): ProblemStatus {
  const strId = String(problemId)
  if (strId === '1') return 'reviewed'
  if (isProblemSubmitted(strId)) return 'pending'
  return 'not-started'
}

export function getSubmissionsMap(): Record<string, SubmissionRecord> {
  try {
    const raw = localStorage.getItem(STORAGE_SUBMISSION_DATA_KEY)
    if (raw) {
      return { ...DEFAULT_SUBMISSIONS, ...JSON.parse(raw) }
    }
  } catch {
    // fallback
  }
  return DEFAULT_SUBMISSIONS
}

export function getSubmissionById(id: string | number): SubmissionRecord | undefined {
  const all = getSubmissionsMap()
  return all[String(id)]
}

export function submitProblem(
  problemId: number | string,
  data: {
    title: string
    description: string
    constraints: string[]
    examples: { input: string; output: string }[]
    resourceUrl: string
    topic?: string
    blocks: ContentBlock[]
  }
): void {
  const strId = String(problemId)
  const currentIds = getSubmittedProblemIds()
  if (!currentIds.includes(strId)) {
    const nextIds = [...currentIds, strId]
    localStorage.setItem(STORAGE_SUBMISSIONS_KEY, JSON.stringify(nextIds))
  }

  const all = getSubmissionsMap()
  all[strId] = {
    id: Number(strId),
    problemId: Number(strId),
    problem: data.title,
    type: data.topic || 'DSA',
    problemDescription: data.description,
    constraints: data.constraints,
    examples: data.examples,
    resourceUrl: data.resourceUrl,
    class: 'WeCamp Batch 22',
    submittedAt: 'Just now',
    status: 'Pending',
    solution: data.blocks,
  }

  try {
    localStorage.setItem(STORAGE_SUBMISSION_DATA_KEY, JSON.stringify(all))
    window.dispatchEvent(new Event('algozoo_store_updated'))
  } catch (err) {
    console.error('Failed to save submission:', err)
  }
}
