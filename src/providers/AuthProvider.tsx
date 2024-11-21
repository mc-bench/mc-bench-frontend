import { useState, ReactNode, useEffect, useCallback } from 'react'
import { User } from '../types/auth'
import { api, adminAPI } from '../api/client'
import { AuthContext } from '../context/AuthContext'

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

  const login = useCallback(async (newToken: string): Promise<User> => {
    console.log('Login started with token:', newToken)
    setLoginInProgress(true)

    try {
      // Set token in state first
      setToken(newToken)

      // Then localStorage
      localStorage.setItem('token', newToken)
      console.log('Token set in localStorage:', newToken)

      // Set up axios headers
      api.defaults.headers.common['Authorization'] = `Bearer ${newToken}`
      adminAPI.defaults.headers.common['Authorization'] = `Bearer ${newToken}`

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
      delete api.defaults.headers.common['Authorization']
      delete adminAPI.defaults.headers.common['Authorization']
      setToken(null)
      setUser(null)
      throw error
    } finally {
      setLoginInProgress(false)
    }
  }, [])

  const logout = useCallback(() => {
    console.log('Logging out')
    localStorage.removeItem('token')
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
