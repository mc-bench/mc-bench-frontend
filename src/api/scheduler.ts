import { adminAPI } from './client'

export interface SchedulerControl {
  key: string
  value: any
  description: string | null
  created: string
  last_modified: string | null
}

export interface SchedulerControlsListResponse {
  controls: SchedulerControl[]
}

export interface SchedulerControlUpdateRequest {
  value: any
  description?: string | null
}

// Fetch all scheduler controls
export async function getSchedulerControls(): Promise<SchedulerControlsListResponse> {
  const response = await adminAPI.get('/infra/scheduler/controls')
  return response.data
}

// Fetch a specific scheduler control
export async function getSchedulerControl(
  key: string
): Promise<SchedulerControl> {
  const response = await adminAPI.get(`/infra/scheduler/controls/${key}`)
  return response.data
}

// Update a scheduler control
export async function updateSchedulerControl(
  key: string,
  data: SchedulerControlUpdateRequest
): Promise<SchedulerControl> {
  const response = await adminAPI.put(`/infra/scheduler/controls/${key}`, data)
  return response.data
}
