import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'

import {
  AlertCircle,
  CheckCircle,
  Clock,
  Copy,
  ExternalLink,
  Eye,
  EyeOff,
  MoreVertical,
  Plus,
  Search,
  Trash2,
  XCircle,
} from 'lucide-react'

import { adminAPI } from '../../api/client'
import { Prompt } from '../../types/prompts'

const EXPERIMENTAL_STATES = [
  {
    value: 'EXPERIMENTAL',
    label: 'Experimental',
    color: 'text-amber-700 bg-amber-50',
  },
  { value: 'RELEASED', label: 'Released', color: 'text-green-700 bg-green-50' },
  {
    value: 'DEPRECATED',
    label: 'Deprecated',
    color: 'text-gray-700 bg-gray-50',
  },
  { value: 'REJECTED', label: 'Rejected', color: 'text-red-700 bg-red-50' },
] as const

const PromptList = () => {
  const searchInputRef = useRef<HTMLInputElement>(null)
  const [prompts, setPrompts] = useState<Prompt[]>([])
  const [showInactive, setShowInactive] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null)
  const [enabledStates, setEnabledStates] = useState<Set<string>>(
    new Set(['EXPERIMENTAL', 'RELEASED'])
  )

  useEffect(() => {
    fetchPrompts()
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

  const fetchPrompts = async () => {
    try {
      setLoading(true)
      const { data } = await adminAPI.get('/prompt')
      setPrompts(data.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch prompts')
    } finally {
      setLoading(false)
    }
  }

  const togglePromptStatus = async (id: string, currentStatus: boolean) => {
    try {
      await adminAPI.patch(`/prompt/${id}`, {
        active: !currentStatus,
      })

      if (showInactive || !currentStatus) {
        setPrompts((prev) =>
          prev.map((prompt) =>
            prompt.id === id ? { ...prompt, active: !currentStatus } : prompt
          )
        )
      } else {
        setPrompts((prev) => prev.filter((prompt) => prompt.id !== id))
      }
      setActiveDropdown(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update prompt')
    }
  }

  const deletePrompt = async (id: string) => {
    try {
      await adminAPI.delete(`/prompt/${id}`)
      setPrompts((prev) => prev.filter((prompt) => prompt.id !== id))
      setActiveDropdown(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete prompt')
    }
  }

  const clonePrompt = async (promptId: string) => {
    try {
      window.location.href = `/prompts/new?clone=${promptId}`
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to clone prompt')
    }
  }

  const filteredPrompts = prompts
    .filter((prompt) => (showInactive ? true : prompt.active))
    .filter((prompt) => {
      if (!searchTerm) return true

      const searchLower = searchTerm.toLowerCase()
      return (
        prompt.name.toLowerCase().includes(searchLower) ||
        prompt.createdBy.toLowerCase().includes(searchLower) ||
        prompt.buildSpecification.toLowerCase().includes(searchLower) ||
        (prompt.buildSize?.toLowerCase().includes(searchLower) ?? false)
      )
    })
    .filter((prompt) =>
      enabledStates.has(prompt.experimentalState || 'EXPERIMENTAL')
    )

  if (loading)
    return <div className="flex justify-center p-8">Loading prompts...</div>
  if (error) return <div className="text-red-500 p-4">{error}</div>

  return (
    <div className="p-4 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Prompts</h1>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-4 mr-4">
            {EXPERIMENTAL_STATES.map((state) => (
              <label
                key={state.value}
                className="flex items-center gap-2 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={enabledStates.has(state.value)}
                  onChange={() => {
                    const newStates = new Set(enabledStates)
                    if (newStates.has(state.value)) {
                      newStates.delete(state.value)
                    } else {
                      newStates.add(state.value)
                    }
                    setEnabledStates(newStates)
                  }}
                  className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className={`text-sm ${state.color}`}>{state.label}</span>
              </label>
            ))}
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <span className="text-sm">Show Inactive</span>
            <input
              type="checkbox"
              checked={showInactive}
              onChange={(e) => setShowInactive(e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
          </label>
          <Link
            to="/prompts/new"
            className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            <Plus size={16} />
            New Prompt
          </Link>
        </div>
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
            placeholder="Search prompts by name, creator, or specification... (Press '/' to focus)"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>

      <div className="grid gap-4">
        {filteredPrompts.map((prompt) => (
          <div
            key={prompt.id}
            className={`bg-white rounded-lg shadow-sm border border-gray-200 p-4 ${!prompt.active ? 'opacity-60' : ''}`}
          >
            <div className="flex items-center justify-between pb-2">
              <div className="flex-1 flex items-center gap-2">
                <h2 className="text-xl font-semibold">{prompt.name}</h2>
                <Link
                  to={`/prompts/${prompt.id}`}
                  className="text-gray-500 hover:text-gray-700"
                  title="View prompt"
                >
                  <ExternalLink size={16} />
                </Link>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs ${
                    (prompt.experimentalState || 'EXPERIMENTAL') === 'RELEASED'
                      ? 'bg-green-100 text-green-700'
                      : (prompt.experimentalState || 'EXPERIMENTAL') ===
                          'EXPERIMENTAL'
                        ? 'bg-amber-100 text-amber-700'
                        : (prompt.experimentalState || 'EXPERIMENTAL') ===
                            'DEPRECATED'
                          ? 'bg-gray-100 text-gray-700'
                          : 'bg-red-100 text-red-700'
                  }`}
                >
                  {(prompt.experimentalState || 'EXPERIMENTAL') ===
                    'RELEASED' && <CheckCircle size={12} />}
                  {(prompt.experimentalState || 'EXPERIMENTAL') ===
                    'EXPERIMENTAL' && <AlertCircle size={12} />}
                  {(prompt.experimentalState || 'EXPERIMENTAL') ===
                    'DEPRECATED' && <Clock size={12} />}
                  {(prompt.experimentalState || 'EXPERIMENTAL') ===
                    'REJECTED' && <XCircle size={12} />}
                  <span className="ml-0.5">
                    {prompt.experimentalState || 'EXPERIMENTAL'}
                  </span>
                </span>
                <div className="relative">
                  <button
                    onClick={() =>
                      setActiveDropdown(
                        activeDropdown === prompt.id ? null : prompt.id
                      )
                    }
                    className="p-2 hover:bg-gray-100 rounded"
                  >
                    <MoreVertical size={20} />
                  </button>

                  {activeDropdown === prompt.id && (
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg border border-gray-200 z-10">
                      <Link
                        to={`/prompts/${prompt.id}`}
                        className="w-full text-left px-4 py-2 hover:bg-gray-100 flex items-center gap-2"
                      >
                        <Eye size={16} /> View Details
                      </Link>
                      <button
                        onClick={() => clonePrompt(prompt.id)}
                        className="w-full text-left px-4 py-2 hover:bg-gray-100 flex items-center gap-2"
                      >
                        <Copy size={16} /> Clone Prompt
                      </button>
                      <button
                        onClick={() =>
                          togglePromptStatus(prompt.id, prompt.active)
                        }
                        className="w-full text-left px-4 py-2 hover:bg-gray-100 flex items-center gap-2"
                      >
                        {prompt.active ? (
                          <>
                            <EyeOff size={16} /> Mark Inactive
                          </>
                        ) : (
                          <>
                            <Eye size={16} /> Mark Active
                          </>
                        )}
                      </button>
                      {prompt.usage === 0 && (
                        <button
                          onClick={() => deletePrompt(prompt.id)}
                          className="w-full text-left px-4 py-2 hover:bg-gray-100 text-red-600 flex items-center gap-2"
                        >
                          <Trash2 size={16} /> Delete
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex gap-4 text-sm text-gray-500">
              <span>
                Created: {new Date(prompt.created).toLocaleDateString()}
              </span>
              <span>By: {prompt.createdBy}</span>
              {prompt.lastModified && (
                <span>
                  Updated: {new Date(prompt.lastModified).toLocaleDateString()}
                </span>
              )}
              <span className={prompt.usage > 0 ? 'font-medium' : ''}>
                Usage Count: {prompt.usage}
                {prompt.usage > 0 && (
                  <span className="ml-2 text-xs text-gray-600">
                    (cannot be deleted)
                  </span>
                )}
              </span>
            </div>

            {prompt.tags && prompt.tags.length > 0 && (
              <div className="mt-2 flex items-center text-sm">
                <span className="text-gray-500 mr-2">Tags:</span>
                <div className="flex flex-wrap gap-2">
                  {prompt.tags.map((tag) => (
                    <span
                      key={tag.name}
                      className="inline-flex items-center px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-800 rounded-full"
                    >
                      {tag.name}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-2 text-sm">
              <div className="text-gray-500 float-left">
                Build Specification:
                {prompt.buildSize && (
                  <span className="ml-2 text-gray-400">
                    (Build Size: {prompt.buildSize})
                  </span>
                )}
              </div>
              <div className="mt-1 font-mono text-xs bg-gray-50 p-2 rounded border border-gray-200 clear-both">
                {prompt.buildSpecification.length > 200
                  ? prompt.buildSpecification.slice(0, 200) + '...'
                  : prompt.buildSpecification}
              </div>
            </div>
          </div>
        ))}

        {filteredPrompts.length === 0 && (
          <div className="text-center p-8 text-gray-500">
            {prompts.length === 0
              ? 'No prompts found. Click "New Prompt" to create one.'
              : 'No prompts match your search criteria.'}
          </div>
        )}
      </div>
    </div>
  )
}

export default PromptList
