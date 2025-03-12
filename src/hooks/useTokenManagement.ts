import { adminAPI, api } from '../api/client'
import settings from '../config/settings'
import { TokenResponse } from '../types/auth'

export const useTokenManagement = (
  logout: () => void,
  onAuthFailure?: () => void
) => {
  const getTokenExpirationTime = (token: string): number | null => {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]))
      return payload.exp ? payload.exp * 1000 : null
    } catch (error) {
      console.error('Error decoding token:', error)
      return null
    }
  }

  const getRefreshTime = (token: string): number => {
    const expirationTime = getTokenExpirationTime(token)
    if (!expirationTime) return 50 * 60 * 1000 // fallback to 50 minutes

    const currentTime = Date.now()
    const timeUntilExpiry = expirationTime - currentTime
    console.log(`Token will expire in ${timeUntilExpiry / 1000} seconds`)
    return Math.max(timeUntilExpiry - 60 * 1000, 30 * 1000)
  }

  const updateAuthHeaders = (token: string | null) => {
    console.log('Updating auth headers with token:', token ? 'present' : 'null')
    if (token) {
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`
      adminAPI.defaults.headers.common['Authorization'] = `Bearer ${token}`
    } else {
      delete api.defaults.headers.common['Authorization']
      delete adminAPI.defaults.headers.common['Authorization']
    }
  }

  const refreshAccessToken = async (): Promise<string | null> => {
    console.log('Attempting to refresh access token')
    const refreshToken = localStorage.getItem('refreshToken')
    if (!refreshToken) {
      console.log('No refresh token found')
      if (onAuthFailure) {
        onAuthFailure()
      } else {
        logout()
      }
      return null
    }

    try {
      const response = await fetch(`${settings.apiUrl}/api/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${refreshToken}`,
        },
      })

      if (!response.ok) throw new Error('Token refresh failed')

      const { access_token } = (await response.json()) as TokenResponse
      console.log('Successfully refreshed access token')
      updateAuthHeaders(access_token)
      localStorage.setItem('token', access_token)
      return access_token
    } catch (error) {
      console.error('Failed to refresh token:', error)
      // Call onAuthFailure if provided, otherwise log out
      if (onAuthFailure) {
        onAuthFailure()
      } else {
        logout()
      }
      return null
    }
  }

  return {
    getRefreshTime,
    updateAuthHeaders,
    refreshAccessToken,
  }
}
