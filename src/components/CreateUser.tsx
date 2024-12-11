import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { api } from '../api/client'

const CreateUser: React.FC = () => {
  const navigate = useNavigate()
  const [username, setUsername] = useState<string>('')
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [error, setError] = useState<string>('')

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    try {
      await api.post('/user', { username })
      navigate('/')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create user')
      setIsLoading(false)
    }
  }

  return (
    <div className="w-full max-w-md mx-auto mt-8 p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-6">Create New User</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="text"
          value={username}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            setUsername(e.target.value)
          }
          placeholder="Username"
          disabled={isLoading}
          className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        {error && <p className="text-sm text-red-500">{error}</p>}
        <button
          type="submit"
          disabled={isLoading}
          className="w-full px-4 py-2 text-white bg-blue-500 rounded-md hover:bg-blue-600 disabled:opacity-50"
        >
          {isLoading ? 'Creating...' : 'Create User'}
        </button>
      </form>
    </div>
  )
}

export default CreateUser
