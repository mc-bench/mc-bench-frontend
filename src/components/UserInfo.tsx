import { useAuth } from '../hooks/useAuth'

export const UserInfo: React.FC = () => {
  const { user, logout } = useAuth()

  return (
    <div className="flex items-center gap-4">
      {user && (
        <>
          <span className="text-sm font-medium">{user.username}</span>
          <button
            onClick={logout}
            className="text-sm px-3 py-1 rounded-sm bg-gray-200 hover:bg-gray-300 transition-colors"
          >
            Logout
          </button>
        </>
      )}
    </div>
  )
}
