import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'

import { ArrowLeft, BarChart3, ChevronRight, MessageSquare } from 'lucide-react'

import { getModelStatistics, getTags } from '../../api/leaderboard'
import { ModelStatisticsResponse, TagOption } from '../../types/leaderboard'
import BucketChart from './BucketChart'
import PromptLeaderboard from './PromptLeaderboard'
import { TagSelector } from './selectors'

const ModelDetail = () => {
  const [searchParams, setSearchParams] = useSearchParams()

  // Get model slug from URL
  const modelSlug = searchParams.get('modelSlug') || undefined

  // Get tag name from URL
  const tagNameFromURL = searchParams.get('tagName') || undefined

  // Get metric name from URL
  const metricNameFromURL = searchParams.get('metricName') || undefined

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [stats, setStats] = useState<ModelStatisticsResponse | null>(null)
  const [metricName, setMetricName] = useState<string | null>(null)
  const [testSetName, setTestSetName] = useState<string | null>(null)
  const [tags, setTags] = useState<TagOption[]>([])
  const [currentTagId, setCurrentTagId] = useState<string | null>(null)
  const [currentTagName, setCurrentTagName] = useState<string | null>(null)

  // UI state for tab selection
  const [activeTab, setActiveTab] = useState<'performance' | 'prompts'>(
    'performance'
  )

  // Sorting state for top samples
  const [sortField, setSortField] = useState<
    'promptName' | 'eloScore' | 'winRate' | 'voteCount'
  >('eloScore')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')

  // First, load tags and get metric/test set names from URL
  useEffect(() => {
    const loadMetadata = async () => {
      try {
        // Get tags data for the tag selector
        const tagsData = await getTags()
        setTags(tagsData)

        // Set metric name from URL or use default
        if (metricNameFromURL) {
          setMetricName(metricNameFromURL)
        } else {
          setMetricName('UNQUALIFIED_BETTER') // Default metric
        }

        // Set test set name from URL or use default
        const testSetNameParam = searchParams.get('testSetName')
        if (testSetNameParam) {
          setTestSetName(testSetNameParam)
        } else {
          setTestSetName('Authenticated Test Set') // Default test set
        }

        // Handle tag name in URL if present
        if (tagNameFromURL) {
          const tagByName = tagsData.find(
            (t: TagOption) => t.name === tagNameFromURL
          )
          if (tagByName) {
            setCurrentTagId(tagByName.id)
            setCurrentTagName(tagNameFromURL)
          }
        }
      } catch (err) {
        console.error('Error loading metadata:', err)
        setError('Failed to load tags and options.')
      }
    }

    loadMetadata()
  }, [])

  // No need to convert from slug to ID since the API now uses slugs directly

  // Then, load the model stats once we have the metric and test set names
  useEffect(() => {
    if (!modelSlug || !metricName || !testSetName) {
      return
    }

    const loadModelStats = async () => {
      try {
        setLoading(true)
        const data = await getModelStatistics(
          metricName,
          testSetName,
          modelSlug,
          currentTagName || undefined
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
  }, [modelSlug, metricName, testSetName, currentTagName])

  // Construct back link with all relevant parameters
  const backToLeaderboard = () => {
    const params = new URLSearchParams()

    // Add tag name if available
    if (currentTagName) {
      params.set('tagName', currentTagName)
    }

    // Add metric and test set names as query parameters
    if (metricName) {
      params.set('metricName', metricName)
    }

    if (testSetName) {
      params.set('testSetName', testSetName)
    }

    const paramString = params.toString()
    return `/leaderboard${paramString ? `?${paramString}` : ''}`
  }

  // Handle tag selection change
  const handleTagChange = (newTagId: string) => {
    setCurrentTagId(newTagId || null)

    // Update URL parameters
    const newParams = new URLSearchParams(searchParams)
    if (newTagId) {
      // Find tag name for the URL
      const selectedTagObj = tags.find((t) => t.id === newTagId)
      if (selectedTagObj) {
        setCurrentTagName(selectedTagObj.name)
        newParams.set('tagName', selectedTagObj.name)
      }
    } else {
      setCurrentTagName(null)
      newParams.delete('tagName')
    }

    // Keep existing parameters
    if (metricName) {
      newParams.set('metricName', metricName)
    }

    if (testSetName) {
      newParams.set('testSetName', testSetName)
    }

    setSearchParams(newParams)
  }

  // Reset tag filter
  const resetTagFilter = () => {
    setCurrentTagId(null)
    setCurrentTagName(null)

    // Update URL by removing tag parameter
    const newParams = new URLSearchParams(searchParams)
    newParams.delete('tagName')

    // Keep existing parameters
    if (metricName) {
      newParams.set('metricName', metricName)
    }

    if (testSetName) {
      newParams.set('testSetName', testSetName)
    }

    setSearchParams(newParams)
  }

  // Handle sorting for top samples
  const handleSortChange = (
    field: 'promptName' | 'eloScore' | 'winRate' | 'voteCount'
  ) => {
    if (sortField === field) {
      // If already sorting by this field, toggle direction
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      // Otherwise, set the new field and default to descending for numerical values, ascending for text
      setSortField(field)
      setSortDirection(field === 'promptName' ? 'asc' : 'desc')
    }
  }

  // Sort top samples based on current sort state
  const getSortedSamples = () => {
    if (!stats) return []

    // Use the topSamples from the API response
    if (stats.topSamples && stats.topSamples.length > 0) {
      return [...stats.topSamples].sort((a, b) => {
        if (sortField === 'promptName') {
          const comparison = a.promptName.localeCompare(b.promptName)
          return sortDirection === 'asc' ? comparison : -comparison
        } else if (sortField === 'eloScore') {
          const aValue = a.eloScore || 0
          const bValue = b.eloScore || 0
          return sortDirection === 'asc' ? aValue - bValue : bValue - aValue
        } else if (sortField === 'winRate') {
          const aValue = a.winRate || 0
          const bValue = b.winRate || 0
          return sortDirection === 'asc' ? aValue - bValue : bValue - aValue
        } else {
          // voteCount
          const aValue = a.voteCount || 0
          const bValue = b.voteCount || 0
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
          to={backToLeaderboard()}
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
          to={backToLeaderboard()}
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
          <div className="flex flex-col items-center gap-2">
            <div className="animate-spin h-8 w-8 border-4 border-blue-500 rounded-full border-t-transparent"></div>
            <span className="text-gray-700 dark:text-gray-300">
              Loading model details...
            </span>
          </div>
        </div>
      )}

      {/* Model Statistics */}
      {!loading && !error && stats && (
        <>
          {/* Header */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {stats.model?.name || 'Unknown Model'}
                </h1>
                <p className="text-gray-500 dark:text-gray-400 mt-2">
                  Performance statistics across {stats.sampleCount || 0} samples
                </p>
              </div>

              {/* Tag Selector */}
              <div className="w-full sm:w-64">
                <div className="flex items-center">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mr-2">
                    Tag
                  </label>
                  {currentTagId && (
                    <button
                      onClick={resetTagFilter}
                      className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
                    >
                      Clear
                    </button>
                  )}
                </div>
                <TagSelector
                  options={tags}
                  value={currentTagId}
                  onChange={handleTagChange}
                  className="mt-1"
                  hideLabel={true}
                />
              </div>
            </div>
          </div>

          {/* Statistics Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-medium text-gray-700 dark:text-gray-300">
                Overall ELO Score
              </h3>
              <div className="mt-2 text-3xl font-bold text-gray-900 dark:text-gray-100">
                {stats.globalStats?.avgElo
                  ? Math.round(stats.globalStats.avgElo)
                  : 'N/A'}
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-medium text-gray-700 dark:text-gray-300">
                Win Rate
              </h3>
              <div className="mt-2 text-3xl font-bold text-gray-900 dark:text-gray-100">
                {stats.globalStats?.winRate !== undefined
                  ? `${(stats.globalStats.winRate * 100).toFixed(1)}%`
                  : 'N/A'}
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Wins: {stats.globalStats?.totalWins || 0} / Losses:{' '}
                {stats.globalStats?.totalLosses || 0} / Ties:{' '}
                {stats.globalStats?.totalTies || 0}
              </p>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-medium text-gray-700 dark:text-gray-300">
                Total Votes
              </h3>
              <div className="mt-2 text-3xl font-bold text-gray-900 dark:text-gray-100">
                {stats.globalStats?.totalVotes
                  ? stats.globalStats.totalVotes.toLocaleString()
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

                  {/* Handle case when statistics are not available */}
                  {stats.statistics ? (
                    <p className="text-gray-500 dark:text-gray-400">
                      {stats.statistics.message ||
                        'No performance statistics available.'}
                    </p>
                  ) : stats.bucketStats && stats.bucketStats.length > 0 ? (
                    <BucketChart buckets={stats.bucketStats} />
                  ) : (
                    <p className="text-gray-500 dark:text-gray-400">
                      No performance statistics available.
                    </p>
                  )}

                  {/* Description already included in the chart component */}
                </div>
              )}

              {activeTab === 'prompts' &&
                metricName &&
                testSetName &&
                modelSlug && (
                  <div>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">
                      Prompt Performance
                    </h2>

                    <PromptLeaderboard
                      metricName={metricName}
                      testSetName={testSetName}
                      modelSlug={modelSlug}
                      tagName={currentTagName || undefined}
                    />
                  </div>
                )}
            </div>
          </div>

          {/* Top Samples - Always visible regardless of active tab */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="p-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">
                Top Performing Samples
              </h2>

              {/* Table for larger screens */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50 dark:bg-gray-700 border-b dark:border-gray-600 text-left">
                      <th
                        className="px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer select-none"
                        onClick={() => handleSortChange('promptName')}
                      >
                        <div className="flex items-center">
                          Prompt
                          {sortField === 'promptName' && (
                            <span className="ml-1">
                              {sortDirection === 'asc' ? '↑' : '↓'}
                            </span>
                          )}
                        </div>
                      </th>
                      <th
                        className="px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider text-right cursor-pointer select-none"
                        onClick={() => handleSortChange('eloScore')}
                      >
                        <div className="flex items-center justify-end">
                          ELO Score
                          {sortField === 'eloScore' && (
                            <span className="ml-1">
                              {sortDirection === 'asc' ? '↑' : '↓'}
                            </span>
                          )}
                        </div>
                      </th>
                      <th
                        className="px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider text-right cursor-pointer select-none"
                        onClick={() => handleSortChange('winRate')}
                      >
                        <div className="flex items-center justify-end">
                          Win Rate
                          {sortField === 'winRate' && (
                            <span className="ml-1">
                              {sortDirection === 'asc' ? '↑' : '↓'}
                            </span>
                          )}
                        </div>
                      </th>
                      <th
                        className="px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider text-right cursor-pointer select-none"
                        onClick={() => handleSortChange('voteCount')}
                      >
                        <div className="flex items-center justify-end">
                          Votes
                          {sortField === 'voteCount' && (
                            <span className="ml-1">
                              {sortDirection === 'asc' ? '↑' : '↓'}
                            </span>
                          )}
                        </div>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {stats.topSamples && stats.topSamples.length > 0 ? (
                      // Use sorted topSamples from the API
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
                                {sample.promptName}
                              </Link>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right">
                            <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                              {sample.eloScore !== undefined
                                ? Math.round(sample.eloScore)
                                : 'N/A'}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right">
                            <div className="text-sm text-gray-900 dark:text-gray-100">
                              {sample.winRate !== undefined
                                ? `${(sample.winRate * 100).toFixed(1)}%`
                                : 'N/A'}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right">
                            <div className="text-sm text-gray-900 dark:text-gray-100">
                              {sample.voteCount || 0}
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

              {/* Card layout for mobile */}
              <div className="md:hidden space-y-4">
                {stats.topSamples && stats.topSamples.length > 0 ? (
                  // Use topSamples from the API with camelCase properties
                  getSortedSamples().map((sample: any) => (
                    <div
                      key={sample.id}
                      className="border-b dark:border-gray-700 p-4 hover:bg-gray-50 dark:hover:bg-gray-700"
                    >
                      <div className="mb-2">
                        <Link
                          to={`/share/samples/${sample.id}`}
                          className="text-blue-600 dark:text-blue-400 font-medium hover:underline"
                        >
                          {sample.promptName}
                        </Link>
                      </div>
                      <div className="pl-2 space-y-1">
                        <div className="flex items-center">
                          <span className="text-xs text-gray-500 dark:text-gray-400 w-[80px]">
                            ELO Score:{' '}
                          </span>
                          <span className="text-sm font-medium text-gray-900 dark:text-gray-100 text-left">
                            {sample.eloScore !== undefined
                              ? Math.round(sample.eloScore)
                              : 'N/A'}
                          </span>
                        </div>
                        <div className="flex items-center">
                          <span className="text-xs text-gray-500 dark:text-gray-400 w-[80px]">
                            Win Rate:{' '}
                          </span>
                          <span className="text-sm text-gray-900 dark:text-gray-100 text-left">
                            {sample.winRate !== undefined
                              ? `${(sample.winRate * 100).toFixed(1)}%`
                              : 'N/A'}
                          </span>
                        </div>
                        <div className="flex items-center">
                          <span className="text-xs text-gray-500 dark:text-gray-400 w-[80px]">
                            Votes:{' '}
                          </span>
                          <span className="text-sm text-gray-900 dark:text-gray-100 text-left">
                            {sample.voteCount || 0}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center text-gray-500 dark:text-gray-400 py-4">
                    No samples available.
                  </div>
                )}
              </div>

              <div className="mt-3 text-sm text-gray-500 dark:text-gray-400">
                Showing up to 20 top performing samples for this model.
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

export default ModelDetail
