import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import {
  AlertCircle,
  ArrowLeft,
  Box,
  CheckCircle,
  ChevronDown,
  ChevronRight,
  Clock,
  Copy,
  ExternalLink,
  Plus,
  Terminal,
  User,
  X,
  XCircle,
} from 'lucide-react'

import { adminAPI } from '../../api/client'
import { Prompt, Tag } from '../../types/prompts'

const ViewPrompt = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const [prompt, setPrompt] = useState<Prompt | null>(null)
  const [expandedRuns, setExpandedRuns] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tagInput, setTagInput] = useState('')
  const [showTagConfirmation, setShowTagConfirmation] = useState(false)
  const [pendingTagAction, setPendingTagAction] = useState<{
    type: 'add' | 'remove'
    tagName: string
  } | null>(null)
  const [availableTags, setAvailableTags] = useState<Tag[]>([])
  const [filteredTags, setFilteredTags] = useState<Tag[]>([])
  const [selectedTagIndex, setSelectedTagIndex] = useState(-1)

  useEffect(() => {
    const fetchPrompt = async () => {
      try {
        setLoading(true)
        const { data } = await adminAPI.get(`/prompt/${id}`)
        setPrompt(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch prompt')
      } finally {
        setLoading(false)
      }
    }

    fetchPrompt()
  }, [id])

  useEffect(() => {
    fetchTags()
  }, [])

  useEffect(() => {
    if (tagInput) {
      const filtered = availableTags.filter(
        (tag) =>
          tag.name.toLowerCase().includes(tagInput.toLowerCase()) &&
          !prompt?.tags.some((existingTag) => existingTag.name === tag.name)
      )
      setFilteredTags(filtered)
    } else {
      setFilteredTags([])
    }
  }, [tagInput, availableTags, prompt?.tags])

  useEffect(() => {
    setSelectedTagIndex(-1)
  }, [filteredTags])

  const fetchTags = async () => {
    try {
      const response = await adminAPI.get('/tag')
      setAvailableTags(response.data.data || [])
    } catch (err) {
      console.error('Failed to fetch tags:', err)
      setAvailableTags([])
    }
  }

  const handleClone = () => {
    navigate(`/prompts/new?clone=${id}`)
  }

  const toggleRun = (runId: string) => {
    setExpandedRuns((prev) => {
      const next = new Set(prev)
      if (next.has(runId)) {
        next.delete(runId)
      } else {
        next.add(runId)
      }
      return next
    })
  }

  const handleTagAction = async (type: 'add' | 'remove', tagName: string) => {
    if (!prompt) return

    try {
      let response
      if (type === 'add') {
        response = await adminAPI.post<{ currentTags: Tag[] }>(
          `/prompt/${prompt.id}/tag`,
          {
            tag_name: tagName,
          }
        )
      } else {
        response = await adminAPI.delete<{ currentTags: Tag[] }>(
          `/prompt/${prompt.id}/tag`,
          {
            data: { tag_name: tagName },
          }
        )
      }

      if (prompt && response.data.currentTags) {
        setPrompt((prev) => {
          if (!prev) return prev
          return {
            ...prev,
            tags: response.data.currentTags,
          }
        })
      }

      // Clear states
      setTagInput('')
      setShowTagConfirmation(false)
      setPendingTagAction(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update tags')
    }
  }

  const initiateTagAction = (type: 'add' | 'remove', tagName: string) => {
    if (prompt?.usage && prompt.usage > 0) {
      setPendingTagAction({ type, tagName })
      setShowTagConfirmation(true)
    } else {
      handleTagAction(type, tagName)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (filteredTags.length === 0) {
      if (e.key === 'Enter' && tagInput) {
        e.preventDefault()
        initiateTagAction('add', tagInput)
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
          const selectedTag = filteredTags[selectedTagIndex]
          initiateTagAction('add', selectedTag.name)
          setTagInput('')
          setSelectedTagIndex(-1)
          setFilteredTags([])
        } else if (tagInput) {
          initiateTagAction('add', tagInput)
        }
        break
      case 'Escape':
        e.preventDefault()
        setFilteredTags([])
        setSelectedTagIndex(-1)
        setTagInput('')
        break
    }
  }

  const ExternalLinkButton = ({
    href,
    label,
  }: {
    href: string
    label: string
  }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800"
    >
      <ExternalLink className="h-4 w-4" />
      <span>View {label}</span>
    </a>
  )

  if (loading)
    return <div className="flex justify-center p-8">Loading prompt...</div>
  if (error) return <div className="text-red-500 p-4">{error}</div>
  if (!prompt) return <div className="text-gray-500 p-4">Prompt not found</div>

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/prompts')}
            className="text-gray-600 hover:text-gray-800"
          >
            <ArrowLeft size={24} />
          </button>
          <h1 className="text-2xl font-bold">{prompt.name}</h1>
          <span
            className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-sm ${
              prompt.active
                ? 'bg-green-100 text-green-700'
                : 'bg-red-100 text-red-700'
            }`}
          >
            {prompt.active ? <CheckCircle size={14} /> : <XCircle size={14} />}
            {prompt.active ? 'Active' : 'Inactive'}
          </span>
        </div>
        <button
          onClick={handleClone}
          className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-800 border border-gray-300 rounded-md hover:bg-gray-50"
        >
          <Copy size={16} />
          Clone Prompt
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 divide-y divide-gray-200">
        <div className="p-6 grid grid-cols-3 gap-6 text-sm bg-gray-50">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Clock size={16} className="text-gray-400 shrink-0" />
              <div>
                <span className="text-gray-500 block">Created</span>
                <span className="text-gray-900">
                  {new Date(prompt.created).toLocaleString()}
                </span>
              </div>
            </div>
            {prompt.lastModified && (
              <div className="flex items-center gap-2">
                <Clock size={16} className="text-gray-400 shrink-0" />
                <div>
                  <span className="text-gray-500 block">Last Updated</span>
                  <span className="text-gray-900">
                    {new Date(prompt.lastModified).toLocaleString()}
                  </span>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <User size={16} className="text-gray-400 shrink-0" />
              <div>
                <span className="text-gray-500 block">Created By</span>
                <span className="text-gray-900">
                  {prompt.createdBy || 'Unknown'}
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <span className="text-gray-500 block">Usage Count</span>
              <span className="text-gray-900 font-medium">{prompt.usage}</span>
            </div>
          </div>
        </div>

        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center text-sm">
              <span className="text-gray-500 mr-2">Tags:</span>
              <div className="flex flex-wrap gap-2">
                {prompt.tags &&
                  prompt.tags.map((tag) => (
                    <span
                      key={tag.name}
                      className="inline-flex items-center px-2.5 py-0.5 text-sm font-medium bg-gray-100 text-gray-800 rounded-full group"
                    >
                      {tag.name}
                      <button
                        onClick={() => initiateTagAction('remove', tag.name)}
                        className="ml-1 p-0.5 rounded-full text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Remove tag"
                      >
                        <X size={14} />
                      </button>
                    </span>
                  ))}
                {(!prompt.tags || prompt.tags.length === 0) && (
                  <span className="text-gray-400 text-sm">No tags</span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <input
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Add new tag..."
                  className="text-sm px-2 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {filteredTags.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-48 overflow-y-auto">
                    {filteredTags.map((tag, index) => (
                      <button
                        key={tag.id}
                        type="button"
                        onClick={() => {
                          initiateTagAction('add', tag.name)
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
              <button
                onClick={() => tagInput && initiateTagAction('add', tagInput)}
                className="p-1 text-gray-500 hover:text-gray-700"
                title="Add tag"
              >
                <Plus size={16} />
              </button>
            </div>
          </div>
        </div>

        {showTagConfirmation && pendingTagAction && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
              <div className="flex items-center gap-2 text-amber-600 mb-4">
                <AlertCircle className="h-5 w-5" />
                <h3 className="text-lg font-medium">Confirm Tag Update</h3>
              </div>
              <p className="text-gray-600 mb-4">
                This prompt has existing usage in runs.{' '}
                {pendingTagAction.type === 'add' ? 'Adding' : 'Removing'} the
                tag "{pendingTagAction.tagName}" may affect ELO scoring and
                other metrics. Are you sure you want to continue?
              </p>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => {
                    setShowTagConfirmation(false)
                    setPendingTagAction(null)
                    setTagInput('')
                  }}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={() =>
                    handleTagAction(
                      pendingTagAction.type,
                      pendingTagAction.tagName
                    )
                  }
                  className="px-4 py-2 bg-amber-500 text-white rounded-md hover:bg-amber-600"
                >
                  Confirm
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="p-6">
          <h2 className="text-sm font-medium text-gray-500 mb-2 float-left">
            Build Specification
          </h2>
          <div className="bg-gray-50 p-4 rounded-md border border-gray-200 clear-both">
            <pre className="font-mono text-sm whitespace-pre-wrap break-words text-left">
              {prompt.buildSpecification}
            </pre>
          </div>
        </div>

        <div className="p-6">
          <h2 className="text-lg font-semibold mb-4">Run History</h2>
          <div className="border rounded-lg divide-y">
            {prompt.runs?.length === 0 ? (
              <div className="p-4 text-gray-500 text-sm">
                No runs found for this prompt
              </div>
            ) : (
              prompt.runs?.map((run) => (
                <div key={run.id} className="p-4">
                  <div
                    className="flex items-center cursor-pointer"
                    onClick={() => toggleRun(run.id)}
                  >
                    {expandedRuns.has(run.id) ? (
                      <ChevronDown className="h-5 w-5 text-gray-400" />
                    ) : (
                      <ChevronRight className="h-5 w-5 text-gray-400" />
                    )}
                    <div className="flex-1 grid grid-cols-3 gap-4 ml-2">
                      <div className="flex items-center gap-2">
                        <Box className="h-4 w-4 text-gray-400" />
                        <span>Model: {run.model.slug}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Terminal className="h-4 w-4 text-gray-400" />
                        <span>Template: {run.template.name}</span>
                      </div>
                      <div>
                        <span
                          className={`px-2 py-1 text-sm rounded-full
                          ${
                            run.status === 'completed'
                              ? 'bg-green-100 text-green-700'
                              : run.status === 'failed'
                                ? 'bg-red-100 text-red-700'
                                : run.status === 'running'
                                  ? 'bg-blue-100 text-blue-700'
                                  : 'bg-gray-100 text-gray-700'
                          }`}
                        >
                          {run.status}
                        </span>
                      </div>
                    </div>
                  </div>

                  {expandedRuns.has(run.id) && (
                    <div className="mt-4 ml-7 grid gap-4">
                      <div className="border rounded-lg p-4">
                        <div className="text-sm text-gray-600 space-y-2">
                          <p>Run ID: {run.id}</p>
                          <p>
                            Created: {new Date(run.created).toLocaleString()}
                          </p>
                          <p>Created By: {run.createdBy}</p>
                          <div className="flex items-center gap-4 mt-2">
                            {run.model.id && (
                              <ExternalLinkButton
                                href={`/models/${run.model.id}`}
                                label="Model"
                              />
                            )}
                            {run.template.id && (
                              <ExternalLinkButton
                                href={`/templates/${run.template.id}`}
                                label="Template"
                              />
                            )}
                          </div>
                          {run.error && (
                            <div className="mt-2">
                              <p className="text-red-600 font-medium">Error:</p>
                              <pre className="mt-1 text-red-600 bg-red-50 p-2 rounded">
                                {run.error}
                              </pre>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default ViewPrompt
