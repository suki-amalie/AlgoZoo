import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  BookOpen,
  Library,
  FileText,
  Users,
  Settings,
  LogOut,
} from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'

interface NavItem {
  to: string
  icon: React.ReactNode
  label: string
}

function getNavItems(role: string): NavItem[] {
  if (role === 'student') {
    return [
      { to: '/student/dashboard', icon: <LayoutDashboard size={17} />, label: 'Dashboard' },
      { to: '/student/classes', icon: <BookOpen size={17} />, label: 'My Classes' },
      { to: '/student/submissions', icon: <FileText size={17} />, label: 'My Submissions' },
    ]
  }
  if (role === 'trainer') {
    return [
      { to: '/trainer/dashboard', icon: <LayoutDashboard size={17} />, label: 'Dashboard' },
      { to: '/trainer/classes', icon: <BookOpen size={17} />, label: 'My Classes' },
      { to: '/trainer/problems', icon: <Library size={17} />, label: 'Problem Bank' },
    ]
  }
  // admin
  return [
    { to: '/admin/dashboard', icon: <LayoutDashboard size={17} />, label: 'Dashboard' },
    { to: '/admin/classes', icon: <BookOpen size={17} />, label: 'Classes' },
    { to: '/admin/users', icon: <Users size={17} />, label: 'Users' },
  ]
}

export function Sidebar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  if (!user) return null
  const navItems = getNavItems(user.role)

  return (
    <div className="fixed left-0 top-0 h-screen w-[220px] bg-sidebar flex flex-col z-20">
      {/* User info */}
      <div className="px-5 pt-5 pb-4 flex-shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-full bg-accent flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
            {user.initials}
          </div>
          <div className="min-w-0">
            <p className="text-white text-sm font-semibold truncate leading-tight">{user.name}</p>
            <p className="text-gray-400 text-[11px] capitalize">{user.role}</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-2 space-y-0.5 overflow-y-auto">
        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest px-3 pb-1 pt-1">Menu</p>
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                isActive
                  ? 'bg-accent text-white'
                  : 'text-gray-400 hover:bg-white/5 hover:text-white'
              }`
            }
          >
            {item.icon}
            {item.label}
          </NavLink>
        ))}

        <div className="pt-2">
          <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest px-3 pb-1">General</p>
          <button
            onClick={() => navigate('/settings')}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium text-gray-400 hover:bg-white/5 hover:text-white transition-all"
          >
            <Settings size={17} /> Settings
          </button>
        </div>
      </nav>

      {/* Footer */}
      <div className="border-t border-white/10 pt-2 pb-4 flex-shrink-0">
        <div className="px-3 mt-1">
          <button
            onClick={() => { logout(); navigate('/login') }}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm text-gray-400 hover:bg-white/5 hover:text-white transition-all"
          >
            <LogOut size={16} /> Log Out
          </button>
        </div>
      </div>
    </div>
  )
}
