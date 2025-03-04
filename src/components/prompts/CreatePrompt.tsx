import React, { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

import { AlertCircle, Plus, X } from 'lucide-react'

import { adminAPI } from '../../api/client'
import { PromptFormData, Tag } from '../../types/prompts'
import HelpButton from './HelpButton'

const CreatePrompt = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const [formData, setFormData] = useState<PromptFormData>({
    name: '',
    buildSpecification: '',
    tags: [],
    buildSize: null, // Default to null (not specified)
  })
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isCloning, setIsCloning] = useState(false)
  const [availableTags, setAvailableTags] = useState<Tag[]>([])
  const [tagInput, setTagInput] = useState('')
  const [filteredTags, setFilteredTags] = useState<Tag[]>([])
  const [selectedTagIndex, setSelectedTagIndex] = useState(-1)
  const [showBuildSizeField, setShowBuildSizeField] = useState(false)

  // Build size options
  const buildSizeOptions = [
    { label: 'Tiny', value: 'a 5x5x5 bounding box' },
    { label: 'Small', value: 'a 10x10x10 bounding box' },
    { label: 'Medium', value: 'a 20x20x20 bounding box' },
    { label: 'Large', value: 'a 40x40x40 bounding box' },
    { label: 'Extra Large', value: 'a 60x60x60 bounding box' },
    { label: 'Massive', value: 'a 80x80x80 bounding box' },
  ]

  // Medium is index 2
  const mediumSizeIndex = 2

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

      // Check if the cloned prompt has a buildSize
      const buildSize = data.buildSize || null
      if (buildSize) {
        setShowBuildSizeField(true)
      }

      // Get non-build-size tags from the original prompt
      const nonSizeTags = data.tags
        .filter(
          (tag: Tag) => !buildSizeOptions.some((opt) => opt.value === tag.name)
        )
        .map((tag: Tag) => tag.name)

      // If there's a build size, add it as a tag
      const tags = buildSize ? [...nonSizeTags, buildSize] : nonSizeTags

      setFormData({
        name: `${data.name} (Copy)`,
        buildSpecification: data.buildSpecification,
        tags,
        buildSize,
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

  const handleBuildSizeChange = (newSize: string) => {
    // Remove any previous build size tags
    const nonSizeTags = formData.tags.filter(
      (tag) => !buildSizeOptions.some((opt) => opt.value === tag)
    )

    setFormData((prev) => ({
      ...prev,
      buildSize: newSize,
      tags: [...nonSizeTags, newSize],
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
      // Prepare submission data, removing buildSize if it's null
      const submissionData = {
        ...formData,
        ...(formData.buildSize === null && { buildSize: undefined }),
        active: true,
      }

      await adminAPI.post('/prompt', submissionData)
      navigate('/prompts')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create prompt')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isCloning)
    return (
      <div className="flex justify-center p-8 text-gray-700 dark:text-gray-300">
        Loading prompt to clone...
      </div>
    )

  return (
    <div className="max-w-3xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Create New Prompt
          </h1>
          <HelpButton section="create" />
        </div>
        <button
          onClick={() => navigate('/prompts')}
          className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-white"
        >
          Cancel
        </button>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 px-4 py-3 rounded-md flex items-center gap-2">
          <AlertCircle className="h-4 w-4" />
          <p>{error}</p>
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="space-y-2">
            <label
              htmlFor="name"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300"
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
              className="w-full rounded-md border border-gray-300 dark:border-gray-600 px-4 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter prompt name"
            />
          </div>

          <div className="space-y-2">
            {!showBuildSizeField ? (
              <button
                type="button"
                onClick={() => {
                  setShowBuildSizeField(true)
                  // Set to Medium by default
                  handleBuildSizeChange(buildSizeOptions[mediumSizeIndex].value)
                }}
                className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 flex items-center gap-1"
              >
                <Plus size={16} />
                Specify a size
              </button>
            ) : (
              <>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Build Size
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setShowBuildSizeField(false)
                      setFormData((prev) => ({
                        ...prev,
                        buildSize: null, // Reset to null
                      }))
                    }}
                    className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-400"
                    aria-label="Stop specifying size"
                  >
                    <X size={16} />
                  </button>
                </div>

                <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-4 bg-gray-50 dark:bg-gray-900">
                  <div className="grid grid-cols-3 gap-2 mb-4">
                    {buildSizeOptions.map((option, index) => (
                      <button
                        key={index}
                        type="button"
                        onClick={() => {
                          handleBuildSizeChange(option.value)
                        }}
                        className={`py-2 px-3 text-sm rounded-md transition-colors ${
                          formData.buildSize === option.value
                            ? 'bg-blue-100 dark:bg-blue-900 border-blue-600 border text-blue-700 dark:text-blue-300 font-medium'
                            : 'bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700'
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>

                  {formData.buildSize && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      Build should occur in {formData.buildSize}
                    </p>
                  )}
                </div>
              </>
            )}
          </div>

          <div className="space-y-2">
            <label
              htmlFor="tags"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Tags
            </label>
            <div className="space-y-2">
              <div className="flex flex-wrap gap-2 mb-2">
                {formData.tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-medium bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200"
                  >
                    {tag}
                    <button
                      type="button"
                      onClick={() => removeTag(tag)}
                      className="ml-1 inline-flex items-center p-0.5 hover:bg-blue-200 dark:hover:bg-blue-800 rounded-full"
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
                  className="w-full rounded-md border border-gray-300 dark:border-gray-600 px-4 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Add tags..."
                />
                {filteredTags.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg max-h-48 overflow-y-auto">
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
                            ? 'bg-blue-50 dark:bg-blue-900 text-blue-700 dark:text-blue-200'
                            : 'hover:bg-gray-100 dark:hover:bg-gray-700'
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
              className="block text-sm font-medium text-gray-700 dark:text-gray-300"
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
              className="w-full rounded-md border border-gray-300 dark:border-gray-600 px-4 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
              placeholder="Enter build specification"
            />
          </div>

          <div className="flex justify-end gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={() => navigate('/prompts')}
              className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-white border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-blue-500 dark:bg-blue-600 text-white rounded-md hover:bg-blue-600 dark:hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
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
