export interface User {
  username: string
  scopes: string[]
}

export interface AuthContextType {
  token: string | null
  user: User | null
  setUser: (user: User | null) => void
  login: (accessToken: string, refreshToken: string) => Promise<User>
  logout: () => void
  isAuthenticated: boolean
  isLoading: boolean
  loginInProgress: boolean
  showLoginModal?: () => void
}

export interface TokenResponse {
  access_token: string
}
