import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

// Removed date-fns import as we no longer display last updated time
import { ChevronLeft, ChevronRight } from 'lucide-react'

import { getPromptLeaderboard } from '../../api/leaderboard'
import type {
  PromptLeaderboardEntry,
  PromptLeaderboardResponse,
} from '../../types/leaderboard'

interface PromptLeaderboardProps {
  metricName: string
  testSetName: string
  modelSlug: string
  tagName?: string
}

export const PromptLeaderboard: React.FC<PromptLeaderboardProps> = ({
  metricName,
  testSetName,
  modelSlug,
  tagName,
}) => {
  // We don't need searchParams here as we're using the passed tagId
  const navigate = useNavigate()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [promptData, setPromptData] =
    useState<PromptLeaderboardResponse | null>(null)

  // Pagination state
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  // Use recommended minimum votes filter from API docs
  const minVotes = 5 // Default to API recommended minimum

  // Client-side sorting state
  const [sortField, setSortField] = useState<
    'promptName' | 'eloScore' | 'winRate' | 'voteCount'
  >('eloScore')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')

  // Fetch prompt leaderboard data
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      setError(null)

      try {
        const data = await getPromptLeaderboard(
          metricName,
          testSetName,
          modelSlug,
          page,
          pageSize,
          minVotes,
          tagName
        )

        setPromptData(data)
      } catch (err) {
        console.error('Error fetching prompt leaderboard:', err)
        setError('Failed to load prompt leaderboard data')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [metricName, testSetName, modelSlug, page, pageSize, tagName])

  // Handle page changes
  const goToNextPage = () => {
    if (promptData && promptData.paging.hasNext) {
      setPage(page + 1)
    }
  }

  const goToPrevPage = () => {
    if (page > 1) {
      setPage(page - 1)
    }
  }

  // Handle page size changes
  const handlePageSizeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setPageSize(parseInt(e.target.value, 10))
    setPage(1) // Reset to first page when changing page size
  }

  // Removed min votes filter handling

  // Removed date formatting function as we no longer display last updated time

  // Calculate win rate
  const getWinRate = (entry: PromptLeaderboardEntry) => {
    const totalVotes = entry.voteCount
    return totalVotes > 0
      ? ((entry.winCount / totalVotes) * 100).toFixed(1)
      : '0.0'
  }

  // Handle sort click
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

  // Get sorted entries
  const getSortedEntries = () => {
    if (!promptData || !promptData.entries || promptData.entries.length === 0) {
      return []
    }

    return [...promptData.entries].sort((a, b) => {
      if (sortField === 'promptName') {
        const comparison = a.promptName.localeCompare(b.promptName)
        return sortDirection === 'asc' ? comparison : -comparison
      } else if (sortField === 'eloScore') {
        return sortDirection === 'asc'
          ? a.eloScore - b.eloScore
          : b.eloScore - a.eloScore
      } else if (sortField === 'winRate') {
        const aWinRate = a.voteCount > 0 ? a.winCount / a.voteCount : 0
        const bWinRate = b.voteCount > 0 ? b.winCount / b.voteCount : 0
        return sortDirection === 'asc'
          ? aWinRate - bWinRate
          : bWinRate - aWinRate
      } else {
        // voteCount
        return sortDirection === 'asc'
          ? a.voteCount - b.voteCount
          : b.voteCount - a.voteCount
      }
    })
  }

  if (loading) {
    return (
      <div className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className="h-10 bg-gray-200 dark:bg-gray-700 rounded"
              ></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow">
        <div className="text-red-500 dark:text-red-400">
          <p>{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  if (!promptData || promptData.entries.length === 0) {
    return (
      <div className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow">
        <p className="text-gray-500 dark:text-gray-400">
          No prompt data available for this model.
        </p>
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
      {/* Table for larger screens */}
      <div className="hidden md:block overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer select-none"
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
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer select-none"
                onClick={() => handleSortChange('eloScore')}
              >
                <div className="flex items-center">
                  ELO Score
                  {sortField === 'eloScore' && (
                    <span className="ml-1">
                      {sortDirection === 'asc' ? '↑' : '↓'}
                    </span>
                  )}
                </div>
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer select-none"
                onClick={() => handleSortChange('winRate')}
              >
                <div className="flex items-center">
                  Win Rate
                  {sortField === 'winRate' && (
                    <span className="ml-1">
                      {sortDirection === 'asc' ? '↑' : '↓'}
                    </span>
                  )}
                </div>
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer select-none"
                onClick={() => handleSortChange('voteCount')}
              >
                <div className="flex items-center">
                  Votes
                  {sortField === 'voteCount' && (
                    <span className="ml-1">
                      {sortDirection === 'asc' ? '↑' : '↓'}
                    </span>
                  )}
                </div>
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider"
              >
                W/L/T
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {getSortedEntries().map((entry) => (
              <tr
                key={entry.promptId}
                className="hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
                onClick={() =>
                  navigate(
                    `/leaderboard/${metricName}/${testSetName}/${modelSlug}/samples?prompt_name=${encodeURIComponent(entry.promptName)}`
                  )
                }
              >
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <span className="font-medium text-gray-900 dark:text-gray-100">
                    {entry.promptName}
                  </span>
                  {entry.tag && (
                    <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-100">
                      {entry.tag.name}
                    </span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                  {Math.round(entry.eloScore)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                  {getWinRate(entry)}%
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                  {entry.voteCount}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                  {entry.winCount}/{entry.lossCount}/{entry.tieCount}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Card layout for mobile */}
      <div className="md:hidden space-y-4">
        {getSortedEntries().map((entry) => (
          <div
            key={entry.promptId}
            className="border-b dark:border-gray-700 p-4 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
            onClick={() =>
              navigate(
                `/leaderboard/${metricName}/${testSetName}/${modelSlug}/samples?prompt_name=${encodeURIComponent(entry.promptName)}`
              )
            }
          >
            <div className="mb-2">
              <span className="font-medium text-gray-900 dark:text-gray-100">
                {entry.promptName}
              </span>
              {entry.tag && (
                <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-100">
                  {entry.tag.name}
                </span>
              )}
            </div>

            <div className="pl-2 space-y-1">
              <div className="flex items-center">
                <span className="text-xs text-gray-500 dark:text-gray-400 w-[80px]">
                  ELO Score:{' '}
                </span>
                <span className="text-sm font-medium text-gray-900 dark:text-gray-100 text-left">
                  {Math.round(entry.eloScore)}
                </span>
              </div>
              <div className="flex items-center">
                <span className="text-xs text-gray-500 dark:text-gray-400 w-[80px]">
                  Win Rate:{' '}
                </span>
                <span className="text-sm text-gray-900 dark:text-gray-100 text-left">
                  {getWinRate(entry)}%
                </span>
              </div>
              <div className="flex items-center">
                <span className="text-xs text-gray-500 dark:text-gray-400 w-[80px]">
                  Votes:{' '}
                </span>
                <span className="text-sm text-gray-900 dark:text-gray-100 text-left">
                  {entry.voteCount}
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
      </div>

      {/* Pagination controls */}
      <div className="mt-4 flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-700 dark:text-gray-300">
            Page {promptData.paging.page} of {promptData.paging.totalPages}
          </span>
          <select
            value={pageSize}
            onChange={handlePageSizeChange}
            className="border border-gray-300 dark:border-gray-600 rounded py-1 px-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm"
          >
            <option value="10">10 per page</option>
            <option value="20">20 per page</option>
            <option value="50">50 per page</option>
            <option value="100">100 per page</option>
          </select>
        </div>

        <div className="flex space-x-2">
          <button
            onClick={goToPrevPage}
            disabled={page === 1}
            className={`p-2 rounded-full ${
              page === 1
                ? 'text-gray-400 dark:text-gray-600 cursor-not-allowed'
                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            <ChevronLeft size={20} />
          </button>
          <button
            onClick={goToNextPage}
            disabled={!promptData.paging.hasNext}
            className={`p-2 rounded-full ${
              !promptData.paging.hasNext
                ? 'text-gray-400 dark:text-gray-600 cursor-not-allowed'
                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            <ChevronRight size={20} />
          </button>
        </div>
      </div>
    </div>
  )
}

export default PromptLeaderboard
