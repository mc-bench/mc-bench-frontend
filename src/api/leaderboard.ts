import type {
  ComparisonBatchRequest,
  ComparisonBatchResponse,
  ComparisonResultResponse,
  LeaderboardResponse,
  MetricOption,
  ModelSamplesResponse,
  ModelStatisticsResponse,
  PromptLeaderboardResponse,
  SampleResponse,
  TagOption,
  TestSetOption,
  UserComparisonRequest,
} from '../types/leaderboard'
import { api } from './client'

// Leaderboard API endpoints
export const getLeaderboard = async (
  metricName: string,
  testSetName: string,
  tagName?: string,
  limit: number = 20,
  minVotes: number = 10
): Promise<LeaderboardResponse> => {
  try {
    const params = new URLSearchParams()
    if (tagName) params.append('tag_name', tagName)
    if (limit) params.append('limit', limit.toString())
    if (minVotes) params.append('min_votes', minVotes.toString())

    const response = await api.get<LeaderboardResponse>(
      `/leaderboard/${metricName}/${testSetName}?${params.toString()}`
    )

    return response.data
  } catch (error) {
    console.error(
      `Error fetching leaderboard for ${metricName}/${testSetName}:`,
      error
    )
    throw error
  }
}

export const getModelStatistics = async (
  metricName: string,
  testSetName: string,
  modelSlug: string,
  tagName?: string
): Promise<ModelStatisticsResponse> => {
  try {
    const params = new URLSearchParams()
    if (tagName) params.append('tag_name', tagName)

    const response = await api.get<ModelStatisticsResponse>(
      `/leaderboard/${metricName}/${testSetName}/${modelSlug}/stats?${params.toString()}`
    )

    return response.data
  } catch (error) {
    console.error(`Error fetching model statistics for ${modelSlug}:`, error)
    throw error
  }
}

export const getPromptLeaderboard = async (
  metricName: string,
  testSetName: string,
  modelSlug: string,
  page: number = 1,
  pageSize: number = 20,
  minVotes: number = 5,
  tagName?: string
): Promise<PromptLeaderboardResponse> => {
  try {
    const params = new URLSearchParams()
    params.append('page', page.toString())
    params.append('page_size', pageSize.toString())
    params.append('min_votes', minVotes.toString())
    if (tagName) params.append('tag_name', tagName)

    const response = await api.get<PromptLeaderboardResponse>(
      `/leaderboard/${metricName}/${testSetName}/${modelSlug}/prompts?${params.toString()}`
    )

    return response.data
  } catch (error) {
    console.error(`Error fetching prompt leaderboard for ${modelSlug}:`, error)
    throw error
  }
}

// Metadata API endpoints
export const getMetrics = async (): Promise<MetricOption[]> => {
  try {
    const response = await api.get<MetricOption[]>('/leaderboard/metric')
    return response.data
  } catch (error) {
    console.error('Error fetching metrics:', error)
    throw error
  }
}

export const getAllMetrics = async (): Promise<MetricOption[]> => {
  try {
    // This endpoint returns all metrics, not just leaderboard ones
    const response = await api.get<MetricOption[]>('/metric')
    return response.data
  } catch (error) {
    console.error('Error fetching all metrics:', error)
    throw error
  }
}

export const getTestSets = async (): Promise<TestSetOption[]> => {
  try {
    const response = await api.get<TestSetOption[]>('/leaderboard/test-set')
    return response.data
  } catch (error) {
    console.error('Error fetching test sets:', error)
    throw error
  }
}

export const getTags = async (): Promise<TagOption[]> => {
  try {
    const response = await api.get<TagOption[]>('/leaderboard/tag')
    return response.data
  } catch (error) {
    console.error('Error fetching tags:', error)
    throw error
  }
}

// Comparison API endpoints
export const getComparisonBatch = async (
  request: ComparisonBatchRequest
): Promise<ComparisonBatchResponse> => {
  try {
    const response = await api.post<ComparisonBatchResponse>(
      '/comparison/batch',
      request
    )
    return response.data
  } catch (error) {
    console.error('Error fetching comparison batch:', error)
    throw error
  }
}

export const submitComparisonResult = async (
  request: UserComparisonRequest
): Promise<ComparisonResultResponse> => {
  try {
    const response = await api.post<ComparisonResultResponse>(
      '/comparison/result',
      request
    )
    return response.data
  } catch (error) {
    console.error('Error submitting comparison result:', error)
    throw error
  }
}

// Sample API endpoints
export const getSample = async (
  externalId: string
): Promise<SampleResponse> => {
  try {
    const response = await api.get<SampleResponse>(`/sample/${externalId}`)
    return response.data
  } catch (error) {
    console.error(`Error fetching sample ${externalId}:`, error)
    throw error
  }
}

export const getModelSamples = async (
  metricName: string,
  testSetName: string,
  modelSlug: string,
  page: number = 1,
  pageSize: number = 20,
  tagName?: string,
  promptName?: string
): Promise<ModelSamplesResponse> => {
  try {
    const params = new URLSearchParams()
    params.append('page', page.toString())
    params.append('page_size', pageSize.toString())

    if (tagName) params.append('tag_name', tagName)
    if (promptName) params.append('prompt_name', promptName)

    // URL encode path parameters for safety
    const encodedMetricName = encodeURIComponent(metricName)
    const encodedTestSetName = encodeURIComponent(testSetName)
    const encodedModelSlug = encodeURIComponent(modelSlug)

    const response = await api.get<ModelSamplesResponse>(
      `/leaderboard/${encodedMetricName}/${encodedTestSetName}/${encodedModelSlug}/samples?${params.toString()}`
    )

    return response.data
  } catch (error) {
    console.error(`Error fetching model samples for ${modelSlug}:`, error)
    throw error
  }
}
