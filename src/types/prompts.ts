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
  buildSize: string | null
}

export interface LogResponse {
  id: string
  created: string
  createdBy: string
  note: string
  kind: string
  action: string
  proposal?: ProposalResponse
}

export interface ProposalResponse {
  id: string
  created: string
  createdBy: string
  proposedState: string
  accepted: boolean
  acceptedAt?: string
  acceptedBy?: string
  rejected: boolean
  rejectedAt?: string
  rejectedBy?: string
  log?: LogResponse
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
  experimentalState: string
  logs?: LogResponse[]
  proposals?: ProposalResponse[]
  buildSize?: string | null
}
