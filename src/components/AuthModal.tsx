import React, { useState } from 'react'

import { Github, Loader2 } from 'lucide-react'

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

  const handleGitHubAuth = (e: React.FormEvent) => {
    e.preventDefault()
    if (mode === 'signup' && !username.trim()) return

    if (mode === 'signup') {
      localStorage.setItem('preferred_username', username.trim())
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
            <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">
              Choose a username
            </label>
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
              title="Username can only contain letters, numbers, underscores, and hyphens"
            />
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
