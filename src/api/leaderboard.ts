import type {
  LeaderboardResponse,
  ModelStatisticsResponse,
  PromptLeaderboardResponse,
} from '../types/leaderboard'
import { api } from './client'

export const getLeaderboard = async (
  metricId: string,
  testSetId: string,
  tagId?: string,
  limit: number = 20,
  minVotes: number = 10
): Promise<LeaderboardResponse> => {
  const params = new URLSearchParams()
  if (tagId) params.append('tag_id', tagId)
  if (limit) params.append('limit', limit.toString())
  if (minVotes) params.append('min_votes', minVotes.toString())

  const response = await api.get<any>(
    `/leaderboard/${metricId}/${testSetId}?${params.toString()}`
  )

  // Ensure the response data conforms to our expected format
  const responseData = response.data

  // Just return the raw response data as is since we've updated our types
  const normalizedResponse: LeaderboardResponse = responseData

  return normalizedResponse
}

export const getModelStatistics = async (
  metricId: string,
  testSetId: string,
  modelId: string,
  tagId?: string
): Promise<ModelStatisticsResponse> => {
  const params = new URLSearchParams()
  if (tagId) params.append('tag_id', tagId)

  const response = await api.get<any>(
    `/leaderboard/${metricId}/${testSetId}/${modelId}/stats?${params.toString()}`
  )

  // Ensure the response data conforms to our expected format
  const responseData = response.data

  // Just return the raw response data as is since we've updated our types
  const normalizedResponse: ModelStatisticsResponse = responseData

  return normalizedResponse
}

export const getPromptLeaderboard = async (
  metricId: string,
  testSetId: string,
  modelId: string,
  page: number = 1,
  pageSize: number = 20,
  minVotes: number = 5,
  tagId?: string
): Promise<PromptLeaderboardResponse> => {
  const params = new URLSearchParams()
  params.append('page', page.toString())
  params.append('page_size', pageSize.toString())
  params.append('min_votes', minVotes.toString())
  if (tagId) params.append('tag_id', tagId)

  const response = await api.get<any>(
    `/leaderboard/${metricId}/${testSetId}/${modelId}/prompts?${params.toString()}`
  )

  // Ensure the response data conforms to our expected format
  const responseData = response.data

  // Just return the raw response data as is since we've updated our types
  const normalizedResponse: PromptLeaderboardResponse = responseData

  return normalizedResponse
}

// API endpoints for metrics, test sets, and tags
export const getMetrics = async () => {
  const response = await api.get('/leaderboard/metric')
  return response.data
}

export const getTestSets = async () => {
  const response = await api.get('/leaderboard/test-set')
  return response.data
}

export const getTags = async () => {
  const response = await api.get('/leaderboard/tag')
  return response.data
}
