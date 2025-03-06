import { useEffect, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'

import { ArrowLeft, BarChart3, ChevronRight, MessageSquare } from 'lucide-react'

import {
  getMetrics,
  getModelStatistics,
  getTestSets,
} from '../../api/leaderboard'
import {
  MetricOption,
  ModelStatisticsResponse,
  TestSetOption,
} from '../../types/leaderboard'
import BucketChart from './BucketChart'
import PromptLeaderboard from './PromptLeaderboard'

const ModelDetail = () => {
  const { modelId } = useParams<{ modelId: string }>()
  const [searchParams] = useSearchParams()
  const tagId = searchParams.get('tag') || undefined

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [stats, setStats] = useState<ModelStatisticsResponse | null>(null)
  const [metricId, setMetricId] = useState<string | null>(null)
  const [testSetId, setTestSetId] = useState<string | null>(null)

  // UI state for tab selection
  const [activeTab, setActiveTab] = useState<'performance' | 'prompts'>(
    'performance'
  )

  // Sorting state for top samples
  const [sortField, setSortField] = useState<
    'prompt_name' | 'elo_score' | 'win_rate' | 'vote_count'
  >('elo_score')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')

  // First, load the metric and test set IDs
  useEffect(() => {
    const loadMetadata = async () => {
      try {
        const [metricsData, testSetsData] = await Promise.all([
          getMetrics(),
          getTestSets(),
        ])

        // Find "UNQUALIFIED_BETTER" metric
        const unqualifiedBetterMetric = metricsData.find(
          (m: MetricOption) =>
            m.name === 'UNQUALIFIED_BETTER' ||
            m.name === 'Which build is better'
        )

        // Find "Authenticated Test Set"
        const authenticatedTestSet = testSetsData.find(
          (ts: TestSetOption) => ts.name === 'Authenticated Test Set'
        )

        if (unqualifiedBetterMetric) {
          setMetricId(unqualifiedBetterMetric.id)
          console.log(
            `Found UNQUALIFIED_BETTER metric with ID: ${unqualifiedBetterMetric.id}`
          )
        } else if (metricsData.length > 0) {
          setMetricId(metricsData[0].id)
          console.log(
            `UNQUALIFIED_BETTER metric not found, using first metric with ID: ${metricsData[0].id}`
          )
        }

        if (authenticatedTestSet) {
          setTestSetId(authenticatedTestSet.id)
          console.log(
            `Found Authenticated Test Set with ID: ${authenticatedTestSet.id}`
          )
        } else if (testSetsData.length > 0) {
          setTestSetId(testSetsData[0].id)
          console.warn(
            `Warning: Authenticated Test Set not found, falling back to first test set with ID: ${testSetsData[0].id}`
          )
        }
      } catch (err) {
        console.error('Error loading metadata:', err)
        setError('Failed to load metric and test set options.')
      }
    }

    loadMetadata()
  }, [])

  // Then, load the model stats once we have the metric and test set IDs
  useEffect(() => {
    if (!modelId || !metricId || !testSetId) {
      return
    }

    const loadModelStats = async () => {
      try {
        setLoading(true)
        const data = await getModelStatistics(
          metricId,
          testSetId,
          modelId,
          tagId
        )
        setStats(data)
        setError(null)
      } catch (err) {
        console.error('Error loading model statistics:', err)
        setError('Failed to load model statistics. Please try again.')
      } finally {
        setLoading(false)
      }
    }

    loadModelStats()
  }, [modelId, metricId, testSetId, tagId])

  // Construct back link with tag parameter if it exists
  const backToLeaderboard = tagId ? `/leaderboard?tag=${tagId}` : '/leaderboard'

  // Handle sorting for top samples
  const handleSortChange = (
    field: 'prompt_name' | 'elo_score' | 'win_rate' | 'vote_count'
  ) => {
    if (sortField === field) {
      // If already sorting by this field, toggle direction
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      // Otherwise, set the new field and default to descending for numerical values, ascending for text
      setSortField(field)
      setSortDirection(field === 'prompt_name' ? 'asc' : 'desc')
    }
  }

  // Sort top samples based on current sort state
  const getSortedSamples = () => {
    if (!stats) return []

    // Handle top_samples (new API format)
    if (stats.top_samples && stats.top_samples.length > 0) {
      return [...stats.top_samples].sort((a, b) => {
        if (sortField === 'prompt_name') {
          const comparison = a.prompt_name.localeCompare(b.prompt_name)
          return sortDirection === 'asc' ? comparison : -comparison
        } else if (sortField === 'elo_score') {
          const aValue = a.elo_score || 0
          const bValue = b.elo_score || 0
          return sortDirection === 'asc' ? aValue - bValue : bValue - aValue
        } else if (sortField === 'win_rate') {
          const aValue = a.win_rate || 0
          const bValue = b.win_rate || 0
          return sortDirection === 'asc' ? aValue - bValue : bValue - aValue
        } else {
          // vote_count
          const aValue = a.vote_count || 0
          const bValue = b.vote_count || 0
          return sortDirection === 'asc' ? aValue - bValue : bValue - aValue
        }
      })
    }

    // Handle best_samples (legacy format)
    if (stats.best_samples && stats.best_samples.length > 0) {
      return [...stats.best_samples].sort((a, b) => {
        if (sortField === 'prompt_name') {
          // For legacy samples without prompt names, sort by ID
          const aText = `Sample ${a.sample_id.substring(0, 8)}`
          const bText = `Sample ${b.sample_id.substring(0, 8)}`
          const comparison = aText.localeCompare(bText)
          return sortDirection === 'asc' ? comparison : -comparison
        } else if (sortField === 'elo_score') {
          const aValue = a.elo_score || 0
          const bValue = b.elo_score || 0
          return sortDirection === 'asc' ? aValue - bValue : bValue - aValue
        } else if (sortField === 'win_rate') {
          const aValue = a.win_rate || 0
          const bValue = b.win_rate || 0
          return sortDirection === 'asc' ? aValue - bValue : bValue - aValue
        } else {
          // vote_count
          const aValue = a.vote_count || 0
          const bValue = b.vote_count || 0
          return sortDirection === 'asc' ? aValue - bValue : bValue - aValue
        }
      })
    }

    return []
  }

  return (
    <div className="max-w-6xl mx-auto p-4 space-y-6">
      {/* Breadcrumb Navigation */}
      <nav className="flex items-center text-gray-500 dark:text-gray-400 text-sm">
        <Link
          to="/leaderboard"
          className="hover:text-gray-700 dark:hover:text-gray-300"
        >
          Leaderboard
        </Link>
        <ChevronRight className="h-4 w-4 mx-2" />
        <span className="text-gray-700 dark:text-gray-300">
          {stats ? stats.model.name : 'Model Details'}
        </span>
      </nav>

      {/* Back Link */}
      <div>
        <Link
          to={backToLeaderboard}
          className="inline-flex items-center text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Leaderboard
        </Link>
      </div>

      {/* Error State */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 text-red-800 dark:text-red-300">
          <p>{error}</p>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="py-20 flex justify-center items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      )}

      {/* Model Statistics */}
      {!loading && !error && stats && (
        <>
          {/* Header */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border border-gray-200 dark:border-gray-700">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {stats.model?.name || 'Unknown Model'}
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mt-2">
              Performance statistics across {stats.sample_count || 0} samples
            </p>
          </div>

          {/* Statistics Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-medium text-gray-700 dark:text-gray-300">
                Overall ELO Score
              </h3>
              <div className="mt-2 text-3xl font-bold text-gray-900 dark:text-gray-100">
                {stats.global_stats?.avg_elo
                  ? Math.round(stats.global_stats.avg_elo)
                  : 'N/A'}
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-medium text-gray-700 dark:text-gray-300">
                Win Rate
              </h3>
              <div className="mt-2 text-3xl font-bold text-gray-900 dark:text-gray-100">
                {stats.global_stats?.win_rate !== undefined
                  ? `${(stats.global_stats.win_rate * 100).toFixed(1)}%`
                  : 'N/A'}
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Wins: {stats.global_stats?.total_wins || 0} / Losses:{' '}
                {stats.global_stats?.total_losses || 0} / Ties:{' '}
                {stats.global_stats?.total_ties || 0}
              </p>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-medium text-gray-700 dark:text-gray-300">
                Total Votes
              </h3>
              <div className="mt-2 text-3xl font-bold text-gray-900 dark:text-gray-100">
                {stats.global_stats?.total_votes
                  ? stats.global_stats.total_votes.toLocaleString()
                  : '0'}
              </div>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="border-b border-gray-200 dark:border-gray-700">
              <div className="flex">
                <button
                  className={`py-4 px-6 inline-flex items-center ${
                    activeTab === 'performance'
                      ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400 dark:border-blue-400 font-medium'
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                  }`}
                  onClick={() => setActiveTab('performance')}
                >
                  <BarChart3 className="mr-2 h-5 w-5" />
                  Performance Distribution
                </button>
                <button
                  className={`py-4 px-6 inline-flex items-center ${
                    activeTab === 'prompts'
                      ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400 dark:border-blue-400 font-medium'
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                  }`}
                  onClick={() => setActiveTab('prompts')}
                >
                  <MessageSquare className="mr-2 h-5 w-5" />
                  Prompt Performance
                </button>
              </div>
            </div>

            <div className="p-6">
              {activeTab === 'performance' && (
                <div>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">
                    Performance Distribution
                  </h2>

                  {/* Use BucketChart with bucket_stats if available, otherwise fall back to quartile_stats */}
                  {stats.bucket_stats && stats.bucket_stats.length > 0 ? (
                    <BucketChart buckets={stats.bucket_stats} />
                  ) : stats.quartile_stats &&
                    stats.quartile_stats.length > 0 ? (
                    <BucketChart buckets={stats.quartile_stats} />
                  ) : (
                    <p className="text-gray-500 dark:text-gray-400">
                      No performance statistics available.
                    </p>
                  )}

                  {/* Description already included in the chart component */}
                </div>
              )}

              {activeTab === 'prompts' && metricId && testSetId && modelId && (
                <div>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">
                    Prompt Performance
                  </h2>

                  <PromptLeaderboard
                    metricId={metricId}
                    testSetId={testSetId}
                    modelId={modelId}
                    tagId={tagId}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Top Samples - Only shown in Performance tab */}
          {activeTab === 'performance' && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="p-6">
                <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">
                  Top Performing Samples
                </h2>

                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-gray-50 dark:bg-gray-700 border-b dark:border-gray-600 text-left">
                        <th
                          className="px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer select-none"
                          onClick={() => handleSortChange('prompt_name')}
                        >
                          <div className="flex items-center">
                            Prompt
                            {sortField === 'prompt_name' && (
                              <span className="ml-1">
                                {sortDirection === 'asc' ? '↑' : '↓'}
                              </span>
                            )}
                          </div>
                        </th>
                        <th
                          className="px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider text-right cursor-pointer select-none"
                          onClick={() => handleSortChange('elo_score')}
                        >
                          <div className="flex items-center justify-end">
                            ELO Score
                            {sortField === 'elo_score' && (
                              <span className="ml-1">
                                {sortDirection === 'asc' ? '↑' : '↓'}
                              </span>
                            )}
                          </div>
                        </th>
                        <th
                          className="px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider text-right cursor-pointer select-none"
                          onClick={() => handleSortChange('win_rate')}
                        >
                          <div className="flex items-center justify-end">
                            Win Rate
                            {sortField === 'win_rate' && (
                              <span className="ml-1">
                                {sortDirection === 'asc' ? '↑' : '↓'}
                              </span>
                            )}
                          </div>
                        </th>
                        <th
                          className="px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider text-right cursor-pointer select-none"
                          onClick={() => handleSortChange('vote_count')}
                        >
                          <div className="flex items-center justify-end">
                            Votes
                            {sortField === 'vote_count' && (
                              <span className="ml-1">
                                {sortDirection === 'asc' ? '↑' : '↓'}
                              </span>
                            )}
                          </div>
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                      {stats.top_samples && stats.top_samples.length > 0 ? (
                        // Use new top_samples field if available with sorting
                        getSortedSamples().map((sample: any) => (
                          <tr
                            key={sample.id}
                            className="hover:bg-gray-50 dark:hover:bg-gray-700"
                          >
                            <td className="px-6 py-4">
                              <div className="text-sm text-gray-900 dark:text-gray-100 truncate max-w-xs">
                                <Link
                                  to={`/share/samples/${sample.id}`}
                                  className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 hover:underline"
                                >
                                  {sample.prompt_name}
                                </Link>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right">
                              <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                {sample.elo_score !== undefined
                                  ? Math.round(sample.elo_score)
                                  : 'N/A'}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right">
                              <div className="text-sm text-gray-900 dark:text-gray-100">
                                {sample.win_rate !== undefined
                                  ? `${(sample.win_rate * 100).toFixed(1)}%`
                                  : 'N/A'}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right">
                              <div className="text-sm text-gray-900 dark:text-gray-100">
                                {sample.vote_count || 0}
                              </div>
                            </td>
                          </tr>
                        ))
                      ) : stats.best_samples &&
                        stats.best_samples.length > 0 ? (
                        // Fallback to best_samples for backward compatibility with sorting
                        getSortedSamples().map((sample: any) => (
                          <tr
                            key={sample.sample_id}
                            className="hover:bg-gray-50 dark:hover:bg-gray-700"
                          >
                            <td className="px-6 py-4">
                              <div className="text-sm text-gray-900 dark:text-gray-100 truncate max-w-xs">
                                <Link
                                  to={`/share/samples/${sample.sample_id}`}
                                  className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 hover:underline"
                                >
                                  Sample {sample.sample_id.substring(0, 8)}...
                                </Link>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right">
                              <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                {sample.elo_score !== undefined
                                  ? Math.round(sample.elo_score)
                                  : 'N/A'}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right">
                              <div className="text-sm text-gray-900 dark:text-gray-100">
                                {sample.win_rate !== undefined
                                  ? `${(sample.win_rate * 100).toFixed(1)}%`
                                  : 'N/A'}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right">
                              <div className="text-sm text-gray-900 dark:text-gray-100">
                                {sample.vote_count || 0}
                              </div>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td
                            colSpan={4}
                            className="px-6 py-8 text-center text-gray-500 dark:text-gray-400"
                          >
                            No samples available.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
                <div className="mt-3 text-sm text-gray-500 dark:text-gray-400">
                  Showing up to 20 top performing samples for this model.
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default ModelDetail
