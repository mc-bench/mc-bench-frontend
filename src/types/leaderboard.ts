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

export interface ModelStatisticsResponse {
  model: {
    id: string
    name: string
    slug: string
    created: string
    created_by: string
    last_modified: string | null
    active: boolean
    usage: number
    observational_note_count: number
    pending_proposal_count: number
    experimental_state: string
    last_modified_by: string | null
    providers: {
      id: string
      name: string
      provider_class: string
      config: any
      is_default: boolean
    }[]
  }
  sample_count: number
  global_stats: {
    avg_elo: number
    total_votes: number
    total_wins: number
    total_losses: number
    total_ties: number
    win_rate: number
  }
  quartile_stats?: QuartileStats[] // For backward compatibility
  bucket_stats: BucketStats[] // New field with 10 buckets
  // For backward compatibility
  best_samples?: {
    sample_id: string
    elo_score: number
    win_rate: number
    vote_count: number
  }[]
  // New field with prompt information
  top_samples?: {
    id: string
    elo_score: number
    win_rate: number
    vote_count: number
    prompt_id: string
    prompt_name: string
  }[]
}

export interface QuartileStats {
  quartile: number // 1-4
  sample_count: number
  avg_elo: number
  win_rate: number
  total_votes: number
  total_wins: number
  total_losses: number
  total_ties: number
}

export interface BucketStats {
  bucket: number // 1-10 for deciles
  sample_count: number
  avg_elo: number
  win_rate: number
  total_votes: number
  total_wins: number
  total_losses: number
  total_ties: number
  model_name: string // Added model name for display
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
}

export interface TagOption {
  id: string
  name: string
}
