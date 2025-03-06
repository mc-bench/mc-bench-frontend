import React, { useEffect, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'

import { ChevronLeft, ChevronRight, Home } from 'lucide-react'

import { getModelSamples } from '../../api/leaderboard'
import type { ModelSamplesResponse } from '../../types/leaderboard'

interface ModelSamplesListProps {
  metricName?: string
  testSetName?: string
  modelSlug?: string
  promptName?: string
}

const ModelSamplesList: React.FC<ModelSamplesListProps> = ({
  metricName: propMetricName,
  testSetName: propTestSetName,
  modelSlug: propModelSlug,
  promptName: propPromptName,
}) => {
  // Route params (for direct access via URL)
  const params = useParams<{
    metricName?: string
    testSetName?: string
    modelSlug?: string
  }>()

  // React Router navigation
  const navigate = useNavigate()

  // Search params for prompt name and tag filters
  const [searchParams] = useSearchParams()

  // Combine props and URL params
  const metricName = propMetricName || params.metricName || ''
  const testSetName = propTestSetName || params.testSetName || ''
  const modelSlug = propModelSlug || params.modelSlug || ''
  const promptName = propPromptName || searchParams.get('prompt_name') || ''
  const tagName = searchParams.get('tag_name') || undefined

  // State
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [samplesData, setSamplesData] = useState<ModelSamplesResponse | null>(
    null
  )

  // Pagination state
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)

  // Fetch sample data
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      setError(null)

      try {
        const data = await getModelSamples(
          metricName,
          testSetName,
          modelSlug,
          page,
          pageSize,
          tagName,
          promptName
        )
        setSamplesData(data)
      } catch (err) {
        console.error('Error fetching model samples:', err)
        setError('Failed to load sample data')
      } finally {
        setLoading(false)
      }
    }

    if (metricName && testSetName && modelSlug) {
      fetchData()
    } else {
      setError('Missing required parameters')
    }
  }, [metricName, testSetName, modelSlug, promptName, tagName, page, pageSize])

  // Handle page changes
  const goToNextPage = () => {
    if (samplesData && samplesData.paging.hasNext) {
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

  if (!samplesData || samplesData.samples.length === 0) {
    return (
      <div className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow">
        <p className="text-gray-500 dark:text-gray-400">
          No samples available for this model and prompt.
        </p>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      {/* Page header */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
          {samplesData.modelName}
        </h1>
        {promptName && (
          <div className="text-gray-700 dark:text-gray-300 mb-2">
            <span className="font-semibold">Task:</span> {promptName}
          </div>
        )}
        {tagName && (
          <div className="text-gray-600 dark:text-gray-400 text-sm">
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-100">
              {tagName}
            </span>
          </div>
        )}
      </div>

      {/* Breadcrumb navigation */}
      <nav className="flex mb-4 text-sm" aria-label="Breadcrumb">
        <ol className="inline-flex items-center space-x-1 md:space-x-2">
          <li className="inline-flex items-center">
            <Link
              to="/leaderboard"
              className="inline-flex items-center text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400"
            >
              <Home className="w-4 h-4 mr-2" />
              Leaderboard
            </Link>
          </li>
          <li>
            <div className="flex items-center">
              <span className="mx-2 text-gray-400">/</span>
              <Link
                to={`/leaderboard/model/${modelSlug}`}
                className="text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400"
              >
                {samplesData.modelName}
              </Link>
            </div>
          </li>
          <li>
            <div className="flex items-center">
              <span className="mx-2 text-gray-400">/</span>
              <span className="text-gray-500 dark:text-gray-400">Samples</span>
            </div>
          </li>
        </ol>
      </nav>

      {/* Samples Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        {/* Table for larger screens */}
        <div className="hidden md:block overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider"
                >
                  Sample
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider"
                >
                  ELO Score
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider"
                >
                  Win Rate
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider"
                >
                  Votes
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
              {samplesData.samples.map((sample, index) => (
                <tr
                  key={sample.id}
                  className="hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
                  onClick={() => navigate(`/share/samples/${sample.id}`)}
                >
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <span className="font-medium text-gray-900 dark:text-gray-100">
                      Sample #{index + 1 + (page - 1) * pageSize}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                    {Math.round(sample.eloScore)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                    {(sample.winRate * 100).toFixed(1)}%
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                    {sample.voteCount}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                    {sample.winCount}/{sample.lossCount}/{sample.tieCount}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Card layout for mobile */}
        <div className="md:hidden space-y-4 p-4">
          {samplesData.samples.map((sample, index) => (
            <div
              key={sample.id}
              className="border dark:border-gray-700 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
              onClick={() => navigate(`/share/samples/${sample.id}`)}
            >
              <div className="mb-2">
                <span className="font-medium text-gray-900 dark:text-gray-100">
                  Sample #{index + 1 + (page - 1) * pageSize}
                </span>
              </div>

              <div className="pl-2 space-y-1 mt-3">
                <div className="flex items-center">
                  <span className="text-xs text-gray-500 dark:text-gray-400 w-[80px]">
                    ELO Score:{' '}
                  </span>
                  <span className="text-sm font-medium text-gray-900 dark:text-gray-100 text-left">
                    {Math.round(sample.eloScore)}
                  </span>
                </div>
                <div className="flex items-center">
                  <span className="text-xs text-gray-500 dark:text-gray-400 w-[80px]">
                    Win Rate:{' '}
                  </span>
                  <span className="text-sm text-gray-900 dark:text-gray-100 text-left">
                    {(sample.winRate * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="flex items-center">
                  <span className="text-xs text-gray-500 dark:text-gray-400 w-[80px]">
                    Votes:{' '}
                  </span>
                  <span className="text-sm text-gray-900 dark:text-gray-100 text-left">
                    {sample.voteCount}
                  </span>
                </div>
                <div className="flex items-center">
                  <span className="text-xs text-gray-500 dark:text-gray-400 w-[80px]">
                    W/L/T:{' '}
                  </span>
                  <span className="text-sm text-gray-900 dark:text-gray-100 text-left">
                    {sample.winCount}/{sample.lossCount}/{sample.tieCount}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Pagination controls */}
        <div className="p-4 flex justify-between items-center border-t dark:border-gray-700">
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-700 dark:text-gray-300">
              Page {samplesData.paging.page} of {samplesData.paging.totalPages}
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
              disabled={!samplesData.paging.hasNext}
              className={`p-2 rounded-full ${
                !samplesData.paging.hasNext
                  ? 'text-gray-400 dark:text-gray-600 cursor-not-allowed'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              <ChevronRight size={20} />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ModelSamplesList
