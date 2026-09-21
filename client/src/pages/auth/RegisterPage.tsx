import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { CheckCircle2 } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import type { Role } from '../../types/auth'

export function RegisterPage({ forcedRole }: { forcedRole?: Role }) {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') || ''
  const role = forcedRole || (searchParams.get('role') as Role) || 'student'
  const [form, setForm] = useState({ fullname: '', email: '', password: '', confirmPassword: '' })
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  const { register } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError('')

    if (!token) {
      setError('This invitation link is missing its token.')
      return
    }
    if (form.password.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }
    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    try {
      await register(token, form.fullname, form.email, form.password)
      setDone(true)
    } catch (registrationError) {
      setError(registrationError instanceof Error ? registrationError.message : 'Registration failed')
    }
  }

  if (done) {
    return (
      <div className="min-h-screen bg-[#f4f5f7] flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-xl p-10 w-full max-w-md text-center">
          <CheckCircle2 size={48} className="text-green-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">You&apos;re in!</h1>
          <p className="text-gray-500 mb-6">Your {role} account has been created and you joined the class.</p>
          <button
            onClick={() => navigate('/login')}
            className="w-full bg-accent hover:bg-accent-hover text-white font-semibold py-3 rounded-xl transition-colors"
          >
            Continue to Login
          </button>
        </div>
      </div>
    )
  }

  if (!token) {
    return (
      <div className="min-h-screen bg-[#f4f5f7] flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-xl p-10 w-full max-w-md text-center">
          <h1 className="text-xl font-bold text-gray-900 mb-2">Invitation required</h1>
          <p className="text-sm text-gray-500 mb-6">Registration is available only through an invitation link from an administrator.</p>
          <a href="/login" className="text-accent font-semibold hover:underline">Log in instead</a>
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
          <h1 className="text-xl font-bold text-gray-900 mb-1">Join as a {role}</h1>
          <p className="text-sm text-gray-500">Use your existing account credentials or create a new account to join this class.</p>
        </div>

        <form onSubmit={handleSubmit} className="px-8 py-6 space-y-4">
          <Field label="Full name">
            <input required value={form.fullname} onChange={(event) => setForm({ ...form, fullname: event.target.value })} placeholder="Alice Nguyen" className={inputCls} />
          </Field>
          <Field label="Email">
            <input required type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} placeholder="alice@example.com" className={inputCls} />
          </Field>
          <Field label="Password">
            <input required type="password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} placeholder="At least 6 characters" className={inputCls} />
          </Field>
          <Field label="Confirm password">
            <input required type="password" value={form.confirmPassword} onChange={(event) => setForm({ ...form, confirmPassword: event.target.value })} placeholder="Repeat your password" className={inputCls} />
          </Field>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button type="submit" className="w-full bg-accent hover:bg-accent-hover text-white font-semibold py-3 rounded-xl transition-colors mt-2">
            Create Account & Join Class
          </button>
        </form>

        <div className="px-8 pb-6 text-center">
          <p className="text-xs text-gray-400">Already have an account? <a href={`/login?token=${encodeURIComponent(token)}`} className="text-accent font-semibold hover:underline">Log in and join instead</a></p>
        </div>
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">{label}</label>
      {children}
    </div>
  )
}

const inputCls = 'w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm bg-gray-50 focus:outline-none focus:border-accent/60'
