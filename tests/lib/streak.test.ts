import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { calculateStreak } from '../../src/lib/streak'
import { setReadingComplete } from '../../src/lib/progress'
import { mockLocalStorage } from '../testUtils'

beforeEach(() => {
  vi.stubGlobal('localStorage', mockLocalStorage())
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

// Helper: voltooi beide lezingen op een specifieke dag (simuleert on-time afvinken)
function completeDayOnTime(year: number, month: number, day: number) {
  vi.setSystemTime(new Date(year, month - 1, day, 9, 0, 0))
  setReadingComplete(year, month, day, 0)
  setReadingComplete(year, month, day, 1)
}

describe('calculateStreak', () => {
  it('returns 0 with no progress', () => {
    expect(calculateStreak(new Date(2026, 2, 21))).toBe(0)
  })

  it('returns 1 when only today is complete on time', () => {
    completeDayOnTime(2026, 3, 21)
    expect(calculateStreak(new Date(2026, 2, 21))).toBe(1)
  })

  it('returns 0 when today is not complete but yesterday was', () => {
    completeDayOnTime(2026, 3, 20)
    // Vandaag (21 maart) is niet gedaan
    expect(calculateStreak(new Date(2026, 2, 21))).toBe(0)
  })

  it('returns correct streak for multiple consecutive days', () => {
    for (let day = 18; day <= 21; day++) {
      completeDayOnTime(2026, 3, day)
    }
    expect(calculateStreak(new Date(2026, 2, 21))).toBe(4)
  })

  it('streak starts from most recent consecutive run, ignores earlier missed days', () => {
    // Dag 15-17 gemist, dag 18-21 op tijd
    for (let day = 18; day <= 21; day++) {
      completeDayOnTime(2026, 3, day)
    }
    expect(calculateStreak(new Date(2026, 2, 21))).toBe(4)
  })
})
