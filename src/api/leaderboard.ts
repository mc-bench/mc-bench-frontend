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
  minVotes: number = 1
): Promise<LeaderboardResponse> => {
  try {
    const params = new URLSearchParams()
    params.append('metricName', metricName)
    params.append('testSetName', testSetName)
    if (tagName) params.append('tagName', tagName)
    if (limit) params.append('limit', limit.toString())
    if (minVotes) params.append('minVotes', minVotes.toString())

    const response = await api.get<LeaderboardResponse>(
      `/leaderboard?${params.toString()}`
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
    params.append('metricName', metricName)
    params.append('testSetName', testSetName)
    params.append('modelSlug', modelSlug)
    if (tagName) params.append('tagName', tagName)

    const response = await api.get<ModelStatisticsResponse>(
      `/leaderboard/model/stats?${params.toString()}`
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
  minVotes: number = 1,
  tagName?: string
): Promise<PromptLeaderboardResponse> => {
  try {
    const params = new URLSearchParams()
    params.append('metricName', metricName)
    params.append('testSetName', testSetName)
    params.append('modelSlug', modelSlug)
    params.append('page', page.toString())
    params.append('pageSize', pageSize.toString())
    params.append('minVotes', minVotes.toString())
    if (tagName) params.append('tagName', tagName)

    const response = await api.get<PromptLeaderboardResponse>(
      `/leaderboard/model/prompts?${params.toString()}`
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
    const response = await api.get<MetricOption[]>('/leaderboard/metrics')
    return response.data
  } catch (error) {
    console.error('Error fetching metrics:', error)
    throw error
  }
}

export const getAllMetrics = async (): Promise<MetricOption[]> => {
  try {
    // This endpoint returns all metrics, not just leaderboard ones
    const response = await api.get<MetricOption[]>('/metrics')
    return response.data
  } catch (error) {
    console.error('Error fetching all metrics:', error)
    throw error
  }
}

export const getTestSets = async (): Promise<TestSetOption[]> => {
  try {
    const response = await api.get<TestSetOption[]>('/leaderboard/test-sets')
    return response.data
  } catch (error) {
    console.error('Error fetching test sets:', error)
    throw error
  }
}

export const getTags = async (): Promise<TagOption[]> => {
  try {
    const response = await api.get<TagOption[]>('/leaderboard/tags')
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
  promptName?: string,
  minVotes: number = 1
): Promise<ModelSamplesResponse> => {
  try {
    const params = new URLSearchParams()
    params.append('metricName', metricName)
    params.append('testSetName', testSetName)
    params.append('modelSlug', modelSlug)
    params.append('page', page.toString())
    params.append('pageSize', pageSize.toString())
    params.append('minVotes', minVotes.toString())

    if (tagName) params.append('tagName', tagName)
    if (promptName) params.append('promptName', promptName)

    const response = await api.get<ModelSamplesResponse>(
      `/leaderboard/model/samples?${params.toString()}`
    )

    return response.data
  } catch (error) {
    console.error(`Error fetching model samples for ${modelSlug}:`, error)
    throw error
  }
}
