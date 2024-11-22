import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  Clock,
  User,
  CheckCircle,
  XCircle,
  Edit,
  Settings,
  ChevronRight,
  ChevronDown,
  Box,
  Terminal,
  ExternalLink,
} from 'lucide-react'
import { adminAPI } from '../../api/client'
import { Model } from '../../types/models'

const ViewModel = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const [model, setModel] = useState<Model | null>(null)
  const [expandedRuns, setExpandedRuns] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchModel = async () => {
      try {
        setLoading(true)
        const { data } = await adminAPI.get(`/model/${id}`)
        setModel(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch model')
      } finally {
        setLoading(false)
      }
    }

    fetchModel()
  }, [id])

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
    return <div className="flex justify-center p-8">Loading model...</div>
  if (error) return <div className="text-red-500 p-4">{error}</div>
  if (!model) return <div className="text-gray-500 p-4">Model not found</div>

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/models')}
            className="text-gray-600 hover:text-gray-800"
          >
            <ArrowLeft size={24} />
          </button>
          <h1 className="text-2xl font-bold">{model.slug}</h1>
          <span
            className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-sm ${
              model.active
                ? 'bg-green-100 text-green-700'
                : 'bg-red-100 text-red-700'
            }`}
          >
            {model.active ? <CheckCircle size={14} /> : <XCircle size={14} />}
            {model.active ? 'Active' : 'Inactive'}
          </span>
        </div>
        <button
          onClick={() => navigate(`/models/${id}/edit`)}
          className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-800 border border-gray-300 rounded-md hover:bg-gray-50"
        >
          <Edit size={16} />
          Edit Model
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 divide-y divide-gray-200">
        <div className="p-6 grid grid-cols-2 md:grid-cols-4 gap-6 bg-gray-50">
          <div>
            <div className="text-gray-500 flex items-center gap-2 mb-2">
              <Clock size={16} className="text-gray-400" />
              Created
            </div>
            <div className="mt-1">
              <span className="text-gray-900">
                {new Date(model.created).toLocaleString()}
              </span>
            </div>
          </div>

          <div>
            <div className="text-gray-500 flex items-center gap-2 mb-2">
              <User size={16} className="text-gray-400" />
              Created By
            </div>
            <div className="mt-1">
              <span className="text-gray-900">
                {model.createdBy || 'Unknown'}
              </span>
            </div>
          </div>

          <div>
            <div className="text-gray-500 flex items-center gap-2 mb-2">
              <Settings size={16} className="text-gray-400" />
              Default Provider
            </div>
            <div className="mt-1">
              <span className="text-gray-900">
                {model.providers.find((p) => p.isDefault)?.name || 'None'}
              </span>
            </div>
          </div>

          <div>
            <div className="text-gray-500 flex items-center gap-2 mb-2">
              <Settings size={16} className="text-gray-400" />
              Usage Count
            </div>
            <div className="mt-1">
              <span className="text-gray-900">{model.usage || 0}</span>
            </div>
          </div>
        </div>

        <div className="p-6">
          <h2 className="text-lg font-semibold mb-4">Providers</h2>
          <div className="grid gap-4">
            {model.providers.map((provider, index) => (
              <div
                key={index}
                className={`p-4 rounded-lg border ${
                  provider.isDefault
                    ? 'border-blue-200 bg-blue-50'
                    : 'border-gray-200 bg-gray-50'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium">{provider.name}</h3>
                    {provider.isDefault && (
                      <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded-full">
                        Default
                      </span>
                    )}
                  </div>
                  <span className="text-sm text-gray-500">
                    Class: {provider.providerClass}
                  </span>
                </div>

                <div className="bg-white p-3 rounded border border-gray-200">
                  <pre className="text-sm overflow-x-auto whitespace-pre-wrap text-left">
                    {JSON.stringify(provider.config, null, 2)}
                  </pre>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="p-6">
          <h2 className="text-lg font-semibold mb-4">Run History</h2>
          <div className="border rounded-lg divide-y">
            {model.runs?.length === 0 ? (
              <div className="p-4 text-gray-500 text-sm">
                No runs found for this model
              </div>
            ) : (
              model.runs?.map((run) => (
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
                        <Terminal className="h-4 w-4 text-gray-400" />
                        <span>Prompt: {run.prompt.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Box className="h-4 w-4 text-gray-400" />
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
                            {run.prompt.id && (
                              <ExternalLinkButton
                                href={`/prompts/${run.prompt.id}`}
                                label="Prompt"
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

export default ViewModel
