import { RunResponse } from './generations'

export interface Tag {
  id: string
  name: string
}

export interface TagResponse {
  data: Tag[]
  total: number
}

export interface PromptFormData {
  name: string
  buildSpecification: string
  tags: string[]
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
  tags: Tag[]
}
