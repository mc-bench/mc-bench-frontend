import React, { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

import { AlertCircle } from 'lucide-react'

import { adminAPI } from '../../api/client'
import { PromptFormData, Tag } from '../../types/prompts'

const CreatePrompt = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const [formData, setFormData] = useState<PromptFormData>({
    name: '',
    buildSpecification: '',
    tags: [],
  })
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isCloning, setIsCloning] = useState(false)
  const [availableTags, setAvailableTags] = useState<Tag[]>([])
  const [tagInput, setTagInput] = useState('')
  const [filteredTags, setFilteredTags] = useState<Tag[]>([])
  const [selectedTagIndex, setSelectedTagIndex] = useState(-1)

  useEffect(() => {
    const cloneId = new URLSearchParams(location.search).get('clone')
    if (cloneId) {
      fetchPromptToClone(cloneId)
    }
  }, [location])

  useEffect(() => {
    fetchTags()
  }, [])

  useEffect(() => {
    if (tagInput) {
      const filtered = Array.isArray(availableTags)
        ? availableTags.filter(
            (tag) =>
              tag.name.toLowerCase().includes(tagInput.toLowerCase()) &&
              !formData.tags.includes(tag.name)
          )
        : []
      setFilteredTags(filtered)
    } else {
      setFilteredTags([])
    }
  }, [tagInput, availableTags, formData.tags])

  useEffect(() => {
    setSelectedTagIndex(-1)
  }, [filteredTags])

  const fetchPromptToClone = async (id: string) => {
    try {
      setIsCloning(true)
      const { data } = await adminAPI.get(`/prompt/${id}`)
      setFormData({
        name: `${data.name} (Copy)`,
        buildSpecification: data.buildSpecification,
        tags: data.tags,
      })
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to fetch prompt to clone'
      )
    } finally {
      setIsCloning(false)
    }
  }

  const fetchTags = async () => {
    try {
      const response = await adminAPI.get('/tag')
      setAvailableTags(response.data.data || [])
    } catch (err) {
      console.error('Failed to fetch tags:', err)
      setAvailableTags([])
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

  const handleTagInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTagInput(e.target.value)
  }

  const addTag = (tagName: string) => {
    if (tagName && !formData.tags.includes(tagName)) {
      setFormData((prev) => ({
        ...prev,
        tags: [...prev.tags, tagName],
      }))
      setTagInput('')
    }
  }

  const removeTag = (tagName: string) => {
    setFormData((prev) => ({
      ...prev,
      tags: prev.tags.filter((t) => t !== tagName),
    }))
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (filteredTags.length === 0) {
      if (e.key === 'Enter' && tagInput) {
        e.preventDefault()
        addTag(tagInput)
      }
      return
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setSelectedTagIndex((prev) =>
          prev < filteredTags.length - 1 ? prev + 1 : prev
        )
        break
      case 'ArrowUp':
        e.preventDefault()
        setSelectedTagIndex((prev) => (prev > -1 ? prev - 1 : prev))
        break
      case 'Enter':
        e.preventDefault()
        if (selectedTagIndex >= 0) {
          addTag(filteredTags[selectedTagIndex].name)
          setTagInput('')
        } else if (tagInput) {
          addTag(tagInput)
        }
        break
      case 'Escape':
        setFilteredTags([])
        setSelectedTagIndex(-1)
        break
    }
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
              htmlFor="tags"
              className="block text-sm font-medium text-gray-700"
            >
              Tags
            </label>
            <div className="space-y-2">
              <div className="flex flex-wrap gap-2 mb-2">
                {formData.tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-medium bg-blue-100 text-blue-800"
                  >
                    {tag}
                    <button
                      type="button"
                      onClick={() => removeTag(tag)}
                      className="ml-1 inline-flex items-center p-0.5 hover:bg-blue-200 rounded-full"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
              <div className="relative">
                <input
                  type="text"
                  value={tagInput}
                  onChange={handleTagInput}
                  onKeyDown={handleKeyDown}
                  className="w-full rounded-md border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Add tags..."
                />
                {filteredTags.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-48 overflow-y-auto">
                    {filteredTags.map((tag, index) => (
                      <button
                        key={tag.name}
                        type="button"
                        onClick={() => {
                          addTag(tag.name)
                          setTagInput('')
                        }}
                        className={`block w-full px-4 py-2 text-left text-sm ${
                          index === selectedTagIndex
                            ? 'bg-blue-50 text-blue-700'
                            : 'hover:bg-gray-100'
                        }`}
                      >
                        {tag.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
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
