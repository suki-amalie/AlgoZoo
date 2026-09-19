import { CheckCircle2, Moon, Sparkles, Sun } from 'lucide-react'
import { useTheme, type Theme } from '../context/ThemeContext'

// ── Mini theme preview components ───────────────────────────────────

function LightPreview() {
  return (
    <div className="w-full h-20 rounded-lg overflow-hidden flex border border-gray-100" style={{ backgroundColor: '#f0f2f5' }}>
      {/* Sidebar strip */}
      <div className="w-8 h-full flex-shrink-0" style={{ backgroundColor: '#1a1f2e' }} />
      {/* Content area */}
      <div className="flex-1 p-2 flex flex-col gap-1.5">
        {/* Header bar */}
        <div className="h-3 rounded" style={{ backgroundColor: '#ffffff', border: '1px solid #e5e7eb' }} />
        {/* Card */}
        <div className="flex-1 rounded-lg p-1.5 flex flex-col gap-1" style={{ backgroundColor: '#ffffff', border: '1px solid #f3f4f6' }}>
          <div className="h-1.5 w-3/4 rounded-full" style={{ backgroundColor: '#d1d5db' }} />
          <div className="h-1.5 w-1/2 rounded-full" style={{ backgroundColor: '#e5e7eb' }} />
          <div className="h-4 w-16 rounded-lg mt-auto" style={{ backgroundColor: '#dc2626' }} />
        </div>
      </div>
    </div>
  )
}

function DarkPreview() {
  return (
    <div className="w-full h-20 rounded-lg overflow-hidden flex" style={{ backgroundColor: '#0f1117' }}>
      {/* Sidebar strip */}
      <div className="w-8 h-full flex-shrink-0" style={{ backgroundColor: '#0a0e17' }} />
      {/* Content area */}
      <div className="flex-1 p-2 flex flex-col gap-1.5">
        {/* Header bar */}
        <div className="h-3 rounded" style={{ backgroundColor: '#151c2e', border: '1px solid #232a40' }} />
        {/* Card */}
        <div className="flex-1 rounded-lg p-1.5 flex flex-col gap-1" style={{ backgroundColor: '#1a2035', border: '1px solid #232a40' }}>
          <div className="h-1.5 w-3/4 rounded-full" style={{ backgroundColor: '#374160' }} />
          <div className="h-1.5 w-1/2 rounded-full" style={{ backgroundColor: '#232a40' }} />
          <div className="h-4 w-16 rounded-lg mt-auto" style={{ backgroundColor: '#dc2626' }} />
        </div>
      </div>
    </div>
  )
}

const RAINBOW = 'linear-gradient(90deg,#f87171,#fb923c,#fbbf24,#4ade80,#60a5fa,#a78bfa,#f472b6)'

function LGBTPreview() {
  return (
    <div className="w-full h-20 rounded-lg overflow-hidden flex" style={{ backgroundColor: '#f4f0ff', border: '1px solid #e9d5ff' }}>
      {/* Sidebar strip with rainbow right edge */}
      <div className="w-8 h-full flex-shrink-0 relative" style={{ backgroundColor: '#1a1f2e' }}>
        <div className="absolute right-0 top-0 bottom-0 w-0.5" style={{ background: RAINBOW }} />
      </div>
      {/* Content area */}
      <div className="flex-1 p-2 flex flex-col gap-1.5">
        {/* Header bar */}
        <div className="h-3 rounded" style={{ backgroundColor: '#ffffff', borderBottom: '1px solid #e9d5ff' }} />
        {/* Card */}
        <div className="flex-1 rounded-lg p-1.5 flex flex-col gap-1" style={{ backgroundColor: '#ffffff' }}>
          <div className="h-1.5 w-3/4 rounded-full" style={{ backgroundColor: '#d1d5db' }} />
          <div className="h-1.5 w-1/2 rounded-full" style={{ backgroundColor: '#e9d5ff' }} />
          <div className="h-4 w-16 rounded-lg mt-auto" style={{ background: 'linear-gradient(135deg,#dc2626,#db2777,#7c3aed)' }} />
        </div>
      </div>
    </div>
  )
}

// ── Theme option config ──────────────────────────────────────────────

const THEMES: {
  value: Theme
  label: string
  description: string
  icon: React.ReactNode
  preview: React.ReactNode
  selectedBorder: string
  selectedBg: string
  checkColor: string
}[] = [
  {
    value: 'light',
    label: 'Light',
    description: 'Clean and bright',
    icon: <Sun size={16} />,
    preview: <LightPreview />,
    selectedBorder: 'border-accent',
    selectedBg: 'bg-red-50',
    checkColor: 'text-accent',
  },
  {
    value: 'dark',
    label: 'Dark',
    description: 'Easy on the eyes',
    icon: <Moon size={16} />,
    preview: <DarkPreview />,
    selectedBorder: 'border-accent',
    selectedBg: 'bg-red-50',
    checkColor: 'text-accent',
  },
  {
    value: 'lgbt',
    label: 'Pride',
    description: 'Rainbow accents',
    icon: <Sparkles size={16} />,
    preview: <LGBTPreview />,
    selectedBorder: '',
    selectedBg: '',
    checkColor: '',
  },
]

// ── Main Settings page ───────────────────────────────────────────────

export function SettingsPage() {
  const { theme, setTheme } = useTheme()

  return (
    <div>
      <div className="mb-7">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1">Preferences</p>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
      </div>

      {/* Theme section */}
      <div className="bg-white rounded-2xl shadow-sm p-6 max-w-2xl">
        <h2 className="font-semibold text-gray-900 mb-1">Appearance</h2>
        <p className="text-sm text-gray-500 mb-5">Choose how AlgoZoo looks to you.</p>

        <div className="grid grid-cols-3 gap-3">
          {THEMES.map((t) => {
            const isSelected = theme === t.value
            return (
              <button
                key={t.value}
                onClick={() => setTheme(t.value)}
                className={`relative text-left rounded-xl border-2 p-3 transition-all focus:outline-none ${
                  isSelected
                    ? t.value === 'lgbt'
                      ? 'border-transparent'
                      : 'border-accent bg-red-50/50'
                    : 'border-gray-100 hover:border-gray-200'
                }`}
                style={
                  isSelected && t.value === 'lgbt'
                    ? { borderImage: RAINBOW + ' 1', borderWidth: '2px', borderStyle: 'solid' }
                    : {}
                }
              >
                {/* Selected checkmark */}
                {isSelected && (
                  <div
                    className={`absolute top-2 right-2 ${t.value === 'lgbt' ? '' : 'text-accent'}`}
                    style={t.value === 'lgbt' ? { color: '#7c3aed' } : {}}
                  >
                    <CheckCircle2 size={16} />
                  </div>
                )}

                {/* Preview */}
                <div className="mb-3">
                  {t.preview}
                </div>

                {/* Icon + Name */}
                <div className="flex items-center gap-1.5">
                  <span
                    className={isSelected && t.value !== 'lgbt' ? 'text-accent' : 'text-gray-400'}
                    style={isSelected && t.value === 'lgbt' ? { color: '#7c3aed' } : {}}
                  >
                    {t.icon}
                  </span>
                  <span className={`text-sm font-semibold ${isSelected ? 'text-gray-900' : 'text-gray-700'}`}>
                    {t.label}
                  </span>
                </div>
                <p className="text-xs text-gray-400 mt-0.5">{t.description}</p>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
