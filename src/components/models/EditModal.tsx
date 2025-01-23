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
  const [providerClasses, setProviderClasses] = useState<ProviderClass[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

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
    setProviders((prevProviders) => {
      const newProviders = [...prevProviders]
      if (field === 'config') {
        try {
          newProviders[index] = {
            ...newProviders[index],
            _configStr: value,
            config: JSON.parse(value),
          }
        } catch {
          newProviders[index] = {
            ...newProviders[index],
            _configStr: value,
          }
        }
      } else {
        newProviders[index] = {
          ...newProviders[index],
          [field]: value,
        }
      }
      return newProviders
    })
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

      // Remove _configStr before submitting
      const submitProviders = providers.map(
        ({ _configStr, ...provider }) => provider
      )

      await adminAPI.patch(`/model/${id}`, {
        providers: submitProviders,
      })

      navigate(`/models/${id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update model')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (loading)
    return <div className="flex justify-center p-8">Loading model...</div>
  if (error) return <div className="text-red-500 p-4">{error}</div>
  if (!originalModel)
    return <div className="text-gray-500 p-4">Model not found</div>

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold">
            Edit Model: {originalModel.slug}
          </h1>
          <span
            className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-sm ${
              originalModel.active
                ? 'bg-green-100 text-green-700'
                : 'bg-red-100 text-red-700'
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
          className="px-4 py-2 text-gray-600 hover:text-gray-800"
        >
          Cancel
        </button>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md flex items-center gap-2">
          <AlertCircle className="h-4 w-4" />
          <p>{error}</p>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-xs border border-gray-200">
        <div className="p-6 grid grid-cols-3 gap-6 text-sm bg-gray-50 border-b border-gray-200">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Clock size={16} className="text-gray-400 shrink-0" />
              <div>
                <span className="text-gray-500 block">Created</span>
                <span className="text-gray-900">
                  {new Date(originalModel.created).toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <User size={16} className="text-gray-400 shrink-0" />
              <div>
                <span className="text-gray-500 block">Created By</span>
                <span className="text-gray-900">
                  {originalModel.createdBy || 'Unknown'}
                </span>
              </div>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div>
            <div className="flex items-center justify-between mb-4">
              <label className="block text-lg font-semibold text-gray-900">
                Providers
              </label>
              <button
                type="button"
                onClick={addProvider}
                className="flex items-center gap-2 px-3 py-1 text-sm bg-blue-50 text-blue-600 rounded-md hover:bg-blue-100"
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
                      ? 'border-blue-200 bg-blue-50'
                      : 'border-gray-200 bg-gray-50'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => removeProvider(index)}
                    className="absolute right-2 top-2 text-gray-400 hover:text-gray-600"
                  >
                    <X size={16} />
                  </button>

                  <div className="grid gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Provider Name
                      </label>
                      <input
                        type="text"
                        required
                        value={provider.name}
                        onChange={(e) =>
                          handleProviderChange(index, 'name', e.target.value)
                        }
                        className="w-full rounded-md border border-gray-300 px-4 py-2 focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
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
                        className="w-full rounded-md border border-gray-300 px-4 py-2 focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Configuration (JSON)
                      </label>
                      <textarea
                        required
                        value={provider._configStr}
                        onChange={(e) =>
                          handleProviderChange(index, 'config', e.target.value)
                        }
                        rows={4}
                        className="w-full font-mono text-sm rounded-md border border-gray-300 px-4 py-2 focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="default-provider"
                        checked={provider.isDefault}
                        onChange={() => setDefaultProvider(index)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                      />
                      <label className="text-sm text-gray-700">
                        Default Provider
                      </label>
                    </div>
                  </div>
                </div>
              ))}

              {providers.length === 0 && (
                <div className="text-center p-6 border border-dashed border-gray-300 rounded-lg">
                  <p className="text-gray-500">
                    No providers configured. Click "Add Provider" to begin.
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-4 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={() => navigate(`/models/${id}`)}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 border border-gray-300 rounded-md hover:bg-gray-50"
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
  )
}

export default EditModel
