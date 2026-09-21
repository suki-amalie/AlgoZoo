import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export function DashboardPage() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  return (
    <main className="min-h-screen bg-[#f4f5f7] flex items-center justify-center px-4">
      <section className="bg-white rounded-2xl shadow-xl w-full max-w-md p-10 text-center">
        <img src="/logo.png" alt="AlgoZoo" className="w-12 h-12 rounded-xl object-cover mx-auto mb-5" />
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Login successful</h1>
        <p className="text-gray-500 mb-1">Welcome, {user?.name || 'User'}.</p>
        <p className="text-sm text-gray-400 capitalize mb-8">{user?.role || 'user'} account</p>
        <button
          type="button"
          onClick={handleLogout}
          className="w-full bg-accent hover:bg-accent-hover text-white font-semibold py-3 rounded-xl transition-colors"
        >
          Log out
        </button>
      </section>
    </main>
  )
}
