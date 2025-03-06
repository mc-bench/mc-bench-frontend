import { useCallback } from 'react'

import { adminAPI, api } from '../api/client'

// Constants
const SESSION_HEADER = 'X-MCBench-Session'
const IDENTIFICATION_HEADER = 'X-MCBench-Identification'
const SESSION_TIMESTAMP_KEY = 'mcbench-session-timestamp'
const SESSION_ID_KEY = 'mcbench-session-id'
const IDENTIFICATION_ID_KEY = 'mcbench-identification-id'
const SESSION_EXPIRY_MS = 2 * 60 * 60 * 1000 // 2 hours in milliseconds

export const useSessionTracking = () => {
  // Check if session is expired
  const isSessionExpired = useCallback(() => {
    const timestamp = localStorage.getItem(SESSION_TIMESTAMP_KEY)
    if (!timestamp) return true

    const lastUpdated = parseInt(timestamp, 10)
    const now = Date.now()
    return now - lastUpdated > SESSION_EXPIRY_MS
  }, [])

  // Update session timestamp
  const updateSessionTimestamp = useCallback(() => {
    localStorage.setItem(SESSION_TIMESTAMP_KEY, Date.now().toString())
  }, [])

  // Store headers received from server
  const storeSessionHeaders = useCallback(
    (headers: any) => {
      // Get headers by case-insensitive lookup
      let sessionId: string | undefined
      let identificationId: string | undefined

      // Look for headers in lowercase format (as commonly returned by servers)
      sessionId = headers?.['x-mcbench-session']
      identificationId = headers?.['x-mcbench-identification']

      // If not found, try standard format
      if (!sessionId && headers?.[SESSION_HEADER]) {
        sessionId = headers[SESSION_HEADER]
      }

      if (!identificationId && headers?.[IDENTIFICATION_HEADER]) {
        identificationId = headers[IDENTIFICATION_HEADER]
      }

      // Store in localStorage if found
      if (sessionId) {
        localStorage.setItem(SESSION_ID_KEY, sessionId)
        updateSessionTimestamp()
      }

      if (identificationId) {
        localStorage.setItem(IDENTIFICATION_ID_KEY, identificationId)
      }
    },
    [updateSessionTimestamp]
  )

  // Clear session (but not identification)
  const clearSession = useCallback(() => {
    localStorage.removeItem(SESSION_ID_KEY)
    localStorage.removeItem(SESSION_TIMESTAMP_KEY)
  }, [])

  // Setup request interceptor for an API instance
  const setupRequestInterceptor = useCallback(
    (apiInstance: typeof api) => {
      return apiInstance.interceptors.request.use((config) => {
        const url = config.url || ''

        // Only add tracking headers to specific endpoints
        if (url.includes('/comparison') || url.includes('/me')) {
          const identificationId = localStorage.getItem(IDENTIFICATION_ID_KEY)
          const sessionId = !isSessionExpired()
            ? localStorage.getItem(SESSION_ID_KEY)
            : null

          // Always include identification header if available
          if (identificationId) {
            config.headers[IDENTIFICATION_HEADER] = identificationId
          }

          // Only include session header if not expired
          if (sessionId) {
            config.headers[SESSION_HEADER] = sessionId
          }
        }

        return config
      })
    },
    [isSessionExpired]
  )

  // Setup response interceptor for an API instance
  const setupResponseInterceptor = useCallback(
    (apiInstance: typeof api) => {
      return apiInstance.interceptors.response.use((response) => {
        const headers = response.headers
        const url = response.config.url || ''

        // Only process headers for the relevant endpoints
        if (url.includes('/comparison') || (url.includes('/me') && headers)) {
          // Direct access to known headers
          const sessionHeader = response.headers?.['x-mcbench-session']
          const identHeader = response.headers?.['x-mcbench-identification']

          // Directly store headers if found
          if (sessionHeader) {
            localStorage.setItem(SESSION_ID_KEY, sessionHeader)
            updateSessionTimestamp()
          }

          if (identHeader) {
            localStorage.setItem(IDENTIFICATION_ID_KEY, identHeader)
          }

          // Also try the extraction method as a fallback
          storeSessionHeaders(headers)
        }

        return response
      })
    },
    [storeSessionHeaders, updateSessionTimestamp]
  )

  // Update API interceptors to handle session headers
  const setupHeaderInterceptors = useCallback(() => {
    // Setup interceptors for main API
    const apiRequestInterceptor = setupRequestInterceptor(api)
    const apiResponseInterceptor = setupResponseInterceptor(api)

    // Setup interceptors for admin API
    const adminRequestInterceptor = setupRequestInterceptor(adminAPI)
    const adminResponseInterceptor = setupResponseInterceptor(adminAPI)

    // Return cleanup function to remove all interceptors
    return () => {
      api.interceptors.request.eject(apiRequestInterceptor)
      api.interceptors.response.eject(apiResponseInterceptor)
      adminAPI.interceptors.request.eject(adminRequestInterceptor)
      adminAPI.interceptors.response.eject(adminResponseInterceptor)
    }
  }, [setupRequestInterceptor, setupResponseInterceptor])

  // Reset session on auth state changes
  const resetSession = useCallback(() => {
    clearSession()
  }, [clearSession])

  // Get current session info
  const getSessionInfo = useCallback(() => {
    const sessionId = localStorage.getItem(SESSION_ID_KEY)
    const identificationId = localStorage.getItem(IDENTIFICATION_ID_KEY)
    const timestamp = localStorage.getItem(SESSION_TIMESTAMP_KEY)

    return {
      sessionId,
      identificationId,
      timestamp: timestamp ? parseInt(timestamp, 10) : null,
      isExpired: isSessionExpired(),
    }
  }, [isSessionExpired])

  return {
    setupHeaderInterceptors,
    resetSession,
    clearSession,
    isSessionExpired,
    getSessionInfo,
  }
}
