import { ReactNode, useCallback, useEffect, useState } from 'react'

import { adminAPI, api } from '../api/client'
import { AuthContext } from '../context/AuthContext'
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

  const isAuthenticated = !!token

  const login = useCallback(
    async (accessToken: string, refreshToken: string): Promise<User> => {
      console.log('Login started with token:', accessToken)
      setLoginInProgress(true)

      try {
        // Set access token in state
        setToken(accessToken)

        // Store both tokens in localStorage
        localStorage.setItem('token', accessToken)
        localStorage.setItem('refreshToken', refreshToken)
        console.log('Tokens stored in localStorage')

        // Set up axios headers
        api.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`
        adminAPI.defaults.headers.common['Authorization'] =
          `Bearer ${accessToken}`

        // Fetch user data
        console.log('Fetching user data with new token')
        const { data: userData } = await api.get('/me')
        console.log('User data fetched:', userData)

        setUser(userData)
        return userData
      } catch (error) {
        console.error('Error during login process:', error)
        // Clean up on failure
        localStorage.removeItem('token')
        localStorage.removeItem('refreshToken')
        delete api.defaults.headers.common['Authorization']
        delete adminAPI.defaults.headers.common['Authorization']
        setToken(null)
        setUser(null)
        throw error
      } finally {
        setLoginInProgress(false)
      }
    },
    []
  )

  // Update the logout function to also remove the refresh token
  const logout = useCallback(() => {
    console.log('Logging out')
    localStorage.removeItem('token')
    localStorage.removeItem('refreshToken')
    delete api.defaults.headers.common['Authorization']
    delete adminAPI.defaults.headers.common['Authorization']
    setToken(null)
    setUser(null)
  }, [])

  // Add cross-tab synchronization
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'token') {
        console.log('Token changed in another tab')
        const newToken = e.newValue

        // Update token state
        setToken(newToken)

        // Update axios headers
        if (newToken) {
          api.defaults.headers.common['Authorization'] = `Bearer ${newToken}`
          adminAPI.defaults.headers.common['Authorization'] =
            `Bearer ${newToken}`
        } else {
          delete api.defaults.headers.common['Authorization']
          delete adminAPI.defaults.headers.common['Authorization']
          setUser(null)
        }
      }
    }

    window.addEventListener('storage', handleStorageChange)
    return () => window.removeEventListener('storage', handleStorageChange)
  }, [])

  // Fetch user when token changes
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

  return (
    <AuthContext.Provider
      value={{
        token,
        user,
        setUser,
        login,
        logout,
        isAuthenticated,
        isLoading,
        loginInProgress,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}
