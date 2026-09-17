export type AdminClassStatus = 'Active' | 'Unactive' | 'Archived'

export type AdminClass = {
  id: string
  name: string
  description: string
  status: AdminClassStatus
  dateRange: string
  studentsCount: number
  problemsCount: number
  trainer: string
  progress: number
}

export type ClassStudent = {
  id: string
  name: string
  username: string
  email?: string
}

export type ClassTrainer = {
  id: string
  name: string
  username: string
  email?: string
  role?: string
}

const STORAGE_CLASSES_KEY = 'algozoo_admin_classes_data'
const STORAGE_STUDENTS_KEY = 'algozoo_admin_class_students'
const STORAGE_TRAINERS_KEY = 'algozoo_admin_class_trainers_v2'

const DEFAULT_CLASSES: AdminClass[] = [
  {
    id: 'wecamp-15',
    name: 'WeCamp Batch 15',
    description: 'A software engineering class for WeCamp Batch 15 students',
    status: 'Active',
    dateRange: 'Jan 15, 2025 — Mar 30, 2025',
    studentsCount: 24,
    problemsCount: 35,
    trainer: 'Nguyen Van Hung',
    progress: 62,
  },
  {
    id: 'starcamp-2',
    name: 'StarCamp Batch 2',
    description: 'A software engineering class for StarCamp Batch 2 students',
    status: 'Active',
    dateRange: 'Feb 1, 2025 — Apr 15, 2025',
    studentsCount: 18,
    problemsCount: 28,
    trainer: 'Tran Thi Mai',
    progress: 45,
  },
  {
    id: 'wecamp-14',
    name: 'WeCamp Batch 14',
    description: 'A software engineering class for WeCamp Batch 14 students',
    status: 'Active',
    dateRange: 'Sep 1, 2024 — Nov 30, 2024',
    studentsCount: 22,
    problemsCount: 30,
    trainer: 'Le Van An',
    progress: 88,
  },
  {
    id: 'starcamp-1',
    name: 'StarCamp Batch 1',
    description: 'A software engineering class for StarCamp Batch 1 students',
    status: 'Archived',
    dateRange: 'Jun 1, 2024 — Dec 20, 2024',
    studentsCount: 20,
    problemsCount: 25,
    trainer: 'Pham Thi Huong',
    progress: 100,
  },
  {
    id: 'wecamp-21',
    name: 'WeCamp Batch 21',
    description: 'NAB WeCamp Batch 21',
    status: 'Active',
    dateRange: 'Jan 10, 2026 — Apr 30, 2026',
    studentsCount: 4,
    problemsCount: 20,
    trainer: 'Nguyen Van Hung',
    progress: 30,
  },
]

const DEFAULT_STUDENTS: Record<string, ClassStudent[]> = {
  'wecamp-21': [
    { id: 'cs-1', name: 'Alice Nguyen', username: '@alice123', email: 'alice.nguyen@example.com' },
    { id: 'cs-2', name: 'Bob Tran', username: '@bob_t', email: 'bob.tran@example.com' },
    { id: 'cs-3', name: 'Sarah Lee', username: '@sarah_lee', email: 'sarah.lee@example.com' },
    { id: 'cs-4', name: 'Minh Pham', username: '@minh_p', email: 'minh.pham@example.com' },
  ],
  'wecamp-15': [
    { id: 'cs-1', name: 'Alice Nguyen', username: '@alice123', email: 'alice.nguyen@example.com' },
    { id: 'cs-2', name: 'Bob Tran', username: '@bob_t', email: 'bob.tran@example.com' },
    { id: 'cs-3', name: 'Sarah Lee', username: '@sarah_lee', email: 'sarah.lee@example.com' },
    { id: 'cs-4', name: 'Minh Pham', username: '@minh_p', email: 'minh.pham@example.com' },
    { id: 'cs-5', name: 'Kim Nguyen', username: '@kim_ng', email: 'kim.ng@example.com' },
  ],
}

const DEFAULT_TRAINERS: Record<string, ClassTrainer[]> = {
  'wecamp-21': [
    { id: 'ct-1', name: 'Alex Nguyen', username: '@alexn', email: 'alex.nguyen@algozoo.edu' },
    { id: 'ct-2', name: 'Sarah Tran', username: '@sarah_tran', email: 'sarah.tran@algozoo.edu' },
  ],
  'wecamp-15': [
    { id: 'ct-3', name: 'Nguyen Van Hung', username: '@hung_nv', email: 'hung.nv@algozoo.edu' },
  ],
}

// ── Event Bus ──
export function notifyAdminStoreUpdated() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('algozoo_admin_store_updated'))
  }
}

// ── Classes API ──
export function getAllAdminClasses(): AdminClass[] {
  if (typeof window === 'undefined') return DEFAULT_CLASSES
  try {
    const raw = localStorage.getItem(STORAGE_CLASSES_KEY)
    if (!raw) {
      localStorage.setItem(STORAGE_CLASSES_KEY, JSON.stringify(DEFAULT_CLASSES))
      return DEFAULT_CLASSES
    }
    return JSON.parse(raw)
  } catch {
    return DEFAULT_CLASSES
  }
}

export function getAdminClassById(id: string): AdminClass | undefined {
  const list = getAllAdminClasses()
  return list.find((c) => c.id === id || c.id === id.toLowerCase().replace(/\s+/g, '-'))
}

export function createAdminClass(data: { name: string; description: string }): AdminClass {
  const classes = getAllAdminClasses()
  const slug = data.name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-') || `class-${Date.now()}`
  
  // Format dates: current month to 2 months later
  const now = new Date()
  const later = new Date(now)
  later.setMonth(now.getMonth() + 2)
  const formatDate = (d: Date) => d.toISOString().split('T')[0]
  const dateRange = `${formatDate(now)} — ${formatDate(later)}`

  const newClass: AdminClass = {
    id: slug,
    name: data.name.trim(),
    description: data.description.trim() || `A software engineering class for ${data.name} students`,
    status: 'Active',
    dateRange: dateRange,
    studentsCount: 0,
    problemsCount: 0,
    trainer: 'Tran Thi Mai',
    progress: 0,
  }

  const updated = [newClass, ...classes]
  try {
    localStorage.setItem(STORAGE_CLASSES_KEY, JSON.stringify(updated))
  } catch (e) {
    console.error(e)
  }
  notifyAdminStoreUpdated()
  return newClass
}

export function updateAdminClass(id: string, updates: Partial<AdminClass>): AdminClass | null {
  const classes = getAllAdminClasses()
  const idx = classes.findIndex((c) => c.id === id)
  if (idx === -1) return null

  const updatedClass = { ...classes[idx], ...updates }
  classes[idx] = updatedClass
  try {
    localStorage.setItem(STORAGE_CLASSES_KEY, JSON.stringify(classes))
  } catch (e) {
    console.error(e)
  }
  notifyAdminStoreUpdated()
  return updatedClass
}

export function deleteAdminClass(id: string): boolean {
  const classes = getAllAdminClasses()
  const filtered = classes.filter((c) => c.id !== id)
  try {
    localStorage.setItem(STORAGE_CLASSES_KEY, JSON.stringify(filtered))
  } catch (e) {
    console.error(e)
  }
  notifyAdminStoreUpdated()
  return true
}

// ── Students API ──
export function getClassStudents(classId: string): ClassStudent[] {
  if (typeof window === 'undefined') return DEFAULT_STUDENTS[classId] || DEFAULT_STUDENTS['wecamp-21'] || []
  try {
    const raw = localStorage.getItem(STORAGE_STUDENTS_KEY)
    const map: Record<string, ClassStudent[]> = raw ? JSON.parse(raw) : DEFAULT_STUDENTS
    return map[classId] || DEFAULT_STUDENTS[classId] || DEFAULT_STUDENTS['wecamp-21'] || []
  } catch {
    return DEFAULT_STUDENTS[classId] || DEFAULT_STUDENTS['wecamp-21'] || []
  }
}

export function removeStudentFromClass(classId: string, studentId: string): void {
  try {
    const raw = localStorage.getItem(STORAGE_STUDENTS_KEY)
    const map: Record<string, ClassStudent[]> = raw ? JSON.parse(raw) : { ...DEFAULT_STUDENTS }
    const currentList = map[classId] || DEFAULT_STUDENTS[classId] || DEFAULT_STUDENTS['wecamp-21'] || []
    const filtered = currentList.filter((s) => s.id !== studentId)
    map[classId] = filtered
    localStorage.setItem(STORAGE_STUDENTS_KEY, JSON.stringify(map))

    // Also decrement student count in class
    const cls = getAdminClassById(classId)
    if (cls && cls.studentsCount > 0) {
      updateAdminClass(classId, { studentsCount: Math.max(0, cls.studentsCount - 1) })
    }
  } catch (e) {
    console.error(e)
  }
  notifyAdminStoreUpdated()
}

export function addStudentToClass(classId: string, student: { name: string; username: string; email?: string }): void {
  try {
    const raw = localStorage.getItem(STORAGE_STUDENTS_KEY)
    const map: Record<string, ClassStudent[]> = raw ? JSON.parse(raw) : { ...DEFAULT_STUDENTS }
    const currentList = map[classId] || DEFAULT_STUDENTS[classId] || DEFAULT_STUDENTS['wecamp-21'] || []
    const newStudent: ClassStudent = {
      id: `cs-${Date.now()}`,
      name: student.name,
      username: student.username.startsWith('@') ? student.username : `@${student.username}`,
      email: student.email || `${student.name.toLowerCase().replace(/\s+/g, '.')}@example.com`,
    }
    map[classId] = [...currentList, newStudent]
    localStorage.setItem(STORAGE_STUDENTS_KEY, JSON.stringify(map))

    // Update class count
    const cls = getAdminClassById(classId)
    if (cls) {
      updateAdminClass(classId, { studentsCount: cls.studentsCount + 1 })
    }
  } catch (e) {
    console.error(e)
  }
  notifyAdminStoreUpdated()
}

// ── Trainers API ──
export function getClassTrainers(classId: string): ClassTrainer[] {
  if (typeof window === 'undefined') return DEFAULT_TRAINERS[classId] || DEFAULT_TRAINERS['wecamp-21'] || []
  try {
    const raw = localStorage.getItem(STORAGE_TRAINERS_KEY)
    const map: Record<string, ClassTrainer[]> = raw ? JSON.parse(raw) : DEFAULT_TRAINERS
    return map[classId] || DEFAULT_TRAINERS[classId] || DEFAULT_TRAINERS['wecamp-21'] || []
  } catch {
    return DEFAULT_TRAINERS[classId] || DEFAULT_TRAINERS['wecamp-21'] || []
  }
}

export function removeTrainerFromClass(classId: string, trainerId: string): void {
  try {
    const raw = localStorage.getItem(STORAGE_TRAINERS_KEY)
    const map: Record<string, ClassTrainer[]> = raw ? JSON.parse(raw) : { ...DEFAULT_TRAINERS }
    const currentList = map[classId] || DEFAULT_TRAINERS[classId] || DEFAULT_TRAINERS['wecamp-21'] || []
    const filtered = currentList.filter((t) => t.id !== trainerId)
    map[classId] = filtered
    localStorage.setItem(STORAGE_TRAINERS_KEY, JSON.stringify(map))
  } catch (e) {
    console.error(e)
  }
  notifyAdminStoreUpdated()
}
