import { Link } from 'react-router-dom'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Badge } from '../ui/Badge'

type Crumb = { label: string; to?: string }

interface ClassTabNavProps {
  crumbs: Crumb[]
  title: string
  status?: 'ACTIVE' | 'INACTIVE'
  tabs: { label: string; to: string }[]
}

export function ClassTabNav({ crumbs, title, status, tabs }: ClassTabNavProps) {
  // Determine active tab from current path
  const currentPath = window.location.pathname

  return (
    <div className="mb-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-sm mb-3 flex-wrap">
        <Link to={crumbs[0]?.to ?? '#'} className="flex items-center gap-1 text-gray-400 hover:text-accent">
          <ChevronLeft size={15} />
          {crumbs[0]?.label}
        </Link>
        {crumbs.slice(1).map((c, i) => (
          <span key={i} className="flex items-center gap-1.5">
            <ChevronRight size={13} className="text-gray-300" />
            {c.to ? (
              <Link to={c.to} className="text-gray-400 hover:text-accent">{c.label}</Link>
            ) : (
              <span className="text-gray-700 font-medium">{c.label}</span>
            )}
          </span>
        ))}
      </div>

      {/* Title + status */}
      <div className="flex items-center gap-3 mb-4">
        <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
        {status && <Badge variant={status}>{status === 'ACTIVE' ? 'Active' : 'Inactive'}</Badge>}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200">
        {tabs.map((tab) => {
          const isActive = currentPath === tab.to
          return (
            <Link
              key={tab.to}
              to={tab.to}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
                isActive
                  ? 'border-accent text-accent'
                  : 'border-transparent text-gray-500 hover:text-gray-800'
              }`}
            >
              {tab.label}
            </Link>
          )
        })}
      </div>
    </div>
  )
}
