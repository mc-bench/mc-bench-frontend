import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertCircle } from 'lucide-react'
import { adminAPI } from '../../api/client'
import { Model } from '../../types/models'
import { Prompt } from '../../types/prompts'
import { Template } from '../../types/templates'
import { SearchSelect } from '../ui/SearchSelect'
import { ConfirmModal } from '../ui/ConfirmModal'

const CreateGeneration = () => {
  const navigate = useNavigate()
  const [templates, setTemplates] = useState<Template[]>([])
  const [prompts, setPrompts] = useState<Prompt[]>([])
  const [models, setModels] = useState<Model[]>([])

  const [formData, setFormData] = useState({
    name: '',
    description: '',
  })

  const [selectedTemplates, setSelectedTemplates] = useState<Template[]>([])
  const [selectedPrompts, setSelectedPrompts] = useState<Prompt[]>([])
  const [selectedModels, setSelectedModels] = useState<Model[]>([])

  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showConfirmModal, setShowConfirmModal] = useState(false)

  const [templateSearch, setTemplateSearch] = useState('')
  const [promptSearch, setPromptSearch] = useState('')
  const [modelSearch, setModelSearch] = useState('')

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const [templatesRes, promptsRes, modelsRes] = await Promise.all([
        adminAPI.get('/template'),
        adminAPI.get('/prompt'),
        adminAPI.get('/model'),
      ])

      setTemplates(templatesRes.data.data.filter((t: Template) => t.active))
      setPrompts(promptsRes.data.data.filter((p: Prompt) => p.active))
      setModels(modelsRes.data.data.filter((m: Model) => m.active))
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
      const response = await adminAPI.post('/run/generate', {
        name: formData.name.trim(),
        description: formData.description.trim(),
        template_ids: selectedTemplates.map((t) => t.id),
        prompt_ids: selectedPrompts.map((p) => p.id),
        model_ids: selectedModels.map((m) => m.id),
      })
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

  if (loading) return <div className="flex justify-center p-8">Loading...</div>

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Create New Generation</h1>

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md flex items-center gap-2">
          <AlertCircle className="h-4 w-4" />
          <p>{error}</p>
        </div>
      )}

      <div className="space-y-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Name
              </label>
              <input
                name="name"
                type="text"
                value={formData.name}
                onChange={handleChange}
                required
                className="w-full rounded-md border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter a name for this generation"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows={3}
                className="w-full rounded-md border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Optional description"
              />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
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

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
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

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
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

        <div className="flex justify-end gap-4">
          <button
            type="button"
            onClick={() => navigate('/generations')}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 border border-gray-300 rounded-md hover:bg-gray-50"
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
        templateCount={selectedTemplates.length}
        promptCount={selectedPrompts.length}
        modelCount={selectedModels.length}
        name={formData.name}
      />
    </div>
  )
}

export default CreateGeneration
