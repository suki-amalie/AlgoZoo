import { useState } from 'react'
import { Bell } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { useNotifications } from '../../context/NotificationContext'
import { NotificationDropdown } from '../ui/NotificationDropdown'

export function TopHeader() {
  const { user } = useAuth()
  const { getUnreadCount, refetch } = useNotifications()
  const [dropdownOpen, setDropdownOpen] = useState(false)
  if (!user) return null
  const unread = getUnreadCount()

  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-end px-6 sticky top-0 z-10 flex-shrink-0">
      <div className="flex items-center gap-4">
        {/* Notification bell */}
        <div className="relative">
          <button
            onClick={() => {
              setDropdownOpen((v) => !v)
              if (!dropdownOpen) refetch()
            }}
            className="relative w-9 h-9 flex items-center justify-center rounded-xl hover:bg-gray-100 transition-colors"
            aria-label="Notifications"
          >
            <Bell size={18} className="text-gray-500" />
            {unread > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[17px] h-[17px] flex items-center justify-center bg-accent text-white text-[10px] font-bold rounded-full px-1 leading-none">
                {unread > 99 ? '99+' : unread}
              </span>
            )}
          </button>
          {dropdownOpen && (
            <NotificationDropdown onClose={() => setDropdownOpen(false)} />
          )}
        </div>
      </div>
    </header>
  )
}
