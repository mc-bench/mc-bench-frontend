export interface Role {
  id: string
  name: string
  permissions: string[]
}

export interface User {
  id: string
  username: string
  roles: Role[]
  permissions: string[]
}

export interface UserListResponse {
  data: User[]
  total: number
}

export interface UpdateRolesRequest {
  roles: string[]
}
