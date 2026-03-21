export type DayReadings = {
  family: [string, string]
  secret: [string, string]
}

export type ReadingPlan = {
  [month: string]: {
    [day: string]: DayReadings
  }
}

// Progress per dag: [timestamp lezing1 | null, timestamp lezing2 | null]
export type DayProgress = [string | null, string | null]

export type ProgressStore = {
  [year: string]: {
    [month: string]: {
      [day: string]: DayProgress
    }
  }
}

export type Settings = {
  notificationsEnabled: boolean
  notificationTime: string // "HH:MM"
}

export type ActiveTrack = 'family' | 'secret'

export type Screen = 'today' | 'calendar' | 'settings'
