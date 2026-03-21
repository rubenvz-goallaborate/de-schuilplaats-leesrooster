// Het jaar waarin Jaar 1 (Familie lezingen) begon.
// 2025 = Jaar 1, 2026 = Jaar 2, 2027 = Jaar 1, etc.
export const REFERENCE_YEAR = 2025

export const STORAGE_KEYS = {
  progress: 'schuilplaats_progress',
  settings: 'schuilplaats_settings',
} as const

export const DEFAULT_SETTINGS = {
  notificationsEnabled: false,
  notificationTime: '08:00',
}
