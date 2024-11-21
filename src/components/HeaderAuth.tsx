import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

const HeaderAuth = () => {
  const { isAuthenticated, user, logout } = useAuth()
  const navigate = useNavigate()

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
        <Link
          to="/login"
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          Login
        </Link>
      )}
    </div>
  )
}

export default HeaderAuth
