import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { Loader2 } from 'lucide-react'

import settings from '../config/settings'
import { useAuth } from '../hooks/useAuth'

interface OAuthResponse {
  userId: string
  accessToken: string
  refreshToken: string
  username: string
}

export const Login = () => {
  const navigate = useNavigate()
  const { login } = useAuth()
  const [processedCode, setProcessedCode] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const queryString = window.location.search
    const urlParams = new URLSearchParams(queryString)
    const code = urlParams.get('code')
    const errorParam = urlParams.get('error')

    if (errorParam) {
      setError('Authorization failed.')
      setIsLoading(false)
      return
    }

    if (code && code !== processedCode) {
      setIsLoading(true)
      setError(null)
      setProcessedCode(code)
      window.history.replaceState({}, '', window.location.pathname)

      const preferredUsername = localStorage.getItem('preferred_username')
      const authProvider = localStorage.getItem('auth_provider') || 'github'

      if (!preferredUsername) {
        // Login flow
        fetch(`${settings.apiUrl}/api/login`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            loginAuthProvider: authProvider,
            loginAuthProviderData: { code },
          }),
        })
          .then((response) => {
            if (!response.ok) {
              return response.text().then((text) => {
                try {
                  const data = JSON.parse(text)
                  if (data.detail) {
                    throw new Error(`Authentication failed: ${data.detail}`)
                  }
                } catch (e) {
                  throw new Error('Authentication failed. Please try again.')
                }
              })
            }
            return response.json()
          })
          .then((data: OAuthResponse) => {
            login(data.accessToken, data.refreshToken)
              .then(() => navigate('/', { replace: true }))
              .catch((error) => {
                console.log(error)
                setError('Login failed. Please try again.')
                setIsLoading(false)
              })
          })
          .catch((error: Error) => {
            setError(error.message)
            setIsLoading(false)
          })
      } else {
        // Signup flow
        fetch(`${settings.apiUrl}/api/signup`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            username: preferredUsername,
            signupAuthProvider: authProvider,
            signupAuthProviderData: { code },
          }),
        })
          .then((response) => {
            if (!response.ok) {
              return response.text().then((text) => {
                try {
                  const data = JSON.parse(text)
                  if (data.detail) {
                    throw new Error(`Signup failed: ${data.detail}`)
                  }
                } catch (e) {
                  throw new Error('Signup failed. Please try again.')
                }
              })
            }
            return response.json()
          })
          .then((data: OAuthResponse) => {
            login(data.accessToken, data.refreshToken)
              .then(() => navigate('/', { replace: true }))
              .catch((error) => {
                console.log(error)
                setError('Signup failed. Please try again.')
                setIsLoading(false)
              })
          })
          .catch((error: Error) => {
            setError(error.message)
            setIsLoading(false)
          })
        localStorage.removeItem('preferred_username')
      }
    }
  }, [login, navigate, processedCode])

  return (
    <div className="flex min-h-screen items-center justify-center flex-col gap-4">
      {error && (
        <div className="text-red-500 bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
          {error}
        </div>
      )}
      {isLoading && (
        <div className="flex items-center gap-2">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>Authenticating...</span>
        </div>
      )}
    </div>
  )
}

export default Login
