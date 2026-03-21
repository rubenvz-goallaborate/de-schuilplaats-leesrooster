import { useState } from 'react'
import type { Screen } from './types'
import BottomNav from './components/BottomNav'
import TodayScreen from './components/TodayScreen'
import CalendarScreen from './components/CalendarScreen'
import SettingsScreen from './components/SettingsScreen'

export default function App() {
  const [screen, setScreen] = useState<Screen>('today')

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
