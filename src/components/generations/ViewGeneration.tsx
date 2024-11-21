import React, { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import {
  Clock,
  User,
  ChevronRight,
  ChevronDown,
  Code,
  Terminal,
  Box,
  ExternalLink,
} from 'lucide-react'
import { adminAPI } from '../../api/client'
import { GenerationResponseWithRuns } from '../../types/generations'

const ViewGeneration = () => {
  const { id } = useParams()
  const [generation, setGeneration] =
    useState<GenerationResponseWithRuns | null>(null)
  const [expandedRuns, setExpandedRuns] = useState<Set<string>>(new Set())
  const [error, setError] = useState<string | null>(null)

  const fetchGeneration = async () => {
    try {
      const { data } = await adminAPI.get(`/generation/${id}`)
      setGeneration(data)
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to fetch generation'
      )
    }
  }

  useEffect(() => {
    fetchGeneration()
    const interval = setInterval(fetchGeneration, 5000)
    return () => clearInterval(interval)
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

  if (!generation) {
    return <div className="flex justify-center p-8">Loading...</div>
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="flex flex-col gap-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-6">
            <h1 className="text-2xl font-bold mb-2">{generation.name}</h1>
            {generation.description && (
              <p className="text-gray-600 mb-4">{generation.description}</p>
            )}
            <div className="grid grid-cols-4 gap-6 text-sm">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-gray-400" />
                <div>
                  <span className="text-gray-500 block">Created</span>
                  <span className="text-gray-900">
                    {new Date(generation.created).toLocaleString()}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-gray-400" />
                <div>
                  <span className="text-gray-500 block">Created By</span>
                  <span className="text-gray-900">{generation.createdBy}</span>
                </div>
              </div>
              <div>
                <span className="text-gray-500 block">Status</span>
                <span className="text-gray-900">{generation.status}</span>
              </div>
              <div>
                <span className="text-gray-500 block">Total Runs</span>
                <span className="text-gray-900">{generation.runCount}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="border-b p-4">
            <h2 className="text-lg font-semibold">Runs</h2>
          </div>
          <div className="divide-y">
            {generation.runs.map((run) => (
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
                      <span>{run.model.slug}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Terminal className="h-4 w-4 text-gray-400" />
                      <span className="truncate">{run.prompt.name}</span>
                    </div>
                    <div>
                      <span className="px-2 py-1 text-sm rounded-full bg-gray-100">
                        {run.status}
                      </span>
                    </div>
                  </div>
                </div>

                {expandedRuns.has(run.id) && (
                  <div className="mt-4 ml-7 grid gap-4">
                    <div className="border rounded-lg p-4">
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-medium">Model Details</h4>
                        <ExternalLinkButton
                          href={`/models/${run.model.id}`}
                          label="Model"
                        />
                      </div>
                      <div className="text-sm text-gray-600">
                        <p>Slug: {run.model.slug}</p>
                        <p>
                          Created:{' '}
                          {new Date(run.model.created).toLocaleString()}
                        </p>
                        <p>By: {run.model.created_by}</p>
                        <p>Usage: {run.model.usage}</p>
                      </div>
                    </div>

                    <div className="border rounded-lg p-4">
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-medium">Template Details</h4>
                        <ExternalLinkButton
                          href={`/templates/${run.template.id}`}
                          label="Template"
                        />
                      </div>
                      <div className="text-sm text-gray-600">
                        <p>Name: {run.template.name}</p>
                        <p>Description: {run.template.description}</p>
                        <p>Usage: {run.template.usage}</p>
                      </div>
                    </div>

                    <div className="border rounded-lg p-4">
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-medium">Prompt Details</h4>
                        <ExternalLinkButton
                          href={`/prompts/${run.prompt.id}`}
                          label="Prompt"
                        />
                      </div>
                      <div className="text-sm text-gray-600 space-y-2">
                        <p>Name: {run.prompt.name}</p>
                        <p>
                          Created:{' '}
                          {new Date(run.prompt.created).toLocaleString()}
                        </p>
                        <p>By: {run.prompt.created_by}</p>
                        {run.prompt.last_modified && (
                          <p>
                            Last Modified:{' '}
                            {new Date(
                              run.prompt.last_modified
                            ).toLocaleString()}
                          </p>
                        )}
                        {run.prompt.last_modified_by && (
                          <p>Modified By: {run.prompt.last_modified_by}</p>
                        )}
                        <p>Usage: {run.prompt.usage}</p>
                        <div>
                          <p className="font-medium mb-1">
                            Build Specification:
                          </p>
                          <pre className="p-2 bg-gray-50 rounded overflow-auto whitespace-pre-wrap">
                            {run.prompt.buildSpecification}
                          </pre>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default ViewGeneration
