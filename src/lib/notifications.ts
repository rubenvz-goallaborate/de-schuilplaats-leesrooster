import { getReadingsForDay } from './schedule'
import { getActiveYear, getActiveTrack } from './schedule'
import { REFERENCE_YEAR } from '../config'

export async function scheduleNextNotification(time: string): Promise<void> {
  if (!('serviceWorker' in navigator) || !('Notification' in window)) return
  if (Notification.permission !== 'granted') return

  const registration = await navigator.serviceWorker.ready
  if (!registration.active) return

  const [hours, minutes] = time.split(':').map(Number)
  const now = new Date()
  const next = new Date(now)
  next.setHours(hours, minutes, 0, 0)

  // Als het tijdstip vandaag al voorbij is, plan voor morgen
  if (next <= now) {
    next.setDate(next.getDate() + 1)
  }

  const delay = next.getTime() - now.getTime()

  // Bereken de lezingen voor de geplande dag
  const year = next.getFullYear()
  const month = next.getMonth() + 1
  const day = next.getDate()
  const activeYear = getActiveYear(year, REFERENCE_YEAR)
  const track = getActiveTrack(activeYear)
  const readings = getReadingsForDay(month, day, track)

  registration.active.postMessage({
    type: 'SCHEDULE_NOTIFICATION',
    delay,
    title: 'De Schuilplaats Leesrooster 📖',
    body: readings
      ? `Vandaag: ${readings[0]} & ${readings[1]}`
      : 'Tijd om te lezen!',
  })
}

export async function cancelNotifications(): Promise<void> {
  if (!('serviceWorker' in navigator)) return
  const registration = await navigator.serviceWorker.ready
  registration.active?.postMessage({ type: 'CANCEL_NOTIFICATION' })
}
