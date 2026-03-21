import { STORAGE_KEYS } from '../config'
import type { ProgressStore, DayProgress } from '../types'

export function getProgress(): ProgressStore {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.progress)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

function saveProgress(progress: ProgressStore): void {
  localStorage.setItem(STORAGE_KEYS.progress, JSON.stringify(progress))
}

export function getDayProgress(year: number, month: number, day: number): DayProgress {
  const progress = getProgress()
  return progress[year]?.[month]?.[day] ?? [null, null]
}

export function setReadingComplete(year: number, month: number, day: number, index: 0 | 1): void {
  const progress = getProgress()
  if (!progress[year]) progress[year] = {}
  if (!progress[year][month]) progress[year][month] = {}
  if (!progress[year][month][day]) progress[year][month][day] = [null, null]

  // Niet overschrijven als al afgevinkt
  if (progress[year][month][day][index] === null) {
    progress[year][month][day][index] = new Date().toISOString()
  }
  saveProgress(progress)
}

export function unsetReadingComplete(year: number, month: number, day: number, index: 0 | 1): void {
  const progress = getProgress()
  if (!progress[year]?.[month]?.[day]) return
  progress[year][month][day][index] = null
  saveProgress(progress)
}

export function isDayComplete(year: number, month: number, day: number): boolean {
  const [r1, r2] = getDayProgress(year, month, day)
  return r1 !== null && r2 !== null
}

export function isDayPartial(year: number, month: number, day: number): boolean {
  const [r1, r2] = getDayProgress(year, month, day)
  const count = (r1 !== null ? 1 : 0) + (r2 !== null ? 1 : 0)
  return count === 1
}

// Geeft true als een lezing on-time was (timestamp van dezelfde kalenderdag als gepland)
export function isReadingOnTime(
  timestamp: string,
  year: number,
  month: number,
  day: number
): boolean {
  const d = new Date(timestamp)
  return (
    d.getFullYear() === year &&
    d.getMonth() + 1 === month &&
    d.getDate() === day
  )
}

export function isDayCompleteOnTime(year: number, month: number, day: number): boolean {
  const [r1, r2] = getDayProgress(year, month, day)
  if (r1 === null || r2 === null) return false
  return (
    isReadingOnTime(r1, year, month, day) &&
    isReadingOnTime(r2, year, month, day)
  )
}
