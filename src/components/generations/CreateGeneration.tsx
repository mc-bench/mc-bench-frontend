import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { AlertCircle } from 'lucide-react'

import { adminAPI } from '../../api/client'
import { getTestSets } from '../../api/leaderboard'
import { useAuth } from '../../hooks/useAuth'
import { TestSetOption } from '../../types/leaderboard'
import { Model } from '../../types/models'
import { Prompt } from '../../types/prompts'
import { Template } from '../../types/templates'
import { hasGenerationWriteAccess } from '../../utils/permissions'
import { ConfirmModal } from '../ui/ConfirmModal'
import { SearchSelect } from '../ui/SearchSelect'

const SAMPLE_PRESETS = [
  { value: 1, label: '1 sample' },
  { value: 2, label: '2 samples' },
  { value: 5, label: '5 samples' },
  { value: 10, label: '10 samples' },
  { value: 20, label: '20 samples' },
  { value: 50, label: '50 samples' },
]

const CreateGeneration = () => {
  const navigate = useNavigate()
  const { user } = useAuth()

  const canCreateGeneration = hasGenerationWriteAccess(user?.scopes || [])

  const [templates, setTemplates] = useState<Template[]>([])
  const [prompts, setPrompts] = useState<Prompt[]>([])
  const [models, setModels] = useState<Model[]>([])
  const [testSets, setTestSets] = useState<TestSetOption[]>([])

  const [formData, setFormData] = useState({
    name: '',
    description: '',
  })

  const [selectedTemplates, setSelectedTemplates] = useState<Template[]>([])
  const [selectedPrompts, setSelectedPrompts] = useState<Prompt[]>([])
  const [selectedModels, setSelectedModels] = useState<Model[]>([])
  const [selectedTestSet, setSelectedTestSet] = useState<TestSetOption | null>(
    null
  )

  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showConfirmModal, setShowConfirmModal] = useState(false)

  const [templateSearch, setTemplateSearch] = useState('')
  const [promptSearch, setPromptSearch] = useState('')
  const [modelSearch, setModelSearch] = useState('')

  const [numSamples, setNumSamples] = useState(1)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const [templatesRes, promptsRes, modelsRes, testSetsRes] =
        await Promise.all([
          adminAPI.get('/template'),
          adminAPI.get('/prompt'),
          adminAPI.get('/model'),
          getTestSets(),
        ])

      setTemplates(templatesRes.data.data.filter((t: Template) => t.active))

      setPrompts(promptsRes.data.data.filter((p: Prompt) => p.active))

      setModels(modelsRes.data.data.filter((m: Model) => m.active))

      setTestSets(testSetsRes)

      // Try to select "Authenticated Test Set" as the default, if it exists
      const defaultTestSet = testSetsRes.find(
        (ts: TestSetOption) => ts.name === 'Authenticated Test Set'
      )
      if (defaultTestSet) {
        setSelectedTestSet(defaultTestSet)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch data')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      setError('Please provide a name')
      return
    }

    if (
      !selectedTemplates.length ||
      !selectedPrompts.length ||
      !selectedModels.length
    ) {
      setError('Please select at least one template, prompt, and model')
      return
    }

    setSubmitting(true)
    try {
      // Build the request payload
      const payload = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        template_ids: selectedTemplates.map((t) => t.id),
        prompt_ids: selectedPrompts.map((p) => p.id),
        model_ids: selectedModels.map((m) => m.id),
        num_samples: numSamples,
      }

      // Add default_test_set_id if a test set is selected
      if (selectedTestSet) {
        Object.assign(payload, { default_test_set_id: selectedTestSet.id })
      }

      const response = await adminAPI.post('/run/generate', payload)
      navigate(`/generations/${response.data.id}`)
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to create generation'
      )
      setSubmitting(false)
    }
  }

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  if (!canCreateGeneration) {
    navigate('/generations')
    return null
  }

  if (loading) return <div className="flex justify-center p-8">Loading...</div>

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6 text-gray-900 dark:text-gray-100">
        Create New Generation
      </h1>

      {error && (
        <div className="mb-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 px-4 py-3 rounded-md flex items-center gap-2">
          <AlertCircle className="h-4 w-4" />
          <p>{error}</p>
        </div>
      )}

      <div className="space-y-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Name
              </label>
              <input
                name="name"
                type="text"
                value={formData.name}
                onChange={handleChange}
                required
                className="w-full rounded-md border border-gray-300 dark:border-gray-700 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:text-gray-200"
                placeholder="Enter a name for this generation"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Description
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows={3}
                className="w-full rounded-md border border-gray-300 dark:border-gray-700 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:text-gray-200"
                placeholder="Optional description"
              />
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Templates ({selectedTemplates.length} selected)
            </label>
            <SearchSelect
              items={templates}
              selected={selectedTemplates}
              onSelectionChange={setSelectedTemplates}
              searchValue={templateSearch}
              onSearchChange={setTemplateSearch}
              placeholder="templates"
            />
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Prompts ({selectedPrompts.length} selected)
            </label>
            <SearchSelect
              items={prompts}
              selected={selectedPrompts}
              onSelectionChange={setSelectedPrompts}
              searchValue={promptSearch}
              onSearchChange={setPromptSearch}
              placeholder="prompts"
            />
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Models ({selectedModels.length} selected)
            </label>
            <SearchSelect
              items={models}
              selected={selectedModels}
              onSelectionChange={setSelectedModels}
              searchValue={modelSearch}
              onSearchChange={setModelSearch}
              placeholder="models"
            />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Number of Samples per Configuration
          </label>
          <select
            value={numSamples}
            onChange={(e) => setNumSamples(Number(e.target.value))}
            className="w-full rounded-md border border-gray-300 dark:border-gray-700 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:text-gray-200"
          >
            {SAMPLE_PRESETS.map((preset) => (
              <option key={preset.value} value={preset.value}>
                {preset.label}
              </option>
            ))}
          </select>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Default Test Set (Optional)
          </label>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            All samples created from this generation will be automatically
            assigned to the selected test set.
          </p>
          <div className="relative">
            <select
              value={selectedTestSet?.id || ''}
              onChange={(e) => {
                const testSetId = e.target.value
                if (testSetId) {
                  const testSet =
                    testSets.find((ts) => ts.id === testSetId) || null
                  setSelectedTestSet(testSet)
                } else {
                  setSelectedTestSet(null)
                }
              }}
              className="w-full rounded-md border border-gray-300 dark:border-gray-700 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:text-gray-200"
            >
              <option value="">No test set (assign manually later)</option>
              {testSets.map((testSet) => (
                <option key={testSet.id} value={testSet.id}>
                  {testSet.name}
                </option>
              ))}
            </select>
          </div>
          {selectedTestSet && (
            <div className="mt-2 text-sm text-gray-600 dark:text-gray-300">
              <span className="font-medium">Selected: </span>
              <span className="inline-flex items-center bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300 px-2 py-1 rounded-md text-sm">
                {selectedTestSet.name}
              </span>
              {selectedTestSet.description && (
                <p className="mt-1 text-gray-500 dark:text-gray-400">
                  {selectedTestSet.description}
                </p>
              )}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-4">
          <button
            type="button"
            onClick={() => navigate('/generations')}
            className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-100 border border-gray-300 dark:border-gray-700 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            Cancel
          </button>
          <button
            onClick={() => setShowConfirmModal(true)}
            disabled={
              submitting ||
              !formData.name.trim() ||
              !selectedTemplates.length ||
              !selectedPrompts.length ||
              !selectedModels.length
            }
            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Create Generation
          </button>
        </div>
      </div>

      <ConfirmModal
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        onConfirm={handleSubmit}
        title="Confirm Generation Creation"
        isSubmitting={submitting}
        numSamples={numSamples}
        templateCount={selectedTemplates.length}
        promptCount={selectedPrompts.length}
        modelCount={selectedModels.length}
        testSetName={selectedTestSet?.name}
      />
    </div>
  )
}

export default CreateGeneration
