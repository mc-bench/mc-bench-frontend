import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'

import { Clock, ExternalLink, Plus, Search } from 'lucide-react'

import { adminAPI } from '../../api/client'
import { useAuth } from '../../hooks/useAuth'
import { GenerationResponse } from '../../types/generations'
import { hasGenerationWriteAccess } from '../../utils/permissions'

interface GenerationsApiResponse {
  data: GenerationResponse[]
}

const ListGenerations = () => {
  const { user } = useAuth()
  const canCreateGeneration = hasGenerationWriteAccess(user?.scopes || [])
  const searchInputRef = useRef<HTMLInputElement>(null)
  const [generations, setGenerations] = useState<GenerationResponse[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchGenerations()
    searchInputRef.current?.focus()
  }, [])

  useEffect(() => {
    // Add keyboard shortcut (optional)
    const handleKeyPress = (e: KeyboardEvent) => {
      // Focus search on '/' key press, common in many web apps
      if (e.key === '/' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault()
        searchInputRef.current?.focus()
      }
    }

    document.addEventListener('keydown', handleKeyPress)
    return () => document.removeEventListener('keydown', handleKeyPress)
  }, [])

  const fetchGenerations = async () => {
    try {
      setLoading(true)
      const response = await adminAPI.get<GenerationsApiResponse>('/generation')
      setGenerations(response.data.data)
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to fetch generations'
      )
    } finally {
      setLoading(false)
    }
  }

  const filteredGenerations = generations.filter((generation) => {
    if (!searchTerm) return true

    const searchLower = searchTerm.toLowerCase()
    return (
      generation.name?.toLowerCase().includes(searchLower) ||
      generation.description?.toLowerCase().includes(searchLower) ||
      generation.createdBy?.toLowerCase().includes(searchLower) ||
      generation.status?.toLowerCase().includes(searchLower)
    )
  })

  if (loading)
    return <div className="flex justify-center p-8">Loading generations...</div>
  if (error)
    return <div className="text-red-500 dark:text-red-400 p-4">{error}</div>

  return (
    <div className="p-4 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          Generations
        </h1>
        {canCreateGeneration && (
          <Link
            to="/generations/new"
            className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            <Plus size={16} />
            New Generation
          </Link>
        )}
      </div>

      <div className="mb-6">
        <div className="relative">
          <Search
            className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
            size={20}
          />
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Search generations... (Press '/' to focus)"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
          />
        </div>
      </div>

      <div className="grid gap-4">
        {filteredGenerations.map((generation) => (
          <div
            key={generation.id}
            className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                  {generation.name}
                </h2>
                <Link
                  to={`/generations/${generation.id}`}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                  title="View generation details"
                >
                  <ExternalLink size={16} />
                </Link>
              </div>
              <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                <div className="flex items-center gap-1">
                  <Clock size={14} />
                  <span>
                    {new Date(generation.created).toLocaleDateString()}
                  </span>
                </div>
                <div className="px-2 py-1 bg-blue-50 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded">
                  {generation.runCount} runs
                </div>
              </div>
            </div>

            {generation.description && (
              <p className="mt-2 text-gray-600 dark:text-gray-300">
                {generation.description}
              </p>
            )}

            <div className="mt-4 flex items-center gap-4 text-sm">
              <div className="flex items-center gap-2">
                <span className="text-gray-500 dark:text-gray-400">
                  Created by:
                </span>
                <span className="dark:text-gray-300">
                  {generation.createdBy}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-gray-500 dark:text-gray-400">
                  Status:
                </span>
                <span className="dark:text-gray-300">{generation.status}</span>
              </div>
            </div>
          </div>
        ))}

        {filteredGenerations.length === 0 && (
          <div className="text-center p-8 text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            {generations.length === 0
              ? 'No generations found. Click "New Generation" to create one.'
              : 'No generations match your search criteria.'}
          </div>
        )}
      </div>
    </div>
  )
}

export default ListGenerations
