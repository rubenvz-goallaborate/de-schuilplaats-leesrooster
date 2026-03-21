import { readingPlan } from '../data/readingPlan'
import type { ActiveTrack } from '../types'

export function getActiveYear(currentYear: number, referenceYear: number): 1 | 2 {
  return ((currentYear - referenceYear) % 2 + 2) % 2 === 0 ? 1 : 2
}

export function getActiveTrack(activeYear: 1 | 2): ActiveTrack {
  return activeYear === 1 ? 'family' : 'secret'
}

export function getReadingsForDay(
  month: number,
  day: number,
  track: ActiveTrack
): [string, string] | null {
  const dayData = readingPlan[String(month)]?.[String(day)]
  if (!dayData) return null
  return dayData[track]
}

export function getTodayReadings(referenceYear: number, date: Date = new Date()): [string, string] | null {
  const year = date.getFullYear()
  const month = date.getMonth() + 1
  const day = date.getDate()
  const activeYear = getActiveYear(year, referenceYear)
  const track = getActiveTrack(activeYear)
  return getReadingsForDay(month, day, track)
}
