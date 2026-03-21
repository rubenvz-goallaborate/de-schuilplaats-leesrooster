import { isDayCompleteOnTime } from './progress'

export function calculateStreak(today: Date): number {
  let streak = 0
  const current = new Date(today)

  while (true) {
    const year = current.getFullYear()
    const month = current.getMonth() + 1
    const day = current.getDate()

    if (isDayCompleteOnTime(year, month, day)) {
      streak++
      current.setDate(current.getDate() - 1)
    } else {
      break
    }

    // Veiligheidsgrens: max 366 dagen terug
    if (streak > 366) break
  }

  return streak
}
