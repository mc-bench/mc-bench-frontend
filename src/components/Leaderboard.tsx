import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'

import { RefreshCw, Trophy } from 'lucide-react'

import {
  getLeaderboard,
  getMetrics,
  getTags,
  getTestSets,
} from '../api/leaderboard'
import {
  LeaderboardEntry,
  LeaderboardResponse,
  MetricOption,
  TagOption,
  TestSetOption,
} from '../types/leaderboard'
import { TagSelector } from './leaderboard/selectors'

const Leaderboard = () => {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  // State for API data
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [leaderboard, setLeaderboard] = useState<LeaderboardResponse | null>(
    null
  )

  // State for filters and options
  const [tags, setTags] = useState<TagOption[]>([])
  const [selectedTag, setSelectedTag] = useState<string | null>(null)
  // Store tagName from URL for resolving after tags load
  const tagNameFromURL = searchParams.get('tagName')

  // Store metric and test set names
  const [metricName, setMetricName] = useState<string | null>(null)
  const [testSetName, setTestSetName] = useState<string | null>(null)

  // Load metadata (metrics, test sets, tags) on component mount
  useEffect(() => {
    const loadMetadata = async () => {
      try {
        const [metricsData, testSetsData, tagsData] = await Promise.all([
          getMetrics(),
          getTestSets(),
          getTags(),
        ])

        setTags(tagsData)

        // Handle tag name in URL if present
        if (tagNameFromURL) {
          const tagByName = tagsData.find(
            (t: TagOption) => t.name === tagNameFromURL
          )
          if (tagByName) {
            setSelectedTag(tagByName.id)
          }
        }

        // Find metric name to use, either from URL or default
        const metricNameParam = searchParams.get('metricName')
        const defaultMetric = metricNameParam
          ? metricsData.find((m: MetricOption) => m.name === metricNameParam)
          : metricsData.find(
              (m: MetricOption) =>
                m.name === 'UNQUALIFIED_BETTER' ||
                m.name === 'Which build is better'
            )

        // Find test set name to use
        const testSetNameParam = searchParams.get('testSetName')
        const defaultTestSet = testSetNameParam
          ? testSetsData.find(
              (ts: TestSetOption) => ts.name === testSetNameParam
            )
          : testSetsData.find(
              (ts: TestSetOption) => ts.name === 'Authenticated Test Set'
            )

        if (defaultMetric) {
          setMetricName(defaultMetric.name)
          console.log(`Using metric: ${defaultMetric.name}`)
        } else if (metricsData.length > 0) {
          setMetricName(metricsData[0].name)
          console.log(
            `Default metric not found, using first metric: ${metricsData[0].name}`
          )
        }

        if (defaultTestSet) {
          setTestSetName(defaultTestSet.name)
          console.log(`Using test set: ${defaultTestSet.name}`)
        } else if (testSetsData.length > 0) {
          setTestSetName(testSetsData[0].name)
          console.warn(
            `Warning: Default test set not found, falling back to first test set: ${testSetsData[0].name}`
          )
        }
      } catch (err) {
        console.error('Error loading metadata:', err)
        setError('Failed to load leaderboard options. Please try again.')
      }
    }

    loadMetadata()
  }, [])

  // Load leaderboard data when selections change
  useEffect(() => {
    if (!metricName || !testSetName) {
      return
    }

    const loadLeaderboard = async () => {
      setLoading(true)
      setError(null)

      try {
        // Get tag name for the selected tag
        let tagName = undefined
        if (selectedTag) {
          const selectedTagObj = tags.find((t) => t.id === selectedTag)
          if (selectedTagObj) {
            tagName = selectedTagObj.name
          }
        }

        const data = await getLeaderboard(
          metricName,
          testSetName,
          tagName,
          40,
          1 // Show all models with at least 1 vote
        )
        setLeaderboard(data)
      } catch (err) {
        console.error('Error loading leaderboard data:', err)
        setError('Failed to load leaderboard data. Please try again.')
      } finally {
        setLoading(false)
      }
    }

    loadLeaderboard()
  }, [metricName, testSetName, selectedTag, tags])

  const handleModelClick = (modelId: string, modelSlug?: string) => {
    if (!metricName || !testSetName) return

    // Build URL with search params
    const params = new URLSearchParams()

    // Use slug in URL, falling back to ID if needed
    const modelIdentifier = modelSlug || modelId

    // Set all parameters as query params
    params.set('metricName', metricName)
    params.set('testSetName', testSetName)
    params.set('modelSlug', modelIdentifier)

    // Handle tag name parameter if a tag is selected
    if (selectedTag) {
      const selectedTagObj = tags.find((t) => t.id === selectedTag)
      if (selectedTagObj) {
        params.set('tagName', selectedTagObj.name)
      }
    }

    navigate(`/leaderboard/model?${params.toString()}`)
  }

  // Calculate win rate from leaderboard entry
  const calculateWinRate = (entry: LeaderboardEntry): number => {
    if (!entry || !entry.voteCount || entry.voteCount === 0) return 0
    if (entry.winCount === undefined) return 0
    return entry.winCount / entry.voteCount
  }

  // Reset tag filter
  const resetTagFilter = () => {
    setSelectedTag(null)
    // Update URL by removing tag parameter
    const newSearchParams = new URLSearchParams(searchParams)
    newSearchParams.delete('tagName')
    setSearchParams(newSearchParams)
  }

  // Handle tag selection
  const handleTagChange = (tagId: string) => {
    setSelectedTag(tagId || null)

    // Update URL
    const newSearchParams = new URLSearchParams(searchParams)
    if (tagId) {
      // Find tag name for the URL
      const selectedTagObj = tags.find((t) => t.id === tagId)
      if (selectedTagObj) {
        newSearchParams.set('tagName', selectedTagObj.name)
      }
    } else {
      newSearchParams.delete('tagName')
    }
    setSearchParams(newSearchParams)
  }

  return (
    <div className="max-w-6xl mx-auto p-4 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="flex items-center space-x-2">
          <Trophy className="h-6 w-6 text-yellow-500" />
          <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">
            Leaderboard
          </h2>
        </div>

        {/* Tag Filter */}
        <div className="w-full sm:w-64">
          <div className="flex items-center">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mr-2">
              Tag
            </label>
            {selectedTag && (
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
            value={selectedTag}
            onChange={handleTagChange}
            className="mt-1"
            hideLabel={true}
          />
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 text-red-800 dark:text-red-300">
          <p>{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-2 flex items-center text-sm font-medium text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300"
          >
            <RefreshCw className="h-4 w-4 mr-1" /> Try Again
          </button>
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div className="py-20 flex justify-center items-center">
          <div className="flex flex-col items-center gap-2">
            <div className="animate-spin h-8 w-8 border-4 border-blue-500 rounded-full border-t-transparent"></div>
            <span className="text-gray-700 dark:text-gray-300">
              Loading leaderboard...
            </span>
          </div>
        </div>
      )}

      {/* Leaderboard Table */}
      {!loading && !error && leaderboard && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border dark:border-gray-700 overflow-hidden">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
              {leaderboard.testSetName || 'Leaderboard'}
              {selectedTag &&
                leaderboard.entries &&
                leaderboard.entries[0]?.tag?.name && (
                  <span className="ml-2 text-sm text-gray-500 dark:text-gray-400">
                    (Tag: {leaderboard.entries[0].tag.name})
                  </span>
                )}
            </h3>
          </div>

          <div className="overflow-x-auto">
            {/* Desktop view - only shown on larger screens */}
            <table className="w-full hidden md:table">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-700 border-b dark:border-gray-600 text-left">
                  <th className="px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-16">
                    Rank
                  </th>
                  <th className="px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Model
                  </th>
                  <th className="px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider text-right">
                    ELO Score
                  </th>
                  <th className="px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider text-right">
                    Win Rate
                  </th>
                  <th className="px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider text-right">
                    Votes
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {(leaderboard.entries || []).map((entry, index) => (
                  <tr
                    key={entry.model?.id || index}
                    className="hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
                    onClick={() =>
                      entry.model?.id &&
                      handleModelClick(entry.model.id, entry.model.slug)
                    }
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          #{index + 1}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {entry.model?.name || 'Unknown'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {entry.eloScore ? Math.round(entry.eloScore) : '0'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="text-sm text-gray-900 dark:text-gray-100">
                        {entry.voteCount > 0
                          ? `${(calculateWinRate(entry) * 100).toFixed(1)}%`
                          : 'N/A'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="text-sm text-gray-900 dark:text-gray-100">
                        {entry.voteCount
                          ? entry.voteCount.toLocaleString()
                          : '0'}
                      </div>
                    </td>
                  </tr>
                ))}

                {(!leaderboard.entries || leaderboard.entries.length === 0) && (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-6 py-8 text-center text-gray-500 dark:text-gray-400"
                    >
                      No models match the current filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>

            {/* Mobile view - only shown on small screens */}
            <div className="md:hidden">
              {(leaderboard.entries || []).map((entry, index) => (
                <div
                  key={entry.model?.id || index}
                  className="border-b dark:border-gray-700 p-4 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
                  onClick={() =>
                    entry.model?.id &&
                    handleModelClick(entry.model.id, entry.model.slug)
                  }
                >
                  <div className="flex items-start mb-2">
                    <span className="text-sm font-medium text-gray-900 dark:text-gray-100 w-10">
                      #{index + 1}
                    </span>
                    <div className="text-sm font-medium text-gray-900 dark:text-gray-100 text-left">
                      {entry.model?.name || 'Unknown'}
                    </div>
                  </div>
                  <div className="pl-10 space-y-1">
                    <div className="flex items-center">
                      <span className="text-xs text-gray-500 dark:text-gray-400 w-[80px]">
                        ELO Score:{' '}
                      </span>
                      <span className="text-sm font-medium text-gray-900 dark:text-gray-100 text-left">
                        {entry.eloScore ? Math.round(entry.eloScore) : '0'}
                      </span>
                    </div>
                    <div className="flex items-center">
                      <span className="text-xs text-gray-500 dark:text-gray-400 w-[80px]">
                        Win Rate:{' '}
                      </span>
                      <span className="text-sm text-gray-900 dark:text-gray-100 text-left">
                        {entry.voteCount > 0
                          ? `${(calculateWinRate(entry) * 100).toFixed(1)}%`
                          : 'N/A'}
                      </span>
                    </div>
                    <div className="flex items-center">
                      <span className="text-xs text-gray-500 dark:text-gray-400 w-[80px]">
                        Votes:{' '}
                      </span>
                      <span className="text-sm text-gray-900 dark:text-gray-100 text-left">
                        {entry.voteCount
                          ? entry.voteCount.toLocaleString()
                          : '0'}
                      </span>
                    </div>
                  </div>
                </div>
              ))}

              {(!leaderboard.entries || leaderboard.entries.length === 0) && (
                <div className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                  No models match the current filters.
                </div>
              )}
            </div>
          </div>

          {leaderboard.entries && leaderboard.entries.length > 0 && (
            <div className="px-6 py-3 bg-gray-50 dark:bg-gray-700 text-xs text-gray-500 dark:text-gray-400 border-t dark:border-gray-600">
              Showing {leaderboard.entries.length} models
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default Leaderboard
