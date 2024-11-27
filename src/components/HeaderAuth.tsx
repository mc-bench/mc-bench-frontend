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
    <div className="flex items-center space-x-4">
      {isAuthenticated ? (
        <>
          <span className="text-gray-700">{user?.username || 'User'}</span>
          <button
            onClick={handleLogout}
            className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
          >
            Logout
          </button>
        </>
      ) : (
        <>
          <button
            onClick={() => setIsAuthModalOpen(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Login
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
