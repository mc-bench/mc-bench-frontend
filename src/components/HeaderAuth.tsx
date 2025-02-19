import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { useAuth } from '../hooks/useAuth'
import AuthModal from './AuthModal'

const HeaderAuth = () => {
  const { isAuthenticated, user, logout } = useAuth()
  const navigate = useNavigate()
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false)
  const [authMode, setAuthMode] = useState<'signup' | 'login'>('signup')

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  const openAuthModal = (mode: 'signup' | 'login') => {
    setAuthMode(mode)
    setIsAuthModalOpen(true)
  }

  return (
    <div>
      {isAuthenticated && user ? (
        <div className="flex items-center gap-4">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
            {user.username}
          </span>
          <button
            onClick={handleLogout}
            className="text-sm px-3 py-1 rounded bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200"
          >
            Logout
          </button>
        </div>
      ) : (
        <>
          <div className="flex items-center gap-2">
            <button
              onClick={() => openAuthModal('signup')}
              className="text-sm px-3 py-1 rounded bg-blue-500 text-white hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700"
            >
              Sign Up
            </button>
            <button
              onClick={() => openAuthModal('login')}
              className="text-sm px-3 py-1 rounded border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              Log in
            </button>
          </div>
          <AuthModal
            isOpen={isAuthModalOpen}
            onClose={() => setIsAuthModalOpen(false)}
            isLoading={false}
            mode={authMode}
          />
        </>
      )}
    </div>
  )
}

export default HeaderAuth
