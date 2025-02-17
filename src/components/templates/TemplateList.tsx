import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'

import {
  Edit,
  ExternalLink,
  Eye,
  EyeOff,
  MoreVertical,
  Plus,
  Search,
  Trash2,
} from 'lucide-react'

import { adminAPI } from '../../api/client'
import { Template } from '../../types/templates'

const TemplateList = () => {
  const searchInputRef = useRef<HTMLInputElement>(null)
  const [templates, setTemplates] = useState<Template[]>([])
  const [showInactive, setShowInactive] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null)

  useEffect(() => {
    fetchTemplates()
    searchInputRef.current?.focus()
  }, [])

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === '/' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault()
        searchInputRef.current?.focus()
      }
    }

    document.addEventListener('keydown', handleKeyPress)
    return () => document.removeEventListener('keydown', handleKeyPress)
  }, [])

  const fetchTemplates = async () => {
    try {
      setLoading(true)
      const { data } = await adminAPI.get('/template')
      setTemplates(data.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch templates')
    } finally {
      setLoading(false)
    }
  }

  const toggleTemplateStatus = async (id: string, currentStatus: boolean) => {
    try {
      await adminAPI.patch(`/template/${id}`, {
        active: !currentStatus,
      })

      if (showInactive || !currentStatus) {
        setTemplates((prev) =>
          prev.map((template) =>
            template.id === id
              ? { ...template, active: !currentStatus }
              : template
          )
        )
      } else {
        setTemplates((prev) => prev.filter((template) => template.id !== id))
      }
      setActiveDropdown(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update template')
    }
  }

  const deleteTemplate = async (id: string) => {
    try {
      await adminAPI.delete(`/template/${id}`)
      setTemplates((prev) => prev.filter((template) => template.id !== id))
      setActiveDropdown(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete template')
    }
  }

  const filteredTemplates = templates
    .filter((template) => (showInactive ? true : template.active))
    .filter((template) => {
      if (!searchTerm) return true

      const searchLower = searchTerm.toLowerCase()
      return (
        template.name.toLowerCase().includes(searchLower) ||
        template.description.toLowerCase().includes(searchLower) ||
        template.createdBy.toLowerCase().includes(searchLower) ||
        template.content.toLowerCase().includes(searchLower)
      )
    })

  if (loading)
    return <div className="flex justify-center p-8">Loading templates...</div>
  if (error) return <div className="text-red-500 p-4">{error}</div>

  return (
    <div className="p-4 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Templates</h1>
        <div className="flex items-center gap-4">
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
            to="/templates/new"
            className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            <Plus size={16} />
            New Template
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
            placeholder="Search templates by name, description, or content... (Press '/' to focus)"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>

      <div className="grid gap-4">
        {filteredTemplates.map((template) => (
          <div
            key={template.id}
            className={`bg-white rounded-lg shadow-sm border border-gray-200 p-4 ${!template.active ? 'opacity-60' : ''}`}
          >
            <div className="flex items-center justify-between pb-2">
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-semibold">{template.name}</h2>
                <Link
                  to={`/templates/${template.id}`}
                  className="text-gray-500 hover:text-gray-700"
                  title="View template"
                >
                  <ExternalLink size={16} />
                </Link>
                {template.usage === 0 && (
                  <Link
                    to={`/templates/${template.id}/edit`}
                    className="text-gray-500 hover:text-gray-700"
                    title="Edit template"
                  >
                    <Edit size={16} />
                  </Link>
                )}
              </div>
              <div className="relative">
                <button
                  onClick={() =>
                    setActiveDropdown(
                      activeDropdown === template.id ? null : template.id
                    )
                  }
                  className="p-2 hover:bg-gray-100 rounded"
                >
                  <MoreVertical size={20} />
                </button>

                {activeDropdown === template.id && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg border border-gray-200 z-10">
                    {template.usage === 0 && (
                      <Link
                        to={`/templates/${template.id}/edit`}
                        className="w-full text-left px-4 py-2 hover:bg-gray-100 flex items-center gap-2"
                      >
                        <Edit size={16} /> Edit Template
                      </Link>
                    )}
                    <button
                      onClick={() =>
                        toggleTemplateStatus(template.id, template.active)
                      }
                      className="w-full text-left px-4 py-2 hover:bg-gray-100 flex items-center gap-2"
                    >
                      {template.active ? (
                        <>
                          <EyeOff size={16} /> Mark Inactive
                        </>
                      ) : (
                        <>
                          <Eye size={16} /> Mark Active
                        </>
                      )}
                    </button>
                    {template.usage === 0 && (
                      <button
                        onClick={() => deleteTemplate(template.id)}
                        className="w-full text-left px-4 py-2 hover:bg-gray-100 text-red-600 flex items-center gap-2"
                      >
                        <Trash2 size={16} /> Delete
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-4 text-sm text-gray-500">
              <span>
                Created: {new Date(template.created).toLocaleDateString()}
              </span>
              <span>By: {template.createdBy}</span>
              {template.lastModified && (
                <span>
                  Updated:{' '}
                  {new Date(template.lastModified).toLocaleDateString()}
                </span>
              )}
              <span className={template.usage > 0 ? 'font-medium' : ''}>
                Usage Count: {template.usage}
                {template.usage > 0 && (
                  <span className="ml-2 text-xs text-gray-600">
                    (cannot be edited or deleted)
                  </span>
                )}
              </span>
            </div>
            <div className="mt-2 text-sm">{template.description}</div>
          </div>
        ))}

        {filteredTemplates.length === 0 && (
          <div className="text-center p-8 text-gray-500">
            {templates.length === 0
              ? 'No templates found. Click "New Template" to create one.'
              : 'No templates match your search criteria.'}
          </div>
        )}
      </div>
    </div>
  )
}

export default TemplateList
