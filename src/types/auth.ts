export interface User {
  username: string
  scopes: string[]
}

export interface AuthContextType {
  token: string | null
  user: User | null
  setUser: (user: User | null) => void
  login: (token: string) => Promise<User>
  logout: () => void
  isAuthenticated: boolean
  isLoading: boolean
  loginInProgress: boolean
}
