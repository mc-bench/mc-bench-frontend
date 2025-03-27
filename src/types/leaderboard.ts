export interface LeaderboardResponse {
  metric: {
    id: string
    name: string
    description: string
  }
  testSetId: string
  testSetName: string
  entries: LeaderboardEntry[]
}

export interface LeaderboardEntry {
  eloScore: number
  voteCount: number
  winCount: number
  lossCount: number
  tieCount: number
  lastUpdated: string // ISO format timestamp
  model: {
    id: string
    name: string
    slug: string
  }
  tag?: {
    id: string
    name: string
  } | null
}

export interface GlickoLeaderboardResponse {
  metric: {
    id: string
    name: string
    description: string
  }
  testSetId: string
  testSetName: string
  entries: GlickoLeaderboardEntry[]
}

export interface GlickoLeaderboardEntry {
  glickoRating: number
  ratingDeviation: number
  volatility: number
  voteCount: number
  winCount: number
  lossCount: number
  tieCount: number
  lastUpdated: string // ISO format timestamp
  model: {
    id: string
    name: string
    slug: string
  }
  tag?: {
    id: string
    name: string
  } | null
}

export interface ModelStatisticsResponse {
  model: {
    id: string
    name: string
    slug: string
  }
  sampleCount: number
  globalStats?: {
    avgElo: number
    totalVotes: number
    totalWins: number
    totalLosses: number
    totalTies: number
    winRate: number
  }
  bucketStats?: BucketStats[]
  topSamples?: Array<{
    id: string
    eloScore: number
    winRate: number
    voteCount: number
    promptId: string
    promptName: string
  }>
  statistics?: {
    message: string
  }
}

export interface BucketStats {
  bucket: number // 1-10 for deciles
  sampleCount: number
  avgElo: number
  winRate: number
  totalVotes: number
  totalWins: number
  totalLosses: number
  totalTies: number
  modelName: string // For display purposes
}

export interface PromptLeaderboardResponse {
  metric: {
    id: string
    name: string
    description: string
  }
  testSetId: string
  testSetName: string
  modelId: string
  modelName: string
  modelSlug: string
  entries: PromptLeaderboardEntry[]
  paging: {
    page: number
    pageSize: number
    totalPages: number
    totalItems: number
    hasNext: boolean
    hasPrevious: boolean
  }
}

export interface PromptLeaderboardEntry {
  eloScore: number
  voteCount: number
  winCount: number
  lossCount: number
  tieCount: number
  lastUpdated: string // ISO format timestamp
  promptId: string
  promptName: string
  tag?: {
    id: string
    name: string
  } | null
}

export interface MetricOption {
  id: string
  name: string
  description: string
}

export interface TestSetOption {
  id: string
  name: string
  description: string
}

export interface TagOption {
  id: string
  name: string
}

export interface ComparisonBatchRequest {
  batchSize?: number
  metricId: string
  files?: string[]
}

export interface ComparisonBatchResponse {
  comparisons: Array<{
    token: string
    metricId: string
    samples: string[]
    buildDescription: string
    assets: Array<{
      sampleId: string
      files: Array<{
        kind: string
        url?: string
        bucket: string
        key: string
      }>
    }>
  }>
}

export interface UserComparisonRequest {
  comparisonDetails: {
    token: string
    samples: string[]
  }
  orderedSampleIds: Array<string | string[]>
}

export interface ComparisonResultResponse {
  sample1Model: string
  sample2Model: string
}

export interface SampleResponse {
  id: string
  created: string
  resultInspirationText?: string
  resultDescriptionText?: string
  resultCodeText?: string
  isComplete: boolean
  testSetId?: string
  experimentalState?: string
  approvalState?: string
  run: {
    model: {
      id: string
      name: string
      slug: string
    }
    prompt: {
      id: string
      name: string
      buildSpecification: string
      tags: Array<{
        id: string
        name: string
      }>
    }
    templateName: string
  }
  artifacts: Array<{
    id: string
    kind: string
    bucket: string
    key: string
  }>
  stats?: {
    eloScore?: number
    voteCount?: number
    winCount?: number
    lossCount?: number
    tieCount?: number
    winRate?: number
    lastUpdated?: string
  }
}

export interface ModelSamplesResponse {
  metric: {
    id: string
    name: string
    description: string
  }
  testSetId: string
  testSetName: string
  modelId: string
  modelName: string
  modelSlug: string
  samples: ModelSampleResponse[]
  paging: {
    page: number
    pageSize: number
    totalPages: number
    totalItems: number
    hasNext: boolean
    hasPrevious: boolean
  }
}

export interface ModelSampleResponse {
  id: string
  eloScore: number
  winRate: number
  voteCount: number
  winCount: number
  lossCount: number
  tieCount: number
  lastUpdated: string | null
  promptName: string | null
}
