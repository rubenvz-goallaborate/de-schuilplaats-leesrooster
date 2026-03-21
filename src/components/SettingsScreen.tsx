import { useState, useEffect } from 'react'
import { REFERENCE_YEAR } from '../config'
import { getActiveYear, getActiveTrack } from '../lib/schedule'
import { getSettings, saveSettings } from '../lib/settings'
import { scheduleNextNotification, cancelNotifications } from '../lib/notifications'

export default function SettingsScreen() {
  const [settings, setSettings] = useState(getSettings)

  const year = new Date().getFullYear()
  const activeYear = getActiveYear(year, REFERENCE_YEAR)
  const track = getActiveTrack(activeYear)
  const trackLabel = track === 'family' ? 'Familie lezingen' : 'Geheime lezingen'

  useEffect(() => {
    saveSettings(settings)
    if (settings.notificationsEnabled) {
      scheduleNextNotification(settings.notificationTime)
    } else {
      cancelNotifications()
    }
  }, [settings])

  async function handleNotificationToggle() {
    if (!settings.notificationsEnabled) {
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') return
    }
    setSettings(s => ({ ...s, notificationsEnabled: !s.notificationsEnabled }))
  }

  function handleTimeChange(time: string) {
    setSettings(s => ({ ...s, notificationTime: time }))
  }

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold text-stone-800 mb-4">Instellingen</h1>

      <div className="bg-[#f0ebe1] rounded-lg p-4 mb-4">
        <p className="text-xs text-stone-400 uppercase tracking-wide mb-1">Huidig leesrooster</p>
        <p className="font-bold text-[#5c4a2a]">Jaar {activeYear} · {trackLabel}</p>
        <p className="text-xs text-stone-400 mt-1">Gestart 1 jan {REFERENCE_YEAR} · samen met de gemeente</p>
      </div>

      <div className="space-y-2">
        <p className="text-xs text-stone-400 uppercase tracking-wide">Dagelijkse herinnering</p>

        <div className="bg-white rounded-lg border border-stone-200 divide-y divide-stone-100">
          <div className="flex items-center justify-between p-4">
            <span className="text-stone-800">Melding aan</span>
            <button
              onClick={handleNotificationToggle}
              className={`relative w-12 h-6 rounded-full transition-colors ${
                settings.notificationsEnabled ? 'bg-[#5c4a2a]' : 'bg-stone-200'
              }`}
            >
              <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                settings.notificationsEnabled ? 'translate-x-7' : 'translate-x-1'
              }`} />
            </button>
          </div>

          {settings.notificationsEnabled && (
            <div className="flex items-center justify-between p-4">
              <span className="text-stone-800">Tijd</span>
              <input
                type="time"
                value={settings.notificationTime}
                onChange={e => handleTimeChange(e.target.value)}
                className="text-[#5c4a2a] font-bold bg-transparent"
              />
            </div>
          )}
        </div>
      </div>

      <p className="text-center text-xs text-stone-300 mt-8">De Schuilplaats Enschede · v1.0</p>
    </div>
  )
}
