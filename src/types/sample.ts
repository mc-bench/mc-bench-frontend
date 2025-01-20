export enum SampleApprovalState {
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  PENDING_APPROVAL = 'PENDING_APPROVAL',
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
