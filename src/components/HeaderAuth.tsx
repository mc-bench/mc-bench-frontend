import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { useAuth } from '../hooks/useAuth'
import AuthModal from './AuthModal'

const HeaderAuth = () => {
  const { isAuthenticated, user, logout } = useAuth()
  const navigate = useNavigate()
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false)

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  return (
    <div>
      {isAuthenticated && user ? (
        <div className="flex items-center gap-4">
          <span className="text-sm font-medium">{user.username}</span>
          <button
            onClick={handleLogout}
            className="text-sm px-3 py-1 rounded bg-gray-200 hover:bg-gray-300 transition-colors"
          >
            Logout
          </button>
        </div>
      ) : (
        <>
          <button
            onClick={() => setIsAuthModalOpen(true)}
            className="text-sm px-3 py-1 rounded bg-blue-500 text-white hover:bg-blue-600 transition-colors"
          >
            Sign Up
          </button>
          <AuthModal
            isOpen={isAuthModalOpen}
            onClose={() => setIsAuthModalOpen(false)}
            isLoading={false}
          />
        </>
      )}
    </div>
  )
}

export default HeaderAuth
