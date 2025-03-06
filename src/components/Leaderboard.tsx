import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

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

  // State for API data
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [leaderboard, setLeaderboard] = useState<LeaderboardResponse | null>(
    null
  )

  // State for filters and options
  const [tags, setTags] = useState<TagOption[]>([])
  const [selectedTag, setSelectedTag] = useState<string | null>(null)

  // We'll look up these IDs from the API
  const [metricId, setMetricId] = useState<string | null>(null)
  const [testSetId, setTestSetId] = useState<string | null>(null)

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
        setError('Failed to load leaderboard options. Please try again.')
      }
    }

    loadMetadata()
  }, [])

  // Load leaderboard data when selections change
  useEffect(() => {
    if (!metricId || !testSetId) {
      return
    }

    const loadLeaderboard = async () => {
      setLoading(true)
      setError(null)

      try {
        const data = await getLeaderboard(
          metricId,
          testSetId,
          selectedTag || undefined,
          20,
          10 // Fixed minimum votes value
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
  }, [metricId, testSetId, selectedTag])

  const handleModelClick = (modelId: string) => {
    if (!metricId || !testSetId) return
    navigate(
      `/leaderboard/model/${modelId}?metric=${metricId}&testSet=${testSetId}${selectedTag ? `&tag=${selectedTag}` : ''}`
    )
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

        {/* Simple Tag Filter */}
        <div className="w-full sm:w-64">
          <TagSelector
            options={tags}
            value={selectedTag}
            onChange={setSelectedTag}
            className=""
          />
          {selectedTag && (
            <button
              onClick={resetTagFilter}
              className="ml-2 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
            >
              Clear
            </button>
          )}
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
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
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
            <table className="w-full">
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
                      entry.model?.id && handleModelClick(entry.model.id)
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
          </div>

          {leaderboard.entries && leaderboard.entries.length > 0 && (
            <div className="px-6 py-3 bg-gray-50 dark:bg-gray-700 text-xs text-gray-500 dark:text-gray-400 border-t dark:border-gray-600">
              Showing {leaderboard.entries.length} models with at least 10 votes
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default Leaderboard
