import type { Screen } from '../types'

type Props = {
  active: Screen
  onChange: (screen: Screen) => void
}

const tabs: { id: Screen; label: string; icon: string }[] = [
  { id: 'today',    label: 'Vandaag',      icon: '📖' },
  { id: 'calendar', label: 'Kalender',     icon: '📅' },
  { id: 'settings', label: 'Instellingen', icon: '⚙️' },
]

export default function BottomNav({ active, onChange }: Props) {
  return (
    <nav className="flex border-t border-stone-200 bg-white">
      {tabs.map(tab => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          aria-current={active === tab.id ? 'page' : undefined}
          className={`flex-1 flex flex-col items-center py-3 text-xs gap-1 transition-colors ${
            active === tab.id
              ? 'text-[#5c4a2a] font-semibold'
              : 'text-stone-400'
          }`}
        >
          <span className="text-xl" aria-hidden="true">{tab.icon}</span>
          {tab.label}
        </button>
      ))}
    </nav>
  )
}
