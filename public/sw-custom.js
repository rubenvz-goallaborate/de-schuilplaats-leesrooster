let notificationTimer = null

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SCHEDULE_NOTIFICATION') {
    if (notificationTimer) clearTimeout(notificationTimer)
    const { delay, title, body } = event.data
    notificationTimer = setTimeout(() => {
      self.registration.showNotification(title, {
        body,
        icon: '/icons/icon-192.png',
        badge: '/icons/icon-192.png',
      })
      notificationTimer = null
    }, delay)
  }

  if (event.data?.type === 'CANCEL_NOTIFICATION') {
    if (notificationTimer) {
      clearTimeout(notificationTimer)
      notificationTimer = null
    }
  }
})
