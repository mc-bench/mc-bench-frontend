import React, { useEffect, useState } from 'react'

import { CheckCircle, Github, Loader2, XCircle } from 'lucide-react'

import { api } from '../api/client'
import settings from '../config/settings'
import Modal from './ui/Modal'

interface AuthModalProps {
  isOpen: boolean
  onClose: () => void
  isLoading: boolean
  mode: 'signup' | 'login'
}

const AuthModal = ({ isOpen, onClose, isLoading, mode }: AuthModalProps) => {
  const [username, setUsername] = useState('')
  const [validation, setValidation] = useState<{
    isValid: boolean
    errors: string[]
  } | null>(null)
  const [debouncedUsername, setDebouncedUsername] = useState(username)

  // Debounce the username updates
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setDebouncedUsername(username)
    }, 500)

    return () => clearTimeout(timeoutId)
  }, [username])

  // Handle validation separately
  useEffect(() => {
    const validateUsername = async () => {
      if (debouncedUsername.trim()) {
        try {
          const response = await api.get(
            `/validate-username?username=${encodeURIComponent(debouncedUsername)}`
          )
          console.log('🚀 Username validation response:', response)
          setValidation(response.data)
        } catch (err) {
          console.error('Username validation failed:', err)
        }
      } else {
        setValidation(null)
      }
    }

    validateUsername()
  }, [debouncedUsername])

  const handleGitHubAuth = (e: React.FormEvent) => {
    localStorage.setItem('auth_provider', 'github')

    e.preventDefault()
    if (mode === 'signup' && !username.trim()) return

    if (mode === 'signup') {
      console.log('🚀 Setting localStorage values for signup')
      localStorage.setItem('preferred_username', username.trim())
      console.log('🚀 localStorage values set:', {
        username: localStorage.getItem('preferred_username'),
        provider: localStorage.getItem('auth_provider'),
      })
    }

    window.location.href = `https://github.com/login/oauth/authorize?client_id=${settings.githubClientId}&scope=user:email,read:user`
  }

  const handleGoogleAuth = (e: React.FormEvent) => {
    localStorage.setItem('auth_provider', 'google')

    e.preventDefault()
    if (mode === 'signup' && !username.trim()) return

    if (mode === 'signup') {
      localStorage.setItem('preferred_username', username.trim())
    }

    window.location.href = `${settings.apiUrl}/api/auth/google`
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <h2 className="text-2xl font-bold mb-4">
        {mode === 'signup' ? 'Sign Up' : 'Log In'}
      </h2>

      <form onSubmit={handleGitHubAuth} className="mb-2">
        {mode === 'signup' && (
          <div className={validation ? 'mb-2' : 'mb-4'}>
            <label
              htmlFor="username"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Choose a username
            </label>
            <div className="relative">
              <input
                type="text"
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-3 py-2 border rounded-md"
                required
                minLength={3}
                maxLength={30}
                pattern="[a-zA-Z0-9_-]+"
                title="Username can contain letters, numbers, underscores, hyphens, and emojis"
              />
              {validation && (
                <div className="mt-1">
                  {validation.isValid ? (
                    <div className="text-green-600 flex items-center gap-1">
                      <CheckCircle size={16} />
                      <span>Username available</span>
                    </div>
                  ) : (
                    <div className="text-red-500">
                      {validation.errors.map((error, i) => (
                        <div key={i} className="flex items-center gap-1">
                          <XCircle size={16} />
                          <span>{error}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        <button
          type="submit"
          disabled={isLoading || (mode === 'signup' && !username.trim())}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-black text-white rounded-md hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed mb-2"
        >
          {isLoading ? (
            <Loader2 className="animate-spin" size={20} />
          ) : (
            <Github size={20} />
          )}
          Continue with GitHub
        </button>

        <button
          type="button"
          onClick={handleGoogleAuth}
          disabled={isLoading || (mode === 'signup' && !username.trim())}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-white text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              fill="#4285F4"
            />
            <path
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              fill="#34A853"
            />
            <path
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              fill="#FBBC05"
            />
            <path
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              fill="#EA4335"
            />
          </svg>
          Continue with Google
        </button>
      </form>

      <div className="opacity-50">
        <button
          disabled
          className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gray-200 text-gray-700 rounded-md mb-2"
        >
          Coming soon: X
        </button>
      </div>

      {mode === 'signup' && (
        <p className="text-xs text-center text-gray-500 mt-4">
          By continuing, you agree to our Terms of Service and Privacy Policy
        </p>
      )}
    </Modal>
  )
}

export default AuthModal
