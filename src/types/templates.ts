import { RunResponse } from './generations.ts'

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

export interface Template {
  id: string
  name: string
  description: string
  content: string
  created: string
  createdBy: string
  lastModified: string
  lastModifiedBy: string
  active: boolean
  frozen: boolean
  usage: number
  runs?: RunResponse[]
  experimentalState: string
  logs?: LogResponse[]
  proposals?: ProposalResponse[]
  tags?: TemplateTag[]
  observationalNoteCount: number
  pendingProposalCount: number
}

export interface TemplateTag {
  id: string
  name: string
}

export interface TemplateTagResponse {
  data: TemplateTag[]
  total: number
}

export interface TemplateFormData {
  name: string
  description: string
  content: string
  tags: string[]
}
