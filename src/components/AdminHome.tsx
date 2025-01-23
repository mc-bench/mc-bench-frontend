import { useEffect } from 'react'

import { api } from '../api/client'
import { UserInfo } from '../components/UserInfo'
import { useAuth } from '../hooks/useAuth'

export const AdminHome: React.FC = () => {
  const { setUser } = useAuth()

  useEffect(() => {
    // Fetch user data when component mounts
    api
      .get('/me')
      .then((response) => {
        setUser({
          username: response.data.username,
          scopes: response.data.scopes,
        })
      })
      .catch((error) => {
        console.error('Error fetching user data:', error)
      })
  }, [setUser])

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-gray-900">
              Admin Dashboard
            </h1>
            <UserInfo />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-medium mb-4">
            Welcome to the Admin Dashboard
          </h2>
          <p className="text-gray-600">
            This is a protected page that can only be accessed by authenticated
            users.
          </p>
        </div>
      </main>
    </div>
  )
}
