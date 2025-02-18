import { Link } from 'react-router-dom'

import {
  Box,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Terminal,
} from 'lucide-react'

import { useTheme } from '../../hooks/useTheme'

interface RunResource {
  id: string
  name?: string
  slug?: string
  created: string
  createdBy: string
  description?: string
  usage?: number
  buildSpecification?: string
  lastModified?: string | null
  lastModifiedBy?: string | null
}

interface RunResourcesProps {
  model: RunResource
  template: RunResource
  prompt: RunResource
  isExpanded: boolean
  onToggle: () => void
  showHeader?: boolean // New prop to control header visibility
}

export const RunResources = ({
  model,
  template,
  prompt,
  isExpanded,
  onToggle,
  showHeader = true, // Default to showing header for backward compatibility
}: RunResourcesProps) => {
  const { theme } = useTheme()

  const ExternalLinkButton = ({
    href,
    label,
  }: {
    href: string
    label: string
  }) => (
    <Link
      to={href}
      className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800"
    >
      <ExternalLink className="h-4 w-4" />
      <span>View {label}</span>
    </Link>
  )

  if (!showHeader && !isExpanded) {
    return null
  }

  return (
    <div className="dark:bg-gray-900">
      {showHeader && (
        <div className="flex items-center cursor-pointer dark:text-gray-200" onClick={onToggle}>
          {isExpanded ? (
            <ChevronDown className="h-5 w-5 text-gray-400 dark:text-gray-500" />
          ) : (
            <ChevronRight className="h-5 w-5 text-gray-400 dark:text-gray-500" />
          )}
          <div className="flex-1 grid grid-cols-3 gap-4 ml-2">
            <div className="flex items-center gap-2">
              <Box className="h-4 w-4 text-gray-400 dark:text-gray-500" />
              <span>{model.slug}</span>
            </div>
            <div className="flex items-center gap-2">
              <Terminal className="h-4 w-4 text-gray-400 dark:text-gray-500" />
              <span className="truncate">{prompt.name}</span>
            </div>
            <div className="flex items-center gap-2">
              <Terminal className="h-4 w-4 text-gray-400 dark:text-gray-500" />
              <span className="truncate">{template.name}</span>
            </div>
          </div>
        </div>
      )}

      {isExpanded && (
        <div className={showHeader ? 'mt-4 ml-7 grid gap-4' : 'grid gap-4'}>
          <div className="border rounded-lg p-4 dark:border-gray-700 dark:bg-gray-800">
            <div className="flex justify-between items-start mb-2">
              <h4 className="font-medium dark:text-gray-200">Model Details</h4>
              <ExternalLinkButton href={`/models/${model.id}`} label="Model" />
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              {showHeader ? (
                <p>Usage: {model.usage}</p>
              ) : (
                <>
                  <p>Slug: {model.slug}</p>
                  <p>Created: {new Date(model.created).toLocaleString()}</p>
                  <p>By: {model.createdBy}</p>
                  <p>Usage: {model.usage}</p>
                </>
              )}
            </div>
          </div>

          <div className="border rounded-lg p-4 dark:border-gray-700 dark:bg-gray-800">
            <div className="flex justify-between items-start mb-2">
              <h4 className="font-medium dark:text-gray-200">Template Details</h4>
              <ExternalLinkButton
                href={`/templates/${template.id}`}
                label="Template"
              />
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              {showHeader ? (
                <>
                  <p>Description: {template.description}</p>
                  <p>Usage: {template.usage}</p>
                </>
              ) : (
                <>
                  <p>Name: {template.name}</p>
                  <p>Description: {template.description}</p>
                  <p>Usage: {template.usage}</p>
                </>
              )}
            </div>
          </div>

          <div className="border rounded-lg p-4 dark:border-gray-700 dark:bg-gray-800">
            <div className="flex justify-between items-start mb-2">
              <h4 className="font-medium dark:text-gray-200">Prompt Details</h4>
              <ExternalLinkButton
                href={`/prompts/${prompt.id}`}
                label="Prompt"
              />
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400 space-y-2">
              {showHeader ? (
                <>
                  <p>Usage: {prompt.usage}</p>
                  <div>
                    <p className="font-medium mb-1">Build Specification:</p>
                    <pre className="p-2 bg-gray-50 rounded overflow-auto whitespace-pre-wrap">
                      {prompt.buildSpecification}
                    </pre>
                  </div>
                </>
              ) : (
                <>
                  <p>Name: {prompt.name}</p>
                  <p>Created: {new Date(prompt.created).toLocaleString()}</p>
                  <p>By: {prompt.createdBy}</p>
                  {prompt.lastModified && (
                    <p>
                      Last Modified:{' '}
                      {new Date(prompt.lastModified).toLocaleString()}
                    </p>
                  )}
                  {prompt.lastModifiedBy && (
                    <p>Modified By: {prompt.lastModifiedBy}</p>
                  )}
                  <p>Usage: {prompt.usage}</p>
                  <div>
                    <p className="font-medium mb-1">Build Specification:</p>
                    <pre className="p-2 bg-gray-50 rounded overflow-auto whitespace-pre-wrap">
                      {prompt.buildSpecification}
                    </pre>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
