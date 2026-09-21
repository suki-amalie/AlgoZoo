import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'

export function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [searchParams] = useSearchParams()
  const inviteToken = searchParams.get('token') || undefined
  const { login } = useAuth()
  const navigate = useNavigate()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const user = await login(email, password, inviteToken)

      if (user.role === 'admin') navigate('/admin/dashboard')
      else if (user.role === 'trainer') navigate('/trainer/dashboard')
      else navigate('/student/dashboard')
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Login failed')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex h-screen bg-[#f4f5f7]">
      {/* Left */}
      <div className="w-1/2 flex flex-col justify-center px-20 bg-white">
        <div className="max-w-sm w-full mx-auto">
          <h1 className="font-bold text-3xl text-gray-900 mb-1">Welcome back</h1>
          <p className="text-gray-400 text-sm mb-8">Sign in to your account to continue</p>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm bg-gray-50 focus:outline-none focus:border-accent/60 focus:bg-white transition-colors"
                placeholder="you@example.com"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm bg-gray-50 focus:outline-none focus:border-accent/60 focus:bg-white transition-colors"
                placeholder="••••••••"
              />
            </div>
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-accent hover:bg-accent-hover disabled:opacity-60 text-white font-semibold py-3 rounded-xl transition-colors mt-2"
            >
              {isSubmitting ? 'Logging in...' : 'Login'}
            </button>
          </form>
        </div>
      </div>

      {/* Right */}
      <div className="w-1/2 bg-sidebar flex flex-col items-center justify-center p-16 relative overflow-hidden">
        <div className="absolute -top-20 -right-20 w-80 h-80 rounded-full bg-white/5" />
        <div className="absolute -bottom-32 -left-16 w-96 h-96 rounded-full bg-accent/20" />
        <div className="relative text-center">
          <img src="/logo.png" alt="AlgoZoo" className="w-48 h-48 rounded-3xl object-cover mx-auto mb-5" />
          <p className="font-bold text-7xl text-white mb-3 leading-none">AlgoZoo</p>
          <p className="text-gray-400 text-lg font-light mb-6">See code, see flow.</p>
          <p className="text-gray-500 text-sm max-w-xs mx-auto leading-relaxed">
            A class-based assignment platform — Admin creates classes, Trainers assign problems, Students submit solutions.
          </p>
        </div>
      </div>
    </div>
  )
}
