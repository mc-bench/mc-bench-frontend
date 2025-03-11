import { Model } from './models.ts'
import { Prompt } from './prompts.ts'
import { Template } from './templates.ts'

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

export interface ImageArtifact {
  url: string
  caption: string
}

export interface Sample {
  id: string
  created: string
  resultInspirationText: string | null
  resultDescriptionText: string | null
  resultCodeText: string | null
  raw: string | null
  lastModified: string | null
  lastModifiedBy: string | null
}

export interface Artifact {
  id: string
  created: string
  kind: string
  bucket: string
  key: string
}

export interface RunStage {
  id: string
  stage: string
  state: string
  progress: number
  note: string | null
  taskId?: string // Changed from task_id to taskId to match API convention
  heartbeat?: string
}

export interface RunListData {
  id: string
  created: string
  createdBy: string
  lastModified: string | null
  lastModifiedBy: string | null
  prompt: Prompt
  model: Model
  template: Template
  status: string
  generationId: string | null
  stages?: RunStage[]
}

export interface RunData {
  id: string
  created: string
  createdBy: string
  lastModified: string | null
  lastModifiedBy: string | null
  generationId: string | null
  prompt: Prompt
  model: Model
  template: Template
  status: string
  samples: Sample[]
  artifacts: Artifact[]
}
