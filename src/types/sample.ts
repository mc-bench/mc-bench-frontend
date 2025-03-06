export enum SampleApprovalState {
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  PENDING_APPROVAL = 'PENDING_APPROVAL',
}

export interface TestSet {
  id: string
  name: string
  description: string
}

export interface Sample {
  id: string
  created: string
  result_inspiration_text?: string
  result_description_text?: string
  result_code_text?: string
  raw?: string
  last_modified?: string
  last_modified_by?: string
  is_pending: boolean
  is_complete: boolean
  approval_state?: SampleApprovalState
  testSetId?: string
}

export interface PagedSampleResponse {
  data: Sample[]
  paging: {
    page: number
    page_size: number
    total_pages: number
    total_items: number
    has_next: boolean
    has_previous: boolean
  }
}

export interface SampleDetailResponse {
  id: string
  created: string
  createdBy: string
  resultInspirationText: string | null
  resultDescriptionText: string | null
  resultCodeText: string | null
  raw: string | null
  lastModified: string | null
  lastModifiedBy: string | null
  isPending: boolean
  isComplete: boolean
  approvalState: 'APPROVED' | 'REJECTED' | null
  run: Omit<import('./runs').RunData, 'samples' | 'artifacts'>
  artifacts: import('./artifacts').Artifact[]
  logs: {
    id: string
    kind: string
    note: string
    created: string
    createdBy: string
    action: string
  }[]
  experimentalState: import('./common').ExperimentalState | null
  testSetId?: string
}
