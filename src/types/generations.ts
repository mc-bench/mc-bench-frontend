import { Prompt } from './prompts.ts'
import { Template } from './templates.ts'
import { Model } from './models.ts'

export interface GenerationResponse {
  id: string
  created: string
  createdBy: string
  name: string
  description: string
  runCount: number
  status: string
}

export interface RunResponse {
  id: string
  created: string
  createdBy: string
  name: string
  lastModified: string
  lastModifiedBy?: string
  prompt: Prompt
  model: Model
  template: Template
  status: string
  error?: string
}

export interface GenerationResponseWithRuns extends GenerationResponse {
  runs: RunResponse[]
}
