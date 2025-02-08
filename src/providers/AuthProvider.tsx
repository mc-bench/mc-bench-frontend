import { ReactNode, useCallback, useEffect, useRef, useState } from 'react'

import { api } from '../api/client'
import { AuthContext } from '../context/AuthContext'
import { useTokenManagement } from '../hooks/useTokenManagement'
import { User } from '../types/auth'

interface AuthProviderProps {
  children: ReactNode
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [token, setToken] = useState<string | null>(
    localStorage.getItem('token')
  )
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [loginInProgress, setLoginInProgress] = useState(false)
  const refreshTimeoutRef = useRef<number>()

  const logout = useCallback(() => {
    console.log('Logging out')
    localStorage.removeItem('token')
    localStorage.removeItem('refreshToken')
    setToken(null)
    setUser(null)
    if (refreshTimeoutRef.current) {
      clearTimeout(refreshTimeoutRef.current)
    }
  }, [])

  const { getRefreshTime, updateAuthHeaders, refreshAccessToken } =
    useTokenManagement(logout)

  const scheduleTokenRefresh = useCallback(
    (accessToken: string) => {
      const refreshTime = getRefreshTime(accessToken)
      console.log(`Scheduling token refresh in ${refreshTime / 1000} seconds`)

      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current)
      }

      refreshTimeoutRef.current = window.setTimeout(async () => {
        const newToken = await refreshAccessToken()
        if (newToken) {
          console.log('Token refreshed successfully')
          setToken(newToken)
          scheduleTokenRefresh(newToken)
        }
      }, refreshTime)
    },
    [getRefreshTime, refreshAccessToken]
  )

  const login = useCallback(
    async (accessToken: string, refreshToken: string): Promise<User> => {
      console.log('Login started with token:', accessToken)
      setLoginInProgress(true)

      try {
        setToken(accessToken)
        localStorage.setItem('token', accessToken)
        localStorage.setItem('refreshToken', refreshToken)
        console.log('Tokens stored in localStorage')

        updateAuthHeaders(accessToken)
        scheduleTokenRefresh(accessToken)

        console.log('Fetching user data with new token')
        const { data: userData } = await api.get('/me')
        console.log('User data fetched:', userData)
        setUser(userData)
        return userData
      } catch (error) {
        console.error('Error during login process:', error)
        logout()
        throw error
      } finally {
        setLoginInProgress(false)
      }
    },
    [logout, scheduleTokenRefresh, updateAuthHeaders]
  )

  useEffect(() => {
    if (token) {
      scheduleTokenRefresh(token)
    }

    return () => {
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current)
      }
    }
  }, [token, scheduleTokenRefresh])

  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'token') {
        console.log('Token changed in another tab')
        const newToken = e.newValue
        setToken(newToken)
        updateAuthHeaders(newToken)
        if (!newToken) {
          setUser(null)
        }
      }
    }

    window.addEventListener('storage', handleStorageChange)
    return () => window.removeEventListener('storage', handleStorageChange)
  }, [updateAuthHeaders])

  useEffect(() => {
    let mounted = true

    const fetchUser = async () => {
      if (!token || loginInProgress) {
        setIsLoading(false)
        return
      }

      try {
        console.log('Fetching user data on mount/token change')
        const { data: userData } = await api.get('/me')
        if (mounted) {
          console.log('Setting user data:', userData)
          setUser(userData)
        }
      } catch (error) {
        console.error('Error fetching user:', error)
        if (mounted) {
          logout()
        }
      } finally {
        if (mounted) {
          setIsLoading(false)
        }
      }
    }

    fetchUser()
    return () => {
      mounted = false
    }
  }, [token, logout, loginInProgress])

  if (isLoading) {
    return null // or return a loading spinner
  }

  return (
    <AuthContext.Provider
      value={{
        token,
        user,
        setUser,
        login,
        logout,
        isAuthenticated: !!token,
        isLoading,
        loginInProgress,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}
