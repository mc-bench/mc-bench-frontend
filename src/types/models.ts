import { RunResponse } from './generations'

export interface Provider {
  id?: string
  name: string
  providerClass: string
  config: Record<string, any>
  isDefault?: boolean
  _configStr?: string // Temporary field for editing
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
  acceptedLog?: LogResponse
  rejectedLog?: LogResponse
}

export interface Model {
  id: string
  slug: string
  name: string
  providers: Provider[]
  created: string
  createdBy: string
  lastModified?: string
  lastModifiedBy?: string
  active: boolean
  usage: number
  runs?: RunResponse[]
  experimentalState: string
  logs?: LogResponse[]
  proposals?: ProposalResponse[]
  pendingProposalCount?: number
  observationalNoteCount?: number
}

export interface ModelFormData {
  slug: string
  name: string
  providers: Provider[]
}

export interface ProviderClass {
  id: string
  name: string
}

export interface ExperimentalState {
  id: string
  name: string
}

// Request types
export interface ModelExperimentalStateProposalRequest {
  currentState: string
  proposedState: string
  note?: string
}

export interface ModelExperimentalStateApprovalRequest {
  note?: string
}

export interface ModelExperimentalStateRejectionRequest {
  note?: string
}

export interface ModelObservationRequest {
  note: string
}
