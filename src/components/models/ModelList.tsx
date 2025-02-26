import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'

import {
  AlertCircle,
  CheckCircle,
  Clock,
  Edit,
  ExternalLink,
  Eye,
  EyeOff,
  MoreVertical,
  Plus,
  Search,
  Settings,
  Trash2,
  XCircle,
} from 'lucide-react'

import { adminAPI } from '../../api/client'
import { Model } from '../../types/models'

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

const ModelList = () => {
  const searchInputRef = useRef<HTMLInputElement>(null)
  const [models, setModels] = useState<Model[]>([])
  const [showInactive, setShowInactive] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null)
  const [enabledStates, setEnabledStates] = useState<Set<string>>(
    new Set(['EXPERIMENTAL', 'RELEASED'])
  )

  useEffect(() => {
    fetchModels()
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

  const fetchModels = async () => {
    try {
      setLoading(true)
      const { data } = await adminAPI.get('/model')
      setModels(data.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch models')
    } finally {
      setLoading(false)
    }
  }

  const toggleModelStatus = async (id: string, currentStatus: boolean) => {
    try {
      await adminAPI.patch(`/model/${id}`, {
        active: !currentStatus,
      })

      if (showInactive || !currentStatus) {
        setModels((prev) =>
          prev.map((model) =>
            model.id === id ? { ...model, active: !currentStatus } : model
          )
        )
      } else {
        setModels((prev) => prev.filter((model) => model.id !== id))
      }
      setActiveDropdown(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update model')
    }
  }

  const deleteModel = async (id: string) => {
    try {
      await adminAPI.delete(`/model/${id}`)
      setModels((prev) => prev.filter((model) => model.id !== id))
      setActiveDropdown(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete model')
    }
  }

  const filteredModels = models
    .filter((model) => (showInactive ? true : model.active))
    .filter((model) => {
      if (!searchTerm) return true

      const searchLower = searchTerm.toLowerCase()
      return (
        model.slug?.toLowerCase().includes(searchLower) ||
        model.createdBy?.toLowerCase().includes(searchLower) ||
        model.providers.some(
          (provider) =>
            provider.name.toLowerCase().includes(searchLower) ||
            provider.providerClass.toLowerCase().includes(searchLower)
        )
      )
    })
    .filter((model) =>
      enabledStates.has(model.experimentalState || 'EXPERIMENTAL')
    )

  if (loading)
    return <div className="flex justify-center p-8">Loading models...</div>
  if (error) return <div className="text-red-500 p-4">{error}</div>

  return (
    <div className="p-4 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Models</h1>
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
            to="/models/new"
            className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            <Plus size={16} />
            New Model
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
            placeholder="Search models by name, provider, or creator... (Press '/' to focus)"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>

      <div className="grid gap-4">
        {filteredModels.map((model) => (
          <div
            key={model.id}
            className={`bg-white rounded-lg shadow-sm border border-gray-200 p-4 ${!model.active ? 'opacity-60' : ''}`}
          >
            <div className="flex items-center justify-between pb-2">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-semibold">
                    {model.name || model.slug}
                  </h2>
                  <Link
                    to={`/models/${model.id}`}
                    className="text-gray-500 hover:text-gray-700"
                    title="View model"
                  >
                    <ExternalLink size={16} />
                  </Link>
                </div>
                {model.name && (
                  <div className="text-sm text-gray-500">ID: {model.slug}</div>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs ${
                    (model.experimentalState || 'EXPERIMENTAL') === 'RELEASED'
                      ? 'bg-green-100 text-green-700'
                      : (model.experimentalState || 'EXPERIMENTAL') ===
                          'EXPERIMENTAL'
                        ? 'bg-amber-100 text-amber-700'
                        : (model.experimentalState || 'EXPERIMENTAL') ===
                            'DEPRECATED'
                          ? 'bg-gray-100 text-gray-700'
                          : 'bg-red-100 text-red-700'
                  }`}
                >
                  {(model.experimentalState || 'EXPERIMENTAL') ===
                    'RELEASED' && <CheckCircle size={12} />}
                  {(model.experimentalState || 'EXPERIMENTAL') ===
                    'EXPERIMENTAL' && <AlertCircle size={12} />}
                  {(model.experimentalState || 'EXPERIMENTAL') ===
                    'DEPRECATED' && <Clock size={12} />}
                  {(model.experimentalState || 'EXPERIMENTAL') ===
                    'REJECTED' && <XCircle size={12} />}
                  <span className="ml-0.5">
                    {model.experimentalState || 'EXPERIMENTAL'}
                  </span>
                </span>
                <div className="relative">
                  <button
                    onClick={() =>
                      setActiveDropdown(
                        activeDropdown === model.id ? null : model.id
                      )
                    }
                    className="p-2 hover:bg-gray-100 rounded"
                  >
                    <MoreVertical size={20} />
                  </button>

                  {activeDropdown === model.id && (
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg border border-gray-200 z-10">
                      <Link
                        to={`/models/${model.id}`}
                        className="w-full text-left px-4 py-2 hover:bg-gray-100 flex items-center gap-2"
                      >
                        <Eye size={16} /> View Details
                      </Link>
                      <Link
                        to={`/models/${model.id}/edit`}
                        className="w-full text-left px-4 py-2 hover:bg-gray-100 flex items-center gap-2"
                      >
                        <Edit size={16} /> Edit Model
                      </Link>
                      <button
                        onClick={() =>
                          toggleModelStatus(model.id, model.active)
                        }
                        className="w-full text-left px-4 py-2 hover:bg-gray-100 flex items-center gap-2"
                      >
                        {model.active ? (
                          <>
                            <EyeOff size={16} /> Mark Inactive
                          </>
                        ) : (
                          <>
                            <Eye size={16} /> Mark Active
                          </>
                        )}
                      </button>
                      <button
                        onClick={() => deleteModel(model.id)}
                        className="w-full text-left px-4 py-2 hover:bg-gray-100 text-red-600 flex items-center gap-2"
                      >
                        <Trash2 size={16} /> Delete
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex gap-4 text-sm text-gray-500">
              <span>
                Created: {new Date(model.created).toLocaleDateString()}
              </span>
              <span>By: {model.createdBy}</span>
              {model.lastModified && (
                <span>
                  Updated: {new Date(model.lastModified).toLocaleDateString()}
                </span>
              )}
              <span>Providers: {model.providers.length}</span>
              <span className="flex items-center gap-1">
                <Settings size={14} />
                Default:{' '}
                {model.providers.find((p) => p.isDefault)?.name || 'None'}
              </span>
              <span>Usage: {model.usage || 0}</span>
            </div>

            <div className="mt-2">
              <div className="flex flex-wrap gap-2">
                {model.providers.map((provider, index) => (
                  <span
                    key={index}
                    className={`inline-flex items-center px-2 py-1 rounded-full text-xs
                      ${
                        provider.isDefault
                          ? 'bg-blue-100 text-blue-700 border border-blue-300'
                          : 'bg-gray-100 text-gray-700 border border-gray-300'
                      }`}
                  >
                    {provider.name}
                  </span>
                ))}
              </div>
            </div>
          </div>
        ))}

        {filteredModels.length === 0 && (
          <div className="text-center p-8 text-gray-500">
            {models.length === 0
              ? 'No models found. Click "New Model" to create one.'
              : 'No models match your search criteria.'}
          </div>
        )}
      </div>
    </div>
  )
}

export default ModelList
