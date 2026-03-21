import { describe, it, expect } from 'vitest'
import { getActiveYear, getActiveTrack, getReadingsForDay, getTodayReadings } from '../../src/lib/schedule'

describe('getActiveYear', () => {
  it('returns 1 for the reference year', () => {
    expect(getActiveYear(2025, 2025)).toBe(1)
  })
  it('returns 2 for one year after reference', () => {
    expect(getActiveYear(2026, 2025)).toBe(2)
  })
  it('cycles back to 1 after year 2', () => {
    expect(getActiveYear(2027, 2025)).toBe(1)
  })
  it('returns 2 for one year before reference', () => {
    expect(getActiveYear(2024, 2025)).toBe(2)
  })
})

describe('getActiveTrack', () => {
  it('returns family for year 1', () => {
    expect(getActiveTrack(1)).toBe('family')
  })
  it('returns secret for year 2', () => {
    expect(getActiveTrack(2)).toBe('secret')
  })
})

describe('getReadingsForDay', () => {
  it('returns the correct readings for January 1 family track', () => {
    const result = getReadingsForDay(1, 1, 'family')
    expect(result).toEqual(['Genesis 1', 'Matthew 1'])
  })
  it('returns the correct readings for January 1 secret track', () => {
    const result = getReadingsForDay(1, 1, 'secret')
    expect(result).toEqual(['Ezra 1', 'Acts 1'])
  })
  it('returns null for an invalid date', () => {
    expect(getReadingsForDay(2, 30, 'family')).toBeNull()
  })
})

describe('getTodayReadings', () => {
  it('returns readings for a specific date', () => {
    // 2026 is Year 2 (secret track). March 21 secret: Proverbs 8, Ephesians 1
    const result = getTodayReadings(2025, new Date(2026, 2, 21))
    expect(result).toEqual(['Proverbs 8', 'Ephesians 1'])
  })
})
