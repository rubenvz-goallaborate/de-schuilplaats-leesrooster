import { describe, it, expect, beforeEach, vi } from 'vitest'
import { getProgress, setReadingComplete, isDayComplete, isDayPartial, isDayCompleteOnTime } from '../../src/lib/progress'
import { mockLocalStorage } from '../../src/lib/testUtils'

beforeEach(() => {
  const mock = mockLocalStorage()
  vi.stubGlobal('localStorage', mock)
})

describe('getProgress', () => {
  it('returns empty object when no progress stored', () => {
    expect(getProgress()).toEqual({})
  })
})

describe('setReadingComplete', () => {
  it('stores a timestamp for reading 0', () => {
    setReadingComplete(2026, 3, 21, 0)
    const progress = getProgress()
    expect(progress['2026']['3']['21'][0]).toBeTruthy()
    expect(progress['2026']['3']['21'][1]).toBeNull()
  })

  it('does not overwrite an already completed reading', () => {
    setReadingComplete(2026, 3, 21, 0)
    const first = getProgress()['2026']['3']['21'][0]
    setReadingComplete(2026, 3, 21, 0)
    const second = getProgress()['2026']['3']['21'][0]
    expect(first).toBe(second)
  })
})

describe('isDayComplete', () => {
  it('returns false when no readings done', () => {
    expect(isDayComplete(2026, 3, 21)).toBe(false)
  })
  it('returns false when only one reading done', () => {
    setReadingComplete(2026, 3, 21, 0)
    expect(isDayComplete(2026, 3, 21)).toBe(false)
  })
  it('returns true when both readings done', () => {
    setReadingComplete(2026, 3, 21, 0)
    setReadingComplete(2026, 3, 21, 1)
    expect(isDayComplete(2026, 3, 21)).toBe(true)
  })
})

describe('isDayPartial', () => {
  it('returns false when no readings done', () => {
    expect(isDayPartial(2026, 3, 21)).toBe(false)
  })
  it('returns true when exactly one reading done', () => {
    setReadingComplete(2026, 3, 21, 0)
    expect(isDayPartial(2026, 3, 21)).toBe(true)
  })
})

describe('isDayCompleteOnTime', () => {
  it('returns false when nothing done', () => {
    expect(isDayCompleteOnTime(2026, 3, 21)).toBe(false)
  })
  it('returns true when both readings done on the correct day', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 2, 21, 9, 0, 0))
    setReadingComplete(2026, 3, 21, 0)
    setReadingComplete(2026, 3, 21, 1)
    vi.useRealTimers()
    expect(isDayCompleteOnTime(2026, 3, 21)).toBe(true)
  })
  it('returns false when readings were done on a different day (late catchup)', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 2, 22, 9, 0, 0)) // 22 maart, maar gepland voor 21
    setReadingComplete(2026, 3, 21, 0)
    setReadingComplete(2026, 3, 21, 1)
    vi.useRealTimers()
    expect(isDayCompleteOnTime(2026, 3, 21)).toBe(false)
  })
})
