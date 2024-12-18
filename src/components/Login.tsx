import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { Loader2 } from 'lucide-react'

import settings from '../config/settings'
import { useAuth } from '../hooks/useAuth'

interface GitHubOAuthResponse {
  access_token: string
  refresh_token: string
  token_type: string
  username: string | null
}

export const Login = () => {
  const navigate = useNavigate()
  const { login } = useAuth()
  const [processedCode, setProcessedCode] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleGitHubLogin = () => {
    console.log('🚀 Initiating GitHub login')
    setIsLoading(true)
    setError(null)
    localStorage.removeItem('token')
    // For login, we don't need to store a preferred username
    window.location.href = `https://github.com/login/oauth/authorize?client_id=${settings.githubClientId}&scope=user:email,read:user`
  }

  const memoizedLogin = useCallback(
    async (accessToken: string, refreshToken: string) => {
      console.log('🔑 Starting memoizedLogin')
      try {
        const userData = await login(accessToken, refreshToken)
        console.log('👤 User data received:', userData)

        if (userData.username == null) {
          console.log('🆕 Redirecting to create user')
          navigate('/createUser', { replace: true })
        } else {
          console.log('✅ Login successful, redirecting to home')
          navigate('/', { replace: true })
        }
      } catch (error) {
        console.error('❌ Login process failed:', error)
        setError('Login failed. Please try again.')
        setIsLoading(false)
      }
    },
    [login, navigate]
  )

  useEffect(() => {
    console.log('🔍 Login effect running with code:', window.location.search)

    const queryString = window.location.search
    const urlParams = new URLSearchParams(queryString)
    const code = urlParams.get('code')
    const errorParam = urlParams.get('error')

    if (errorParam) {
      setError('GitHub authorization failed.')
      setIsLoading(false)
      return
    }

    if (code && code !== processedCode) {
      console.log('🔄 Processing new OAuth code:', code)
      setIsLoading(true)
      setError(null)
      setProcessedCode(code)

      // Clear the URL immediately
      window.history.replaceState({}, '', window.location.pathname)

      fetch(`${settings.apiUrl}/api/auth/github?code=${code}`)
        .then((response) => {
          if (!response.ok) {
            throw new Error(`Authentication failed: ${response.statusText}`)
          }
          console.log('📡 API response received:', response.status)
          return response.json()
        })
        .then((data: GitHubOAuthResponse) => {
          console.log('🎯 Received GitHub OAuth response')
          return memoizedLogin(data.access_token, data.refresh_token)
        })
        .catch((error: Error) => {
          console.error('💥 GitHub OAuth process failed:', error)
          setError('Authentication failed. Please try again.')
          setIsLoading(false)
        })
    }
  }, [memoizedLogin, processedCode])

  return (
    <div className="flex min-h-screen items-center justify-center flex-col gap-4">
      <h2 className="text-2xl font-bold mb-4">Log In</h2>

      {error && (
        <div className="text-red-500 bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
          {error}
        </div>
      )}

      <button
        onClick={handleGitHubLogin}
        disabled={isLoading}
        className="bg-gray-900 text-white px-6 py-3 rounded-lg flex items-center gap-2 hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isLoading ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : (
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385c.6.105.825-.255.825-.57c0-.285-.015-1.23-.015-2.235c-3.015.555-3.795-.735-4.035-1.41c-.135-.345-.72-1.41-1.23-1.695c-.42-.225-1.02-.78-.015-.795c.945-.015 1.62.87 1.845 1.23c1.08 1.815 2.805 1.305 3.495.99c.105-.78.42-1.305.765-1.605c-2.67-.3-5.46-1.335-5.46-5.925c0-1.305.465-2.385 1.23-3.225c-.12-.3-.54-1.53.12-3.18c0 0 1.005-.315 3.3 1.23c.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23c.66 1.65.24 2.88.12 3.18c.765.84 1.23 1.905 1.23 3.225c0 4.605-2.805 5.625-5.475 5.925c.435.375.81 1.095.81 2.22c0 1.605-.015 2.895-.015 3.3c0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
          </svg>
        )}
        {isLoading ? 'Authenticating...' : 'Continue with GitHub'}
      </button>

      <div className="opacity-50">
        <button
          disabled
          className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gray-200 text-gray-700 rounded-lg mb-2"
        >
          Coming soon: X
        </button>
      </div>
    </div>
  )
}

export default Login
