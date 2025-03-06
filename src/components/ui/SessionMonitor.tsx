import { useEffect } from 'react'

import { useSessionTracking } from '../../hooks/useSessionTracking'

// Constants
const CHECK_INTERVAL = 60000 // Check every minute

export const SessionMonitor = () => {
  const { isSessionExpired, clearSession, getSessionInfo } =
    useSessionTracking()

  // Initial check of session state
  useEffect(() => {
    // No initial setup needed, just let the system work
    getSessionInfo() // Call to avoid unused warning
    return () => {}
  }, [getSessionInfo])

  // Regular session expiration check
  useEffect(() => {
    // Function to check if session is expired and clear it if needed
    const checkSession = () => {
      if (isSessionExpired()) {
        clearSession()
        console.log('Session expired and cleared')
      }
    }

    // Initial check
    checkSession()

    // Set interval for regular checks
    const intervalId = setInterval(checkSession, CHECK_INTERVAL)

    // Cleanup
    return () => {
      clearInterval(intervalId)
    }
  }, [isSessionExpired, clearSession])

  // This is a monitoring component that doesn't render anything
  return null
}

export default SessionMonitor
