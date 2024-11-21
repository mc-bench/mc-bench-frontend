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
  prompt: PromptResponse
  model: ModelResponse
  template: TemplateResponse
  status: string
}

export interface GenerationResponseWithRuns extends GenerationResponse {
  runs: RunResponse[]
}
