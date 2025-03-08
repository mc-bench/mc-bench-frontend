import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { AlertCircle, CheckCircle, Plus, X } from 'lucide-react'

import { adminAPI } from '../../api/client'
import { ModelFormData, Provider, ProviderClass } from '../../types/models'

const CreateModel = () => {
  const navigate = useNavigate()
  const [formData, setFormData] = useState<ModelFormData>({
    slug: '',
    name: '',
    providers: [],
  })
  const [providerClasses, setProviderClasses] = useState<ProviderClass[]>([])
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showNameField, setShowNameField] = useState(false)
  const [jsonErrors, setJsonErrors] = useState<Record<number, string>>({}) // Store JSON validation errors by provider index

  useEffect(() => {
    fetchProviderClasses()
  }, [])

  const fetchProviderClasses = async () => {
    try {
      const { data } = await adminAPI.get('/provider-class')
      setProviderClasses(data)
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to fetch provider classes'
      )
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
      // Keep name synced with slug until user shows name field
      ...(name === 'slug' && !showNameField && { name: value }),
    }))
  }

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

        setFormData((prev) => {
          const newProviders = [...prev.providers]
          newProviders[index] = {
            ...newProviders[index],
            _configStr: value,
            config: JSON.parse(value),
          }
          return { ...prev, providers: newProviders }
        })
      } catch (err) {
        // Store the error message for this provider
        setJsonErrors((prev) => ({
          ...prev,
          [index]: err instanceof Error ? err.message : String(err),
        }))

        setFormData((prev) => {
          const newProviders = [...prev.providers]
          newProviders[index] = {
            ...newProviders[index],
            _configStr: value,
          }
          return { ...prev, providers: newProviders }
        })
      }
    } else {
      setFormData((prev) => {
        const newProviders = [...prev.providers]
        newProviders[index] = {
          ...newProviders[index],
          [field]: value,
        }
        return { ...prev, providers: newProviders }
      })
    }
  }

  const addProvider = () => {
    setFormData((prev) => ({
      ...prev,
      providers: [
        ...prev.providers,
        {
          name: '',
          providerClass: '',
          config: {},
          _configStr: '{}',
          isDefault: prev.providers.length === 0, // First provider is default
          active: true,
        },
      ],
    }))
  }

  const removeProvider = (index: number) => {
    setFormData((prev) => {
      const newProviders = prev.providers.filter((_, i) => i !== index)
      // If we removed the default provider, make the first remaining one default
      if (prev.providers[index].isDefault && newProviders.length > 0) {
        newProviders[0].isDefault = true
      }
      return { ...prev, providers: newProviders }
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsSubmitting(true)

    try {
      // Validate that we have at least one provider
      if (formData.providers.length === 0) {
        throw new Error('At least one provider is required')
      }

      // Validate that exactly one provider is default
      const defaultProviders = formData.providers.filter((p) => p.isDefault)
      if (defaultProviders.length !== 1) {
        throw new Error('Exactly one provider must be set as default')
      }

      // Check if there are any JSON validation errors
      if (Object.keys(jsonErrors).length > 0) {
        // Get the first provider with an error to report
        const firstErrorIndex = parseInt(Object.keys(jsonErrors)[0])
        const providerName =
          formData.providers[firstErrorIndex]?.name ||
          `Provider ${firstErrorIndex + 1}`
        throw new Error(
          `Invalid JSON in config for "${providerName}": ${jsonErrors[firstErrorIndex]}`
        )
      }

      // Process providers to ensure config is properly parsed from _configStr
      const processedProviders = formData.providers.map((provider, index) => {
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

      // Submit with processed providers
      const submitData = {
        ...formData,
        providers: processedProviders,
      }

      await adminAPI.post('/model', submitData)
      navigate('/models')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create model')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          Create New Model
        </h1>
        <button
          onClick={() => navigate('/models')}
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

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="space-y-4">
            <div>
              <label
                htmlFor="slug"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                Model Slug
              </label>
              <input
                id="slug"
                name="slug"
                type="text"
                required
                value={formData.slug}
                onChange={handleChange}
                placeholder="e.g., GPT-4-0314 or Gemini-1.5-Pro-002"
                className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              {!showNameField ? (
                <button
                  type="button"
                  onClick={() => setShowNameField(true)}
                  className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 flex items-center gap-1"
                >
                  <Plus size={16} />
                  Customize Display Name
                </button>
              ) : (
                <div>
                  <label
                    htmlFor="name"
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                  >
                    Display Name
                  </label>
                  <input
                    id="name"
                    name="name"
                    type="text"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="e.g., GPT-4 (March 2024)"
                    className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              )}
            </div>

            <div>
              <div className="flex items-center justify-between mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
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
                {formData.providers.map((provider, index) => (
                  <div
                    key={index}
                    className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-700 relative"
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
                          value={
                            provider._configStr ||
                            JSON.stringify(provider.config, null, 2)
                          }
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
                          onChange={() => {
                            setFormData((prev) => ({
                              ...prev,
                              providers: prev.providers.map((p, i) => ({
                                ...p,
                                isDefault: i === index,
                              })),
                            }))
                          }}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-gray-600"
                        />
                        <label className="text-sm text-gray-700 dark:text-gray-300">
                          Default Provider
                        </label>
                      </div>
                    </div>
                  </div>
                ))}

                {formData.providers.length === 0 && (
                  <div className="text-center p-6 border border-dashed border-gray-300 dark:border-gray-600 rounded-lg">
                    <p className="text-gray-500 dark:text-gray-400">
                      No providers added yet. Click "Add Provider" to begin.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-4">
          <button
            type="button"
            onClick={() => navigate('/models')}
            className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-white border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Creating...' : 'Create Model'}
          </button>
        </div>
      </form>
    </div>
  )
}

export default CreateModel
