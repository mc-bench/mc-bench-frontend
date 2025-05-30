import React, { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowRight, Home, Loader2, Settings, Shuffle } from 'lucide-react'

import { getLeaderboard, getMetrics, getRandomModelSample, getTestSets } from '../../api/leaderboard'
import type { LeaderboardResponse, MetricOption, SampleResponse, TestSetOption } from '../../types/leaderboard'
import { Card } from '../ui/Card'
import ShareSample from '../samples/ShareSample'

const ModelRandomViewer: React.FC = () => {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  // Get params from URL
  const metricNameFromUrl = searchParams.get('metricName')
  const testSetNameFromUrl = searchParams.get('testSetName')
  const modelSlug = searchParams.get('modelSlug') || ''

  // State
  const [metrics, setMetrics] = useState<MetricOption[]>([])
  const [testSets, setTestSets] = useState<TestSetOption[]>([])
  const [metricName, setMetricName] = useState<string>(metricNameFromUrl || '')
  const [testSetName, setTestSetName] = useState<string>(testSetNameFromUrl || '')
  const [models, setModels] = useState<LeaderboardResponse | null>(null)
  const [selectedModel, setSelectedModel] = useState<string>(modelSlug)
  const [currentSample, setCurrentSample] = useState<SampleResponse | null>(null)
  const [viewedSampleIds, setViewedSampleIds] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingModels, setLoadingModels] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [loadingMetadata, setLoadingMetadata] = useState(true)

  // Load metrics and test sets on mount
  useEffect(() => {
    const loadMetadata = async () => {
      try {
        setLoadingMetadata(true)
        const [metricsData, testSetsData] = await Promise.all([
          getMetrics(),
          getTestSets()
        ])
        
        setMetrics(metricsData)
        setTestSets(testSetsData)
        
        // Set default metric and test set if not in URL
        if (!metricNameFromUrl && metricsData.length > 0) {
          setMetricName(metricsData[0].name)
        }
        if (!testSetNameFromUrl && testSetsData.length > 0) {
          setTestSetName(testSetsData[0].name)
        }
      } catch (err) {
        console.error('Error loading metadata:', err)
        setError('Failed to load metrics and test sets')
      } finally {
        setLoadingMetadata(false)
      }
    }
    
    loadMetadata()
  }, [])

  // Load available models
  useEffect(() => {
    const loadModels = async () => {
      if (!metricName || !testSetName) return
      
      try {
        setLoadingModels(true)
        const data = await getLeaderboard(metricName, testSetName, undefined, 100, 10)
        setModels(data)
        
        // If no model selected but we have models, select the first one
        if (!selectedModel && data.entries.length > 0) {
          const firstModel = data.entries[0].model.slug
          setSelectedModel(firstModel)
          setSearchParams(prev => {
            prev.set('modelSlug', firstModel)
            return prev
          })
        }
      } catch (err) {
        console.error('Error loading models:', err)
        setError('Failed to load models')
      } finally {
        setLoadingModels(false)
      }
    }

    loadModels()
  }, [metricName, testSetName])

  // Load a random sample when model changes
  useEffect(() => {
    if (selectedModel && metricName && testSetName) {
      loadRandomSample()
    }
  }, [selectedModel, metricName, testSetName])

  const loadRandomSample = async () => {
    if (!selectedModel) return

    try {
      setLoading(true)
      setError(null)
      
      // Get a random sample, excluding previously viewed ones to avoid repetition
      const sample = await getRandomModelSample(
        metricName,
        testSetName,
        selectedModel,
        undefined,
        undefined,
        viewedSampleIds.slice(-10) // Exclude last 10 viewed samples
      )
      
      setCurrentSample(sample)
      setViewedSampleIds(prev => [...prev, sample.id])
    } catch (err: any) {
      console.error('Error loading random sample:', err)
      if (err.response?.status === 404) {
        setError('No samples found for this model. Try selecting a different model.')
      } else {
        setError('Failed to load sample')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleModelChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newModel = e.target.value
    setSelectedModel(newModel)
    setViewedSampleIds([]) // Reset viewed samples when changing model
    setSearchParams(prev => {
      prev.set('modelSlug', newModel)
      return prev
    })
  }

  const handleNextSample = () => {
    loadRandomSample()
  }

  if (loadingMetadata || loadingModels) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="animate-spin w-8 h-8 text-blue-500" />
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-4">
          Random Model Viewer
        </h1>
        
        {/* Breadcrumb */}
        <nav className="flex mb-4 text-sm" aria-label="Breadcrumb">
          <ol className="inline-flex items-center space-x-1 md:space-x-2">
            <li className="inline-flex items-center">
              <Link
                to="/"
                className="inline-flex items-center text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400"
              >
                <Home className="w-4 h-4 mr-2" />
                Home
              </Link>
            </li>
            <li>
              <div className="flex items-center">
                <span className="mx-2 text-gray-400">/</span>
                <span className="text-gray-500 dark:text-gray-400">Random Viewer</span>
              </div>
            </li>
          </ol>
        </nav>
      </div>

      {/* Model Selection */}
      <Card className="mb-6">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
              Select Model
            </h2>
            <Settings className="w-5 h-5 text-gray-500" />
          </div>
          
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Metric
                </label>
                <select
                  value={metricName}
                  onChange={(e) => {
                    setMetricName(e.target.value)
                    setSearchParams(prev => {
                      prev.set('metricName', e.target.value)
                      return prev
                    })
                  }}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                >
                  {metrics.map(metric => (
                    <option key={metric.id} value={metric.name}>
                      {metric.name}
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Test Set
                </label>
                <select
                  value={testSetName}
                  onChange={(e) => {
                    setTestSetName(e.target.value)
                    setSearchParams(prev => {
                      prev.set('testSetName', e.target.value)
                      return prev
                    })
                  }}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                >
                  {testSets.map(testSet => (
                    <option key={testSet.id} value={testSet.name}>
                      {testSet.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Model
                </label>
                <select
                  value={selectedModel}
                  onChange={handleModelChange}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  disabled={!models || models.entries.length === 0}
                >
                  {!models || models.entries.length === 0 ? (
                    <option>No models available</option>
                  ) : (
                    models.entries.map(entry => (
                      <option key={entry.model.slug} value={entry.model.slug}>
                        {entry.model.name} (ELO: {Math.round(entry.eloScore)})
                      </option>
                    ))
                  )}
                </select>
              </div>
              
              <div className="text-sm text-gray-600 dark:text-gray-400">
                {viewedSampleIds.length > 0 && (
                  <p>Viewed: {viewedSampleIds.length} samples</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Sample Display or Loading/Error States */}
      {error ? (
        <Card>
          <div className="p-6 text-center">
            <p className="text-red-500 dark:text-red-400 mb-4">{error}</p>
            <button
              onClick={loadRandomSample}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Try Again
            </button>
          </div>
        </Card>
      ) : loading ? (
        <Card>
          <div className="p-6 flex items-center justify-center">
            <Loader2 className="animate-spin w-8 h-8 text-blue-500" />
            <span className="ml-2 text-gray-600 dark:text-gray-400">Loading sample...</span>
          </div>
        </Card>
      ) : currentSample ? (
        <>
          {/* Use ShareSample component to display the sample */}
          <ShareSample providedSample={currentSample} hideShare={true} />
          
          {/* Navigation */}
          <div className="flex justify-center mt-6">
            <button
              onClick={handleNextSample}
              className="flex items-center px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              <Shuffle className="mr-2 w-5 h-5" />
              Next Random Sample
              <ArrowRight className="ml-2 w-5 h-5" />
            </button>
          </div>
        </>
      ) : (
        <Card>
          <div className="p-6 text-center">
            <p className="text-gray-600 dark:text-gray-400">
              Select a model to start viewing random samples
            </p>
          </div>
        </Card>
      )}
    </div>
  )
}

export default ModelRandomViewer