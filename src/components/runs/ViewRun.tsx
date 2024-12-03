import { useState, useEffect, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import {
  Clock,
  User,
  AlertCircle,
  CheckCircle,
  Loader2,
  Download,
  ExternalLink,
} from 'lucide-react'
import { Canvas } from '@react-three/fiber'
import { Environment, OrbitControls, useGLTF } from '@react-three/drei'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism'
import { adminAPI } from '../../api/client'
import Background from '../background.tsx'
import { RunResources } from '../ui/RunResources'
import settings from '../../config/settings.ts'

const isInProgress = (status: string) => {
  return !status.includes('FAILED') && status !== 'COMPLETED'
}

const POLLING_INTERVAL = 5000 // 5 seconds

interface Sample {
  id: string
  created: string
  resultInspirationText: string | null
  resultDescriptionText: string | null
  resultCodeText: string | null
  raw: string | null
  lastModified: string | null
  lastModifiedBy: string | null
}

interface Provider {
  id: string
  name: string
  providerClass: string
  config: Record<string, any>
  isDefault: boolean
}

interface Model {
  id: string
  created: string
  createdBy: string
  lastModified: string | null
  lastModifiedBy: string | null
  slug: string
  providers: Provider[]
  active: boolean
  usage: number
}

interface Prompt {
  id: string
  created: string
  createdBy: string
  name: string
  lastModified: string | null
  lastModifiedBy: string | null
  buildSpecification: string
  active: boolean
  usage: number
}

interface Template {
  id: string
  created: string
  createdBy: string
  lastModified: string | null
  lastModifiedBy: string | null
  name: string
  description: string
  content: string
  active: boolean
  frozen: boolean
  usage: number
}

interface Artifact {
  id: string
  created: string
  kind: string
  bucket: string
  key: string
}

interface RunData {
  id: string
  created: string
  createdBy: string
  lastModified: string | null
  lastModifiedBy: string | null
  generationId: string | null
  prompt: Prompt
  model: Model
  template: Template
  status: string
  samples: Sample[]
  artifacts: Artifact[]
}

const getStatusStyles = (status: string) => {
  switch (status) {
    case 'COMPLETED':
      return 'bg-green-100 text-green-700'
    case 'PROMPT_FAILED':
    case 'PROMPT_PROCESSING_FAILED':
    case 'BUILD_FAILED':
    case 'POST_PROCESSING_FAILED':
    case 'SAMPLE_PREP_FAILED':
      return 'bg-red-100 text-red-700'
    case 'CREATED':
    case 'PROMPT_ENQUEUED':
    case 'PROMPT_COMPLETED':
    case 'PROMPT_PROCESSING_ENQUEUED':
    case 'PROMPT_PROCESSING_COMPLETED':
    case 'BUILD_ENQUEUED':
    case 'BUILD_COMPLETED':
    case 'POST_PROCESSING_ENQUEUED':
    case 'POST_PROCESSING_COMPLETED':
    case 'SAMPLE_PREP_ENQUEUED':
      return 'bg-blue-100 text-blue-700'
    default:
      return 'bg-gray-100 text-gray-700'
  }
}

const getStatusIcon = (status: string) => {
  if (status === 'COMPLETED') {
    return <CheckCircle className="h-4 w-4" />
  }
  if (status.includes('FAILED')) {
    return <AlertCircle className="h-4 w-4" />
  } else {
    return <Loader2 className="h-4 w-4 animate-spin" />
  }
  return null
}

const getArtifactUrl = (artifact: Artifact) => {
  return `${settings.object_cdn_root_url}/${artifact.bucket}/${artifact.key}`
}

const Model = ({ path }: { path: string }) => {
  const gltf = useGLTF(path)
  return <primitive object={gltf.scene} />
}

const ViewRun = () => {
  const { id } = useParams()
  const [run, setRun] = useState<RunData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedSample, setSelectedSample] = useState<number>(0)
  const [selectedGltf, setSelectedGltf] = useState<string | null>(null)
  const [expandedResources, setExpandedResources] = useState(false)
  const [showRaw, setShowRaw] = useState(false)

  const fetchRun = useCallback(async () => {
    try {
      const { data } = await adminAPI.get(`/run/${id}`)
      setRun(data)

      // Update GLTF selection if needed
      if (data.artifacts?.length > 0 && !selectedGltf) {
        const firstGltf = data.artifacts.find((a: any) =>
          a.key.endsWith('.gltf')
        )
        if (firstGltf) {
          setSelectedGltf(getArtifactUrl(firstGltf))
        }
      }

      return data
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch run')
      return null
    }
  }, [id, selectedGltf])

  useEffect(() => {
    let pollInterval: number | null = null

    const startPolling = async () => {
      setLoading(true)
      const initialData = await fetchRun()
      setLoading(false)

      if (initialData && isInProgress(initialData.status)) {
        pollInterval = window.setInterval(async () => {
          const updatedData = await fetchRun()
          if (updatedData && !isInProgress(updatedData.status)) {
            if (pollInterval) {
              window.clearInterval(pollInterval)
            }
          }
        }, POLLING_INTERVAL)
      }
    }

    startPolling()

    return () => {
      if (pollInterval) {
        window.clearInterval(pollInterval)
      }
    }
  }, [fetchRun])

  // Reset selected sample if it becomes invalid
  useEffect(() => {
    if (run && selectedSample >= run.samples.length) {
      setSelectedSample(0)
    }
  }, [run, selectedSample])

  if (loading)
    return <div className="flex justify-center p-8">Loading run...</div>
  if (error) return <div className="text-red-500 p-4">{error}</div>
  if (!run) return <div className="text-gray-500 p-4">Run not found</div>

  if (loading)
    return <div className="flex justify-center p-8">Loading run...</div>
  if (error) return <div className="text-red-500 p-4">{error}</div>
  if (!run) return <div className="text-gray-500 p-4">Run not found</div>

  const gltfArtifacts =
    run.artifacts?.filter((a: any) => a.key.endsWith('.gltf')) || []

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* Header with metadata */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <h1 className="text-2xl font-bold">Run Details</h1>
              <span
                className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm ${getStatusStyles(run.status)}`}
              >
                {getStatusIcon(run.status)}
                {run.status}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="space-y-1">
              <div className="text-sm text-gray-500">Created</div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-gray-400" />
                <span>{new Date(run.created).toLocaleString()}</span>
              </div>
            </div>
            <div className="space-y-1">
              <div className="text-sm text-gray-500">Created by</div>
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-gray-400" />
                <span>{run.createdBy}</span>
              </div>
            </div>
            {run.generationId && (
              <div className="space-y-1">
                <div className="text-sm text-gray-500">Generation</div>
                <div className="flex items-center gap-2">
                  <Link
                    to={`/generations/${run.generationId}`}
                    className="text-blue-600 hover:text-blue-800 flex items-center gap-1"
                  >
                    <ExternalLink className="h-4 w-4" />
                    <span>View Generation</span>
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Resources Section */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
        <div className="p-6">
          <RunResources
            model={run.model}
            template={run.template}
            prompt={run.prompt}
            isExpanded={expandedResources}
            onToggle={() => setExpandedResources(!expandedResources)}
          />
        </div>
      </div>

      {/* Samples section */}
      {run.samples.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Samples</h2>
              <div className="flex items-center gap-4">
                {run.samples.length > 0 && (
                  <select
                    value={selectedSample}
                    onChange={(e) => setSelectedSample(Number(e.target.value))}
                    className="border rounded-md px-3 py-1"
                  >
                    {run.samples.map((_, index) => (
                      <option key={index} value={index}>
                        Sample {index + 1}
                      </option>
                    ))}
                  </select>
                )}
                <div className="flex items-center gap-2">
                  <label className="text-sm text-gray-600">Show Raw</label>
                  <button
                    onClick={() => setShowRaw(!showRaw)}
                    className={`
                relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent 
                transition-colors duration-200 ease-in-out 
                ${showRaw ? 'bg-blue-600' : 'bg-gray-200'}
              `}
                  >
                    <span
                      className={`
                  pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow 
                  ring-0 transition duration-200 ease-in-out
                  ${showRaw ? 'translate-x-5' : 'translate-x-0'}
                `}
                    />
                  </button>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              {showRaw ? (
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Raw Response
                  </label>
                  <div className="bg-gray-50 rounded-md p-4 border">
                    <pre className="text-left whitespace-pre-wrap text-sm">
                      {run.samples[selectedSample].raw}
                    </pre>
                  </div>
                </div>
              ) : (
                <>
                  {/* Inspiration */}
                  {run.samples[selectedSample].resultInspirationText && (
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700">
                        Inspiration
                      </label>
                      <div className="bg-gray-50 rounded-md p-4 border text-left whitespace-pre-wrap">
                        {run.samples[selectedSample].resultInspirationText}
                      </div>
                    </div>
                  )}

                  {/* Description */}
                  {run.samples[selectedSample].resultDescriptionText && (
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700">
                        Description
                      </label>
                      <div className="bg-gray-50 rounded-md p-4 border text-left whitespace-pre-wrap">
                        {run.samples[selectedSample].resultDescriptionText}
                      </div>
                    </div>
                  )}

                  {/* Code */}
                  {run.samples[selectedSample].resultCodeText && (
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700">
                        Code
                      </label>
                      <div className="rounded-md border overflow-hidden">
                        <SyntaxHighlighter
                          language="javascript"
                          style={oneLight}
                          customStyle={{
                            margin: 0,
                            borderRadius: 0,
                            fontSize: '0.875rem',
                            lineHeight: '1.5',
                          }}
                          showLineNumbers={true}
                          wrapLines={true}
                        >
                          {run.samples[selectedSample].resultCodeText}
                        </SyntaxHighlighter>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Artifacts section */}
      {run.artifacts.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
          <div className="p-6">
            <h2 className="text-xl font-semibold mb-4">Artifacts</h2>

            {/* Artifact list */}
            <div className="mb-6">
              <div className="bg-gray-50 rounded-md border divide-y">
                {run.artifacts.map((artifact, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-4"
                  >
                    <div className="flex flex-col gap-1">
                      <span className="text-gray-600 text-sm text-left">
                        {artifact.kind}
                      </span>
                      <a
                        href={getArtifactUrl(artifact)}
                        download
                        className="text-blue-600 hover:text-blue-800 flex items-center gap-2"
                      >
                        <Download className="h-4 w-4" />
                        {artifact.key.split('/').pop()}
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* GLTF Viewer */}
            {gltfArtifacts.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium">3D Model Viewer</h3>
                  {gltfArtifacts.length > 1 && (
                    <select
                      value={selectedGltf || ''}
                      onChange={(e) => setSelectedGltf(e.target.value)}
                      className="border rounded-md px-3 py-1"
                    >
                      {gltfArtifacts.map((artifact, index) => (
                        <option
                          key={index}
                          value={artifact.key.split('/').pop()}
                        >
                          {artifact.key.split('/').pop()}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
                {selectedGltf && (
                  <div className="h-[400px] bg-gray-50 rounded-lg overflow-hidden">
                    <Canvas
                      camera={{
                        position: [30, 5, 30],
                        fov: 60,
                      }}
                    >
                      <Background />
                      <Model path={selectedGltf} />
                      <OrbitControls
                        enableZoom={true}
                        minDistance={1}
                        maxDistance={100}
                        target={[0, 0, 0]}
                      />
                      <Environment preset="sunset" />
                    </Canvas>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default ViewRun
