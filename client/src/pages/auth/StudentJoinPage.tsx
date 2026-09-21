import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { CheckCircle2 } from 'lucide-react'

const classInfo = {
  name: 'WeCamp Batch 21',
}

export function StudentJoinPage() {
  const [form, setForm] = useState({ name: '', email: '', username: '', password: '', confirmPassword: '' })
  const [done, setDone] = useState(false)
  const [errors, setErrors] = useState<Partial<typeof form>>({})
  const { setRole } = useAuth()
  const navigate = useNavigate()

  const validate = () => {
    const e: Partial<typeof form> = {}
    if (!form.name.trim()) e.name = 'Name is required'
    if (!form.email.trim()) e.email = 'Email is required'
    if (!form.username.trim()) e.username = 'Username is required'
    if (!form.password) e.password = 'Password is required'
    if (form.password !== form.confirmPassword) e.confirmPassword = 'Passwords do not match'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    setDone(true)
  }

  const handleContinue = () => {
    setRole('student')
    navigate('/student/dashboard')
  }

  if (done) {
    return (
      <div className="min-h-screen bg-[#f4f5f7] flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-xl p-10 w-full max-w-md text-center">
          <CheckCircle2 size={48} className="text-green-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">You're in!</h2>
          <p className="text-gray-500 mb-6">
            Your account has been created and you've joined <strong>{classInfo.name}</strong>.
          </p>
          <button
            onClick={handleContinue}
            className="w-full bg-accent hover:bg-accent-hover text-white font-semibold py-3 rounded-xl transition-colors"
          >
            Go to My Dashboard
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#f4f5f7] flex items-center justify-center py-12 px-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="px-8 pt-8 pb-6 border-b border-gray-100">
          <div className="flex items-center gap-3 mb-5">
            <img src="/logo.png" alt="AlgoZoo" className="w-9 h-9 rounded-xl object-cover" />
            <span className="font-bold text-lg text-gray-900">AlgoZoo</span>
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-1">Join {classInfo.name}</h1>
          <p className="text-sm text-gray-500">
            You are joining: <strong className="text-gray-800">{classInfo.name}</strong>
          </p>
        </div>

        <form onSubmit={handleSubmit} className="px-8 py-6 space-y-4">
          <Field label="Name" error={errors.name}>
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Alice Nguyen"
              className={inputCls(!!errors.name)}
            />
          </Field>
          <Field label="Email" error={errors.email}>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="alice@gmail.com"
              className={inputCls(!!errors.email)}
            />
          </Field>
          <Field label="Username" error={errors.username}>
            <input
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
              placeholder="alice123"
              className={inputCls(!!errors.username)}
            />
          </Field>
          <Field label="Password" error={errors.password}>
            <input
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder="••••••••"
              className={inputCls(!!errors.password)}
            />
          </Field>
          <Field label="Confirm Password" error={errors.confirmPassword}>
            <input
              type="password"
              value={form.confirmPassword}
              onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
              placeholder="••••••••"
              className={inputCls(!!errors.confirmPassword)}
            />
          </Field>
          <button
            type="submit"
            className="w-full bg-accent hover:bg-accent-hover text-white font-semibold py-3 rounded-xl transition-colors mt-2"
          >
            Create Account & Join Class
          </button>
        </form>

        <div className="px-8 pb-6 text-center">
          <p className="text-xs text-gray-400">
            Already have an account?{' '}
            <a href="/login" className="text-accent font-semibold hover:underline">Log in instead</a>
          </p>
        </div>
      </div>
    </div>
  )
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">{label}</label>
      {children}
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  )
}

function inputCls(hasError: boolean) {
  return `w-full border rounded-xl px-4 py-2.5 text-sm bg-gray-50 focus:outline-none ${
    hasError ? 'border-red-300 focus:border-red-400' : 'border-gray-200 focus:border-accent/60'
  }`
}
