import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

import { ExternalLink, Search } from 'lucide-react'

import { adminAPI } from '../api/client'
import { User } from '../types/users'

const SearchUsers = () => {
  const [searchTerm, setSearchTerm] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState(searchTerm)
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Debounce the search term updates
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setDebouncedSearch(searchTerm)
    }, 300)

    return () => clearTimeout(timeoutId)
  }, [searchTerm])

  useEffect(() => {
    const fetchUsers = async () => {
      if (!debouncedSearch) {
        setUsers([])
        return
      }

      try {
        setLoading(true)
        setError(null)
        const { data } = await adminAPI.get(
          `/user/search?username=${debouncedSearch}&limit=100`
        )
        setUsers(
          data.data.map((user: any) => ({
            ...user,
            roles: user.roles || [],
          }))
        )
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch users')
      } finally {
        setLoading(false)
      }
    }

    fetchUsers()
  }, [debouncedSearch])

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">User Search</h1>

      <div className="mb-6">
        <div className="relative">
          <Search
            className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
            size={20}
          />
          <input
            type="search"
            name="search-users"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search users by username..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck="false"
            data-form-type="search"
            data-lpignore="true"
            data-1p-ignore
          />
        </div>
      </div>

      {error && (
        <div className="text-red-600 bg-red-50 border border-red-200 rounded-md p-4 mb-6">
          {error}
        </div>
      )}

      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Loading...</div>
        ) : users.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            {searchTerm ? 'No users found' : 'Start typing to search users'}
          </div>
        ) : (
          <div className="divide-y">
            {users.map((user) => (
              <div
                key={user.id}
                className="p-4 flex items-center justify-between"
              >
                <div>
                  <div className="font-medium">{user.username}</div>
                  <div className="text-sm text-gray-500">ID: {user.id}</div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {user.roles.map((role) => (
                      <span
                        key={role.id}
                        className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                      >
                        {role.name}
                      </span>
                    ))}
                  </div>
                </div>
                <Link
                  to={`/admin/users/${user.id}`}
                  className="flex items-center gap-1 text-blue-600 hover:text-blue-800"
                >
                  <ExternalLink size={16} />
                  <span>Manage</span>
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default SearchUsers
