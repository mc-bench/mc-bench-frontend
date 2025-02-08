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

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <h2 className="text-2xl font-bold mb-4">
        {mode === 'signup' ? 'Sign Up' : 'Log In'}
      </h2>

      <form onSubmit={handleGitHubAuth} className="mb-4">
        {mode === 'signup' && (
          <div className="mb-4">
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
          className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-black text-white rounded-md hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <Loader2 className="animate-spin" size={20} />
          ) : (
            <Github size={20} />
          )}
          Continue with GitHub
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
