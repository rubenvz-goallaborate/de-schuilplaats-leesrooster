import { useState } from 'react'
import { getProgress, isDayComplete, isDayPartial } from '../lib/progress'

const MONTH_NAMES = ['Januari','Februari','Maart','April','Mei','Juni',
                     'Juli','Augustus','September','Oktober','November','December']

function getDayStatus(year: number, month: number, day: number, today: Date): 'complete' | 'partial' | 'missed' | 'today' | 'future' | 'empty' {
  const date = new Date(year, month - 1, day)
  const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate())

  if (date > todayMidnight) return 'future'

  const progress = getProgress()
  const hasEntry = progress[year]?.[month]?.[day] !== undefined

  if (date.getTime() === todayMidnight.getTime()) {
    if (isDayComplete(year, month, day)) return 'complete'
    if (isDayPartial(year, month, day)) return 'partial'
    return 'today'
  }

  // Verleden dag
  if (!hasEntry) return 'empty'
  if (isDayComplete(year, month, day)) return 'complete'
  if (isDayPartial(year, month, day)) return 'partial'
  return 'missed'
}

const STATUS_CLASSES: Record<string, string> = {
  complete: 'bg-[#5c4a2a] text-white',
  partial:  'bg-[#a0845c] text-white',
  missed:   'bg-red-500 text-white',
  today:    'border-2 border-[#5c4a2a] text-[#5c4a2a] font-bold',
  future:   'text-stone-300',
  empty:    'text-stone-300',
}

export default function CalendarScreen() {
  const now = new Date()
  const [viewYear, setViewYear] = useState(now.getFullYear())
  const [viewMonth, setViewMonth] = useState(now.getMonth() + 1)

  function prevMonth() {
    if (viewMonth === 1) { setViewMonth(12); setViewYear(y => y - 1) }
    else setViewMonth(m => m - 1)
  }

  function nextMonth() {
    if (viewMonth === 12) { setViewMonth(1); setViewYear(y => y + 1) }
    else setViewMonth(m => m + 1)
  }

  const firstDay = new Date(viewYear, viewMonth - 1, 1).getDay()
  const daysInMonth = new Date(viewYear, viewMonth, 0).getDate()
  // Zet zondag (0) naar het einde (6 = zondag in EU-indeling)
  const startOffset = firstDay === 0 ? 6 : firstDay - 1

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <button onClick={prevMonth} className="p-2 text-stone-600">‹</button>
        <h2 className="text-lg font-bold text-stone-800">
          {MONTH_NAMES[viewMonth - 1]} {viewYear}
        </h2>
        <button onClick={nextMonth} className="p-2 text-stone-600">›</button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center mb-1">
        {['Ma','Di','Wo','Do','Vr','Za','Zo'].map(d => (
          <div key={d} className="text-xs text-stone-400 py-1">{d}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1 text-center">
        {Array.from({ length: startOffset }).map((_, i) => (
          <div key={`empty-${i}`} />
        ))}
        {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
          const status = getDayStatus(viewYear, viewMonth, day, now)
          return (
            <div
              key={day}
              className={`aspect-square flex items-center justify-center rounded text-sm ${STATUS_CLASSES[status]}`}
            >
              {day}
            </div>
          )
        })}
      </div>

      <div className="mt-4 flex flex-wrap gap-3 text-xs text-stone-500">
        <span><span className="inline-block w-3 h-3 rounded bg-[#5c4a2a] mr-1" />Volledig</span>
        <span><span className="inline-block w-3 h-3 rounded bg-[#a0845c] mr-1" />Half</span>
        <span><span className="inline-block w-3 h-3 rounded bg-red-500 mr-1" />Gemist</span>
      </div>
    </div>
  )
}
