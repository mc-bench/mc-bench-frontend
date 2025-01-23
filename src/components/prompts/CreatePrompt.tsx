import React, { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

import { AlertCircle } from 'lucide-react'

import { adminAPI } from '../../api/client'
import { PromptFormData } from '../../types/prompts.ts'

const CreatePrompt = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const [formData, setFormData] = useState<PromptFormData>({
    name: '',
    buildSpecification: '',
  })
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isCloning, setIsCloning] = useState(false)

  useEffect(() => {
    const cloneId = new URLSearchParams(location.search).get('clone')
    if (cloneId) {
      fetchPromptToClone(cloneId)
    }
  }, [location])

  const fetchPromptToClone = async (id: string) => {
    try {
      setIsCloning(true)
      const { data } = await adminAPI.get(`/prompt/${id}`)
      setFormData({
        name: `${data.name} (Copy)`,
        buildSpecification: data.buildSpecification,
      })
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to fetch prompt to clone'
      )
    } finally {
      setIsCloning(false)
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsSubmitting(true)

    try {
      await adminAPI.post('/prompt', {
        ...formData,
        active: true,
      })
      navigate('/prompts')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create prompt')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isCloning)
    return (
      <div className="flex justify-center p-8">Loading prompt to clone...</div>
    )

  return (
    <div className="max-w-3xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Create New Prompt</h1>
        <button
          onClick={() => navigate('/prompts')}
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

      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="space-y-2">
            <label
              htmlFor="name"
              className="block text-sm font-medium text-gray-700"
            >
              Prompt Name
            </label>
            <input
              id="name"
              name="name"
              type="text"
              required
              value={formData.name}
              onChange={handleChange}
              className="w-full rounded-md border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter prompt name"
            />
          </div>

          <div className="space-y-2">
            <label
              htmlFor="buildSpecification"
              className="block text-sm font-medium text-gray-700"
            >
              Build Specification
            </label>
            <textarea
              id="buildSpecification"
              name="buildSpecification"
              required
              value={formData.buildSpecification}
              onChange={handleChange}
              rows={12}
              className="w-full rounded-md border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
              placeholder="Enter build specification"
            />
          </div>

          <div className="flex justify-end gap-4 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={() => navigate('/prompts')}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Creating...' : 'Create Prompt'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default CreatePrompt
