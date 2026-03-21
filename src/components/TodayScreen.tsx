import { useState, useEffect, useCallback } from 'react'
import { REFERENCE_YEAR } from '../config'
import { getActiveYear, getActiveTrack, getReadingsForDay } from '../lib/schedule'
import { getDayProgress, setReadingComplete } from '../lib/progress'
import { calculateStreak } from '../lib/streak'
import ReadingItem from './ReadingItem'

type PendingDay = {
  year: number
  month: number
  day: number
  readings: [string, string]
  progress: [string | null, string | null]
  isCatchup: boolean
}

const MONTH_NAMES = ['jan','feb','mrt','apr','mei','jun','jul','aug','sep','okt','nov','dec']
const DAY_NAMES = ['zondag','maandag','dinsdag','woensdag','donderdag','vrijdag','zaterdag']

export default function TodayScreen() {
  const [pendingDays, setPendingDays] = useState<PendingDay[]>([])
  const [streak, setStreak] = useState(0)
  const today = new Date()

  const buildPendingList = useCallback(() => {
    const year = today.getFullYear()
    const activeYear = getActiveYear(year, REFERENCE_YEAR)
    const track = getActiveTrack(activeYear)
    const days: PendingDay[] = []

    // Ophaallijst: 1 jan t/m gisteren, alleen als er een entry bestaat maar niet compleet
    const startOfYear = new Date(REFERENCE_YEAR, 0, 1)
    const yesterday = new Date(today)
    yesterday.setDate(today.getDate() - 1)

    const current = new Date(startOfYear)
    while (current <= yesterday) {
      const m = current.getMonth() + 1
      const d = current.getDate()
      const prog = getDayProgress(year, m, d)
      if (prog[0] !== null || prog[1] !== null) {
        // Entry bestaat — check of volledig
        if (prog[0] === null || prog[1] === null) {
          const readings = getReadingsForDay(m, d, track)
          if (readings) {
            days.push({ year, month: m, day: d, readings, progress: prog, isCatchup: true })
          }
        }
      }
      current.setDate(current.getDate() + 1)
    }

    // Vandaag
    const todayMonth = today.getMonth() + 1
    const todayDay = today.getDate()
    const todayReadings = getReadingsForDay(todayMonth, todayDay, track)
    const todayProgress = getDayProgress(year, todayMonth, todayDay)
    if (todayReadings && (todayProgress[0] === null || todayProgress[1] === null)) {
      days.push({
        year,
        month: todayMonth,
        day: todayDay,
        readings: todayReadings,
        progress: todayProgress,
        isCatchup: false,
      })
    }

    setPendingDays(days)
    setStreak(calculateStreak(today))
  }, [])

  useEffect(() => { buildPendingList() }, [buildPendingList])

  function handleToggle(dayIndex: number, readingIndex: 0 | 1) {
    const d = pendingDays[dayIndex]
    setReadingComplete(d.year, d.month, d.day, readingIndex)
    buildPendingList()
  }

  const totalPending = pendingDays.reduce((sum, d) => {
    return sum + (d.progress[0] === null ? 1 : 0) + (d.progress[1] === null ? 1 : 0)
  }, 0)

  const year = today.getFullYear()
  const activeYear = getActiveYear(year, REFERENCE_YEAR)
  const track = getActiveTrack(activeYear)
  const trackLabel = track === 'family' ? 'Familie' : 'Geheim'

  return (
    <div className="p-4">
      <div className="mb-4">
        <p className="text-xs text-stone-400 uppercase tracking-wide">
          {DAY_NAMES[today.getDay()]} {today.getDate()} {MONTH_NAMES[today.getMonth()]} · Jaar {activeYear} · {trackLabel}
        </p>
        <div className="flex items-center gap-2 mt-1">
          <h1 className="text-2xl font-bold text-stone-800">Vandaag</h1>
          {totalPending > 0 && (
            <span className="bg-red-600 text-white text-xs font-bold rounded-full px-2 py-0.5">
              {totalPending}
            </span>
          )}
        </div>
      </div>

      {pendingDays.length === 0 ? (
        <div className="text-center py-12 text-stone-400">
          <div className="text-4xl mb-2">✅</div>
          <p className="font-medium">Alles gelezen voor vandaag!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {pendingDays.map((d, dayIndex) => (
            <div key={`${d.month}-${d.day}`}>
              {d.isCatchup && (
                <p className="text-xs font-bold text-red-500 uppercase tracking-wide mb-2">
                  Inhalen — {d.day} {MONTH_NAMES[d.month - 1]}
                </p>
              )}
              {!d.isCatchup && (
                <p className="text-xs font-bold text-[#5c4a2a] uppercase tracking-wide mb-2">
                  Vandaag — {d.day} {MONTH_NAMES[d.month - 1]}
                </p>
              )}
              <div className="space-y-2">
                {d.readings.map((reading, readingIndex) => (
                  <ReadingItem
                    key={readingIndex}
                    reading={reading}
                    index={readingIndex}
                    isComplete={d.progress[readingIndex as 0 | 1] !== null}
                    isCatchup={d.isCatchup}
                    onToggle={(i) => handleToggle(dayIndex, i as 0 | 1)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {streak > 0 && (
        <div className="mt-6 bg-green-50 rounded-lg p-3 text-center">
          <p className="text-sm font-semibold text-green-700">🔥 {streak} {streak === 1 ? 'dag' : 'dagen'} op rij gelezen</p>
        </div>
      )}
    </div>
  )
}
