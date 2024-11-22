import { RunResponse } from './generations'

export interface PromptFormData {
  name: string
  buildSpecification: string
}

export interface Prompt {
  id: string
  name: string
  buildSpecification: string
  created: string
  createdBy: string
  lastModified: string
  lastModifiedBy: string
  active: boolean
  usage: number
  runs?: RunResponse[]
}
