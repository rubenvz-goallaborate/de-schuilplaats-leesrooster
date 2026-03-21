import { STORAGE_KEYS, DEFAULT_SETTINGS } from '../config'
import type { Settings } from '../types'

export function getSettings(): Settings {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.settings)
    return raw ? { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } : { ...DEFAULT_SETTINGS }
  } catch {
    return { ...DEFAULT_SETTINGS }
  }
}

export function saveSettings(settings: Settings): void {
  localStorage.setItem(STORAGE_KEYS.settings, JSON.stringify(settings))
}
