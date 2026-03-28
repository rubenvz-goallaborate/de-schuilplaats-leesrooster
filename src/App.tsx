import { useEffect, useState } from 'react'
import type { Screen } from './types'
import BottomNav from './components/BottomNav'
import TodayScreen from './components/TodayScreen'
import CalendarScreen from './components/CalendarScreen'
import SettingsScreen from './components/SettingsScreen'
import { getSettings } from './lib/settings'
import { scheduleNextNotification } from './lib/notifications'

export default function App() {
  const [screen, setScreen] = useState<Screen>('today')

  useEffect(() => {
    const s = getSettings()
    if (s.notificationsEnabled) {
      scheduleNextNotification(s.notificationTime)
    }
  }, [])

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return
    const handleVisibilityChange = async () => {
      if (document.visibilityState !== 'visible') return
      try {
        const registration = await navigator.serviceWorker.getRegistration()
        if (registration) await registration.update()
      } catch { /* offline, negeer */ }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [])

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return
    let refreshing = false
    const handleControllerChange = () => {
      if (refreshing) return
      refreshing = true
      window.location.reload()
    }
    navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange)
    return () => navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange)
  }, [])

  return (
    <div className="flex flex-col h-screen bg-[#f8f6f2] max-w-md mx-auto">
      <main className="flex-1 overflow-y-auto">
        {screen === 'today' && <TodayScreen />}
        {screen === 'calendar' && <CalendarScreen />}
        {screen === 'settings' && <SettingsScreen />}
      </main>
      <BottomNav active={screen} onChange={setScreen} />
    </div>
  )
}
