export interface Run {
  id: string
  template_id: string
  prompt_id: string
  model_id: string
  orchestration_id?: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  created: string
  createdBy: string
  error?: string
}

export interface GenerateRunsRequest {
  name: string
  description: string
  template_ids: string[]
  prompt_ids: string[]
  model_ids: string[]
}

export interface Generation {
  id: string
  name: string
  description: string
  created: string
  createdBy: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  total_runs: number
  completed_runs: number
}
