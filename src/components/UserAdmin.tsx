import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import { AlertCircle, ArrowLeft, Loader2, X } from 'lucide-react'

import { adminAPI } from '../api/client'
import { Role, User } from '../types/users'
import { SimpleSearchSelect } from './ui/SimpleSearchSelect'

const UserAdmin = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const [user, setUser] = useState<User | null>(null)
  const [allRoles, setAllRoles] = useState<Role[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [roleSearch, setRoleSearch] = useState('')
  const [saving, setSaving] = useState(false)
  const [pendingRoles, setPendingRoles] = useState<Role[] | null>(null)
  const [pendingPermissions, setPendingPermissions] = useState<{
    added: string[]
    removed: string[]
  } | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        const [userResponse, rolesResponse] = await Promise.all([
          adminAPI.get(`/user/${id}`),
          adminAPI.get('/auth/role'),
        ])
        setUser(userResponse.data)
        setAllRoles(rolesResponse.data.data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch data')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [id])

  const handleRoleChange = (selectedRoles: Role[]) => {
    setPendingRoles(selectedRoles)

    if (!user) return

    // Calculate permission changes
    const currentPermissions = new Set(
      user.roles.flatMap((role) => role.permissions)
    )
    const newPermissions = new Set(
      selectedRoles.flatMap((role) => role.permissions)
    )

    const added = [...newPermissions].filter((p) => !currentPermissions.has(p))
    const removed = [...currentPermissions].filter(
      (p) => !newPermissions.has(p)
    )

    // Only set pending permissions if there are actual changes
    if (added.length > 0 || removed.length > 0) {
      setPendingPermissions({ added, removed })
    } else {
      setPendingPermissions(null)
    }
  }

  const handleSaveRoles = async () => {
    if (!user || !pendingRoles) return

    try {
      setSaving(true)
      setError(null)

      await adminAPI.put(`/user/${user.id}/role`, {
        roles: pendingRoles.map((role) => role.id),
      })

      // Update local state
      setUser((prev) =>
        prev
          ? {
              ...prev,
              roles: pendingRoles,
              permissions: Array.from(
                new Set(pendingRoles.flatMap((role) => role.permissions))
              ),
            }
          : null
      )

      // Clear pending changes
      setPendingRoles(null)
      setPendingPermissions(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update roles')
    } finally {
      setSaving(false)
    }
  }

  const handleCancelChanges = () => {
    setPendingRoles(null)
    setPendingPermissions(null)
  }

  const hasVotingRole = user?.roles.some((role) => role.name === 'voter')
  const pendingHasVotingRole = pendingRoles?.some(
    (role) => role.name === 'voter'
  )

  if (loading) {
    return <div className="flex justify-center p-8">Loading...</div>
  }

  if (!user) {
    return <div className="text-red-600 p-4">User not found</div>
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => navigate('/admin/users')}
          className="text-gray-600 hover:text-gray-800"
        >
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-2xl font-bold">User Administration</h1>
      </div>

      {!hasVotingRole && !pendingHasVotingRole && (
        <div className="mb-6 bg-orange-50 border-l-4 border-orange-400 p-4">
          <div className="flex items-start">
            <AlertCircle className="h-5 w-5 text-orange-400 mt-0.5" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-orange-800">
                Warning: User May Be Shadow Banned
              </h3>
              <div className="mt-2 text-sm text-orange-700">
                This user does not have voting permissions. They may have been
                shadow banned. Do not restore voting permissions unless you are
                certain it is appropriate to do so.
              </div>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md flex items-center gap-2">
          <AlertCircle className="h-4 w-4" />
          <p>{error}</p>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6">
          <div className="grid gap-6">
            <div>
              <h2 className="text-lg font-semibold mb-2">User Details</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-500">
                    Username
                  </label>
                  <div className="mt-1 text-lg">{user.username}</div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500">
                    User ID
                  </label>
                  <div className="mt-1 text-lg">{user.id}</div>
                </div>
              </div>
            </div>

            <div>
              <h2 className="text-lg font-semibold mb-2">Roles</h2>
              <SimpleSearchSelect
                items={allRoles}
                selected={pendingRoles || user.roles}
                onSelectionChange={handleRoleChange}
                searchValue={roleSearch}
                onSearchChange={setRoleSearch}
                placeholder="roles"
                disabled={saving}
              />

              {pendingPermissions && (
                <div className="mt-4 border rounded-md p-4 bg-yellow-50">
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="font-medium">Pending Changes</h3>
                    <button
                      onClick={handleCancelChanges}
                      className="text-gray-500 hover:text-gray-700"
                      disabled={saving}
                    >
                      <X size={20} />
                    </button>
                  </div>

                  {pendingPermissions.added.length > 0 && (
                    <div className="mb-3">
                      <h4 className="text-sm font-medium text-green-700 mb-2">
                        Permissions to be added:
                      </h4>
                      <div className="grid grid-cols-2 gap-2">
                        {pendingPermissions.added.map((permission) => (
                          <div
                            key={permission}
                            className="text-sm px-2 py-1 bg-green-100 text-green-800 rounded"
                          >
                            {permission}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {pendingPermissions.removed.length > 0 && (
                    <div className="mb-3">
                      <h4 className="text-sm font-medium text-red-700 mb-2">
                        Permissions to be removed:
                      </h4>
                      <div className="grid grid-cols-2 gap-2">
                        {pendingPermissions.removed.map((permission) => (
                          <div
                            key={permission}
                            className="text-sm px-2 py-1 bg-red-100 text-red-800 rounded"
                          >
                            {permission}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex justify-end gap-3 mt-4">
                    <button
                      onClick={handleCancelChanges}
                      className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
                      disabled={saving}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSaveRoles}
                      className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
                      disabled={saving}
                    >
                      {saving && <Loader2 size={16} className="animate-spin" />}
                      {saving ? 'Saving...' : 'Save Changes'}
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div>
              <h2 className="text-lg font-semibold mb-2">
                Current Permissions
              </h2>
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <div className="grid grid-cols-2 gap-2">
                  {user.permissions.map((permission) => (
                    <div
                      key={permission}
                      className="text-sm px-2 py-1 bg-white rounded border border-gray-200"
                    >
                      {permission}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default UserAdmin
