import { describe, it, expect, beforeEach, vi } from 'vitest'
import { getSettings, saveSettings } from '../../src/lib/settings'
import { mockLocalStorage } from '../../src/lib/testUtils'

beforeEach(() => {
  vi.stubGlobal('localStorage', mockLocalStorage())
})

describe('getSettings', () => {
  it('returns defaults when nothing stored', () => {
    const s = getSettings()
    expect(s.notificationsEnabled).toBe(false)
    expect(s.notificationTime).toBe('08:00')
  })

  it('merges stored partial settings with defaults', () => {
    saveSettings({ notificationsEnabled: true, notificationTime: '07:30' })
    const s = getSettings()
    expect(s.notificationsEnabled).toBe(true)
    expect(s.notificationTime).toBe('07:30')
  })

  it('returns defaults when stored JSON is corrupt', () => {
    localStorage.setItem('schuilplaats_settings', 'invalid-json')
    const s = getSettings()
    expect(s.notificationsEnabled).toBe(false)
  })
})
