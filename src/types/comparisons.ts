export interface NewComparisonBatchRequest {
  batchSize: number
  metricId: string
}

export interface ComparisonDetail {
  token: string
  samples: string[]
}

export interface UserComparisonRequest {
  comparisonDetails: ComparisonDetail
  // The new format uses a nested array structure
  // For a clear win: [[winnerId], [loserId]]
  // For a tie: [[id1, id2]]
  orderedSampleIds: string[][]
}

export interface AssetFile {
  kind: string
  url?: string
  bucket?: string
  key?: string
}

export interface AssetDetailResponse {
  sampleId: string
  files: AssetFile[]
}

export interface ComparisonResponse {
  token: string
  metricId: string
  samples: string[]
  buildDescription: string
  assets: AssetDetailResponse[]
  models: string[]
}

export interface ComparisonBatchResponse {
  comparisons: ComparisonResponse[]
}

export interface ComparisonResultResponse {
  sample_1_model: string
  sample_2_model: string
}

export interface QueuedComparison extends ComparisonResponse {
  fetchedAt: number
}

export interface ModelData {
  name?: string
  modelPath: string
  sampleId: string
}

export interface BuildPair {
  prompt: string
  modelA: ModelData
  modelB: ModelData
}

export interface MetricResponse {
  id: string
  name: string
  description: string
}

// Session and Identification header types
export interface SessionHeaders {
  'X-MCBench-Session'?: string
  'X-MCBench-Identification'?: string
}
