import React, { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import {
  AlertCircle,
  CheckCircle,
  Clock,
  Plus,
  User,
  X,
  XCircle,
} from 'lucide-react'

import { adminAPI } from '../../api/client'
import { Model, Provider, ProviderClass } from '../../types/models'

const EditModel = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const [originalModel, setOriginalModel] = useState<Model | null>(null)
  const [providers, setProviders] = useState<Provider[]>([])
  const [name, setName] = useState('')
  const [providerClasses, setProviderClasses] = useState<ProviderClass[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [jsonErrors, setJsonErrors] = useState<Record<number, string>>({})

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        const [modelResponse, classesResponse] = await Promise.all([
          adminAPI.get(`/model/${id}`),
          adminAPI.get('/provider-class'),
        ])

        const modelData = modelResponse.data
        setOriginalModel(modelData)
        setName(modelData.name || modelData.slug)
        // Initialize providers with _configStr
        const providersWithStr = modelData.providers.map((p: Provider) => ({
          ...p,
          _configStr: JSON.stringify(p.config, null, 2),
        }))
        setProviders(providersWithStr)
        setProviderClasses(classesResponse.data)
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Failed to fetch model data'
        )
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [id])

  const handleProviderChange = (
    index: number,
    field: keyof Provider,
    value: string
  ) => {
    if (field === 'config') {
      // Clear any existing error for this provider
      setJsonErrors((prev) => {
        const newErrors = { ...prev }
        delete newErrors[index]
        return newErrors
      })

      try {
        // Try parsing to validate
        JSON.parse(value)

        setProviders((prevProviders) => {
          const newProviders = [...prevProviders]
          newProviders[index] = {
            ...newProviders[index],
            _configStr: value,
            config: JSON.parse(value),
          }
          return newProviders
        })
      } catch (err) {
        // Store the error message for this provider
        setJsonErrors((prev) => ({
          ...prev,
          [index]: err instanceof Error ? err.message : String(err),
        }))

        setProviders((prevProviders) => {
          const newProviders = [...prevProviders]
          newProviders[index] = {
            ...newProviders[index],
            _configStr: value,
          }
          return newProviders
        })
      }
    } else {
      setProviders((prevProviders) => {
        const newProviders = [...prevProviders]
        newProviders[index] = {
          ...newProviders[index],
          [field]: value,
        }
        return newProviders
      })
    }
  }

  const addProvider = () => {
    setProviders((prev) => [
      ...prev,
      {
        name: '',
        providerClass: '',
        config: {},
        _configStr: '{}',
        isDefault: prev.length === 0,
      },
    ])
  }

  const removeProvider = (index: number) => {
    setProviders((prev) => {
      const newProviders = prev.filter((_, i) => i !== index)
      // If we removed the default provider, make the first remaining one default
      if (prev[index].isDefault && newProviders.length > 0) {
        newProviders[0].isDefault = true
      }
      return newProviders
    })
  }

  const setDefaultProvider = (index: number) => {
    setProviders((prev) =>
      prev.map((provider, i) => ({
        ...provider,
        isDefault: i === index,
      }))
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!originalModel) return

    setError(null)
    setIsSubmitting(true)

    try {
      // Validate that we have at least one provider
      if (providers.length === 0) {
        throw new Error('At least one provider is required')
      }

      // Validate that exactly one provider is default
      const defaultProviders = providers.filter((p) => p.isDefault)
      if (defaultProviders.length !== 1) {
        throw new Error('Exactly one provider must be set as default')
      }

      // Check if there are any JSON validation errors
      if (Object.keys(jsonErrors).length > 0) {
        // Get the first provider with an error to report
        const firstErrorIndex = parseInt(Object.keys(jsonErrors)[0])
        const providerName =
          providers[firstErrorIndex]?.name || `Provider ${firstErrorIndex + 1}`
        throw new Error(
          `Invalid JSON in config for "${providerName}": ${jsonErrors[firstErrorIndex]}`
        )
      }

      // Process providers to ensure config is properly parsed from _configStr
      const processedProviders = providers.map((provider, index) => {
        // If _configStr exists, try to parse it to ensure config is up-to-date
        if (provider._configStr) {
          try {
            return {
              ...provider,
              config: JSON.parse(provider._configStr),
              _configStr: undefined, // Remove _configStr
            }
          } catch (err) {
            // This shouldn't happen if we validate properly above
            const errorMsg = `Invalid JSON in config for provider "${provider.name}": ${err instanceof Error ? err.message : String(err)}`
            setJsonErrors((prev) => ({
              ...prev,
              [index]: err instanceof Error ? err.message : String(err),
            }))
            throw new Error(errorMsg)
          }
        }
        return provider
      })

      await adminAPI.patch(`/model/${id}`, {
        name,
        providers: processedProviders,
      })

      navigate(`/models/${id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update model')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (loading)
    return (
      <div className="flex justify-center p-8 text-gray-900 dark:text-gray-100">
        Loading model...
      </div>
    )
  if (error)
    return <div className="text-red-500 dark:text-red-400 p-4">{error}</div>
  if (!originalModel)
    return (
      <div className="text-gray-500 dark:text-gray-400 p-4">
        Model not found
      </div>
    )

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Edit Model: {originalModel.slug}
          </h1>
          <span
            className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-sm ${
              originalModel.active
                ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
            }`}
          >
            {originalModel.active ? (
              <CheckCircle size={14} />
            ) : (
              <XCircle size={14} />
            )}
            {originalModel.active ? 'Active' : 'Inactive'}
          </span>
        </div>
        <button
          onClick={() => navigate(`/models/${id}`)}
          className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-white"
        >
          Cancel
        </button>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-300 px-4 py-3 rounded-md flex items-center gap-2">
          <AlertCircle className="h-4 w-4" />
          <p>{error}</p>
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="p-6">
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Display Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={originalModel?.slug}
              className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div className="p-6 grid grid-cols-3 gap-6 text-sm bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Clock
                  size={16}
                  className="text-gray-400 dark:text-gray-500 shrink-0"
                />
                <div>
                  <span className="text-gray-500 dark:text-gray-400 block">
                    Created
                  </span>
                  <span className="text-gray-900 dark:text-gray-100">
                    {new Date(originalModel.created).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <User
                  size={16}
                  className="text-gray-400 dark:text-gray-500 shrink-0"
                />
                <div>
                  <span className="text-gray-500 dark:text-gray-400 block">
                    Created By
                  </span>
                  <span className="text-gray-900 dark:text-gray-100">
                    {originalModel.createdBy || 'Unknown'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            <div>
              <div className="flex items-center justify-between mb-4">
                <label className="block text-lg font-semibold text-gray-900 dark:text-gray-100">
                  Providers
                </label>
                <button
                  type="button"
                  onClick={addProvider}
                  className="flex items-center gap-2 px-3 py-1 text-sm bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300 rounded-md hover:bg-blue-100 dark:hover:bg-blue-800/50"
                >
                  <Plus size={16} />
                  Add Provider
                </button>
              </div>

              <div className="space-y-4">
                {providers.map((provider, index) => (
                  <div
                    key={index}
                    className={`p-4 border rounded-lg relative ${
                      provider.isDefault
                        ? 'border-blue-200 dark:border-blue-700 bg-blue-50 dark:bg-blue-900/30'
                        : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => removeProvider(index)}
                      className="absolute right-2 top-2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
                    >
                      <X size={16} />
                    </button>

                    <div className="grid gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Provider Name
                        </label>
                        <input
                          type="text"
                          required
                          value={provider.name}
                          onChange={(e) =>
                            handleProviderChange(index, 'name', e.target.value)
                          }
                          className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Provider Class
                        </label>
                        <select
                          required
                          value={provider.providerClass}
                          onChange={(e) =>
                            handleProviderChange(
                              index,
                              'providerClass',
                              e.target.value
                            )
                          }
                          className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                          <option value="">Select a provider class</option>
                          {providerClasses.map((pc) => (
                            <option key={pc.id} value={pc.name}>
                              {pc.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Configuration (JSON)
                        </label>
                        <textarea
                          required
                          value={provider._configStr}
                          onChange={(e) =>
                            handleProviderChange(
                              index,
                              'config',
                              e.target.value
                            )
                          }
                          rows={4}
                          className={`w-full font-mono text-sm rounded-md border ${
                            jsonErrors[index]
                              ? 'border-red-500 dark:border-red-500 focus:border-red-500 focus:ring-red-500'
                              : 'border-gray-300 dark:border-gray-600 focus:border-blue-500 focus:ring-blue-500'
                          } bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-4 py-2 focus:outline-none focus:ring-2`}
                        />
                        {jsonErrors[index] ? (
                          <div className="mt-1 text-sm text-red-600 dark:text-red-400 flex items-center gap-1">
                            <AlertCircle size={14} />
                            <span>Invalid JSON: {jsonErrors[index]}</span>
                          </div>
                        ) : provider._configStr ? (
                          <div className="mt-1 text-sm text-green-600 dark:text-green-400 flex items-center gap-1">
                            <CheckCircle size={14} />
                            <span>Valid JSON</span>
                          </div>
                        ) : null}
                      </div>

                      <div className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="default-provider"
                          checked={provider.isDefault}
                          onChange={() => setDefaultProvider(index)}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-gray-600"
                        />
                        <label className="text-sm text-gray-700 dark:text-gray-300">
                          Default Provider
                        </label>
                      </div>
                    </div>
                  </div>
                ))}

                {providers.length === 0 && (
                  <div className="text-center p-6 border border-dashed border-gray-300 dark:border-gray-600 rounded-lg">
                    <p className="text-gray-500 dark:text-gray-400">
                      No providers configured. Click "Add Provider" to begin.
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
              <button
                type="button"
                onClick={() => navigate(`/models/${id}`)}
                className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-white border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default EditModel
