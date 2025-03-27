import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'

import { RefreshCw, Trophy } from 'lucide-react'

import {
  getGlickoLeaderboard,
  getMetrics,
  getTags,
  getTestSets,
} from '../../api/leaderboard'
import {
  GlickoLeaderboardEntry,
  GlickoLeaderboardResponse,
  MetricOption,
  TagOption,
  TestSetOption,
} from '../../types/leaderboard'
import { TagSelector } from './selectors'

const GlickoLeaderboard = () => {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  // State for API data
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [leaderboard, setLeaderboard] = useState<GlickoLeaderboardResponse | null>(
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

        const data = await getGlickoLeaderboard(
          metricName,
          testSetName,
          tagName,
          40,
          1 // Show all models with at least 1 vote
        )
        setLeaderboard(data)
      } catch (err) {
        console.error('Error loading Glicko-2 leaderboard data:', err)
        setError('Failed to load Glicko-2 leaderboard data. Please try again.')
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
  const calculateWinRate = (entry: GlickoLeaderboardEntry): number => {
    if (!entry || !entry.voteCount || entry.voteCount === 0) return 0
    if (entry.winCount === undefined) return 0
    return entry.winCount / entry.voteCount
  }

  // Reset tag filter
  const resetTagFilter = () => {
    setSelectedTag(null)
    
    // Update URL
    const newParams = new URLSearchParams(searchParams)
    newParams.delete('tagName')
    setSearchParams(newParams)
  }

  // Update tag filter
  const updateTagFilter = (tagId: string) => {
    setSelectedTag(tagId)
    
    // Update URL
    const newParams = new URLSearchParams(searchParams)
    const selectedTagObj = tags.find((t) => t.id === tagId)
    if (selectedTagObj) {
      newParams.set('tagName', selectedTagObj.name)
    } else {
      newParams.delete('tagName')
    }
    setSearchParams(newParams)
  }

  // Calculate rating deviation as a percentage
  const calculateRDPercentage = (deviation: number): number => {
    // Use 350 as the default starting deviation
    return Math.min(100, Math.round((deviation / 350) * 100))
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center">
            <Trophy className="mr-2 text-yellow-500" />
            Glicko-2 Leaderboard
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Models ranked by Glicko-2 rating system
          </p>
        </div>

        {/* Filtering options */}
        <div className="flex flex-col sm:flex-row gap-4 mt-4 lg:mt-0">
          <div className="flex flex-col">
            {selectedTag && (
              <button
                onClick={resetTagFilter}
                className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 mb-1 self-end"
              >
                Clear filter
              </button>
            )}
            <TagSelector
              options={tags}
              value={selectedTag}
              onChange={updateTagFilter}
              className=""
              hideLabel={false}
            />
          </div>

          <button
            onClick={() => {
              if (metricName && testSetName) {
                const loadLeaderboard = async () => {
                  setLoading(true)

                  try {
                    let tagName = undefined
                    if (selectedTag) {
                      const selectedTagObj = tags.find((t) => t.id === selectedTag)
                      if (selectedTagObj) {
                        tagName = selectedTagObj.name
                      }
                    }

                    const data = await getGlickoLeaderboard(
                      metricName,
                      testSetName,
                      tagName,
                      40,
                      1
                    )
                    setLeaderboard(data)
                  } catch (err) {
                    console.error('Error reloading Glicko-2 leaderboard:', err)
                    setError('Failed to reload leaderboard. Please try again.')
                  } finally {
                    setLoading(false)
                  }
                }

                loadLeaderboard()
              }
            }}
            className="px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg text-gray-600 dark:text-gray-300 flex items-center text-sm hover:bg-gray-200 dark:hover:bg-gray-600 transition duration-150"
            title="Refresh leaderboard"
            aria-label="Refresh leaderboard"
          >
            <RefreshCw className="h-4 w-4 mr-1" />
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6 text-red-700 dark:text-red-400">
          <p className="font-medium">{error}</p>
        </div>
      )}

      {loading && !leaderboard && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-5/6"></div>
          </div>
        </div>
      )}

      {!loading && leaderboard && leaderboard.entries.length === 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 text-center">
          <p className="text-gray-500 dark:text-gray-400">
            No models match the current filters.
          </p>
        </div>
      )}

      {!loading && leaderboard && leaderboard.entries.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
          <div className="px-6 py-4 border-b dark:border-gray-700">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              {leaderboard.metric.name} - {leaderboard.testSetName}
              {selectedTag && tags.find((t) => t.id === selectedTag) && (
                <span className="ml-2 text-sm font-normal text-gray-500 dark:text-gray-400">
                  (Tag: {tags.find((t) => t.id === selectedTag)?.name})
                </span>
              )}
            </h2>
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
                    Glicko-2 Rating
                  </th>
                  <th className="px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider text-right">
                    Rating Deviation
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
                        {entry.glickoRating ? Math.round(entry.glickoRating) : '0'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="text-sm font-medium text-gray-900 dark:text-gray-100 flex items-center justify-end">
                        <span className="mr-2">{Math.round(entry.ratingDeviation)}</span>
                        <div className="w-16 bg-gray-200 dark:bg-gray-600 rounded-full h-2 overflow-hidden">
                          <div 
                            className="bg-blue-500 h-2 rounded-full" 
                            style={{ width: `${calculateRDPercentage(entry.ratingDeviation)}%` }}
                          />
                        </div>
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
                        {entry.voteCount ? entry.voteCount.toLocaleString() : '0'}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Mobile view - only shown on smaller screens */}
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
                        Glicko Rating:{' '}
                      </span>
                      <span className="text-sm font-medium text-gray-900 dark:text-gray-100 text-left">
                        {entry.glickoRating ? Math.round(entry.glickoRating) : '0'}
                      </span>
                    </div>
                    <div className="flex items-center">
                      <span className="text-xs text-gray-500 dark:text-gray-400 w-[80px]">
                        RD:{' '}
                      </span>
                      <span className="text-sm font-medium text-gray-900 dark:text-gray-100 text-left flex items-center">
                        {Math.round(entry.ratingDeviation)}
                        <div className="ml-2 w-12 bg-gray-200 dark:bg-gray-600 rounded-full h-2 overflow-hidden">
                          <div 
                            className="bg-blue-500 h-2 rounded-full" 
                            style={{ width: `${calculateRDPercentage(entry.ratingDeviation)}%` }}
                          />
                        </div>
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
                    <div className="flex items-center">
                      <span className="text-xs text-gray-500 dark:text-gray-400 w-[80px]">
                        W/L/T:{' '}
                      </span>
                      <span className="text-sm text-gray-900 dark:text-gray-100 text-left">
                        {entry.winCount}/{entry.lossCount}/{entry.tieCount}
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
        </div>
      )}

      <div className="mt-6 bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          About Glicko-2 Rating System
        </h2>
        <p className="text-gray-700 dark:text-gray-300 mb-4">
          The Glicko-2 rating system is an improvement over traditional Elo ratings. It includes:
        </p>
        <ul className="list-disc pl-6 text-gray-700 dark:text-gray-300 space-y-2 mb-4">
          <li>
            <strong>Rating</strong>: The primary rating value (higher is better)
          </li>
          <li>
            <strong>Rating Deviation (RD)</strong>: Represents the uncertainty in a player's rating. 
            Lower values indicate more reliable ratings.
          </li>
          <li>
            <strong>Volatility</strong>: Measures how consistent a player's performance is.
          </li>
        </ul>
        <p className="text-gray-700 dark:text-gray-300">
          Glicko-2 is better suited for handling different levels of activity and provides more 
          accurate ratings, especially for newer models with fewer votes.
        </p>
      </div>
    </div>
  )
}

export default GlickoLeaderboard 