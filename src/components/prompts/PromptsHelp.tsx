import React from 'react'

import {
  AlertCircle,
  Box,
  CheckCircle,
  Clock,
  Copy,
  Eye,
  EyeOff,
  FileText,
  Search,
  Tag,
  TerminalSquare,
  XCircle,
} from 'lucide-react'

import { PromptsHelpProps } from '../../types/ui'

const PromptsHelp: React.FC<PromptsHelpProps> = ({ section = 'list' }) => {
  return (
    <div className="text-gray-900 dark:text-gray-100 max-w-none max-h-[70vh] overflow-y-auto">
      {section === 'list' && <ListHelp />}
      {section === 'view' && <ViewHelp />}
      {section === 'create' && <CreateHelp />}

      <div className="mt-6 border-t border-gray-200 dark:border-gray-700 pt-4">
        <h3 className="text-lg font-medium flex items-center gap-2 mb-3 text-gray-900 dark:text-white">
          <AlertCircle size={18} className="text-amber-500" />
          Experimental States Explained
        </h3>
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2 mb-1">
              <AlertCircle size={16} className="text-amber-500" />
              <span className="font-medium text-gray-900 dark:text-white">
                EXPERIMENTAL
              </span>
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              Prompts in testing phase. Not yet recommended for production use.
            </p>
          </div>

          <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle size={16} className="text-green-500" />
              <span className="font-medium text-gray-900 dark:text-white">
                RELEASED
              </span>
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              Fully tested and approved prompts that are stable and reliable.
            </p>
          </div>

          <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2 mb-1">
              <Clock size={16} className="text-gray-500 dark:text-gray-400" />
              <span className="font-medium text-gray-900 dark:text-white">
                DEPRECATED
              </span>
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              No longer recommended but maintained for backward compatibility.
            </p>
          </div>

          <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2 mb-1">
              <XCircle size={16} className="text-red-500" />
              <span className="font-medium text-gray-900 dark:text-white">
                REJECTED
              </span>
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              Reviewed and rejected prompts that should not be used.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

const ListHelp = () => (
  <>
    <h2 className="text-lg font-bold mb-2 text-gray-900 dark:text-white">
      Prompts List
    </h2>
    <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">
      Shows all available prompts that can be used in runs. Each prompt contains
      build instructions for Minecraft structures.
    </p>

    <div className="grid grid-cols-2 gap-x-4 gap-y-2">
      <div>
        <h3 className="text-sm font-medium mb-2 text-gray-900 dark:text-white">
          Features
        </h3>
        <ul className="space-y-2">
          <li className="flex gap-2">
            <Eye size={16} className="text-blue-500 flex-shrink-0 mt-0.5" />
            <span className="text-xs text-gray-700 dark:text-gray-300">
              <span className="font-medium text-gray-900 dark:text-white">
                View Details
              </span>
              : See full prompt specifications and history
            </span>
          </li>

          <li className="flex gap-2">
            <Copy size={16} className="text-blue-500 flex-shrink-0 mt-0.5" />
            <span className="text-xs text-gray-700 dark:text-gray-300">
              <span className="font-medium text-gray-900 dark:text-white">
                Clone
              </span>
              : Copy an existing prompt
            </span>
          </li>

          <li className="flex gap-2">
            <EyeOff size={16} className="text-blue-500 flex-shrink-0 mt-0.5" />
            <span className="text-xs text-gray-700 dark:text-gray-300">
              <span className="font-medium text-gray-900 dark:text-white">
                Active/Inactive
              </span>
              : Control prompt availability
            </span>
          </li>
        </ul>
      </div>

      <div>
        <h3 className="text-sm font-medium mb-2 text-gray-900 dark:text-white">
          Filtering Options
        </h3>
        <ul className="space-y-2">
          <li className="flex gap-2">
            <AlertCircle
              size={16}
              className="text-amber-500 flex-shrink-0 mt-0.5"
            />
            <span className="text-xs text-gray-700 dark:text-gray-300">
              <span className="font-medium text-gray-900 dark:text-white">
                State Filter
              </span>
              : Filter by experimental state
            </span>
          </li>

          <li className="flex gap-2">
            <EyeOff
              size={16}
              className="text-gray-500 dark:text-gray-400 flex-shrink-0 mt-0.5"
            />
            <span className="text-xs text-gray-700 dark:text-gray-300">
              <span className="font-medium text-gray-900 dark:text-white">
                Show Inactive
              </span>
              : Show/hide inactive prompts
            </span>
          </li>

          <li className="flex gap-2">
            <Search
              size={16}
              className="text-gray-500 dark:text-gray-400 flex-shrink-0 mt-0.5"
            />
            <span className="text-xs text-gray-700 dark:text-gray-300">
              <span className="font-medium text-gray-900 dark:text-white">
                Search
              </span>
              : Filter by name, creator, or content
            </span>
          </li>
        </ul>
      </div>
    </div>
  </>
)

const ViewHelp = () => (
  <>
    <h2 className="text-lg font-bold mb-2 text-gray-900 dark:text-white">
      Prompt Details
    </h2>
    <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">
      Displays detailed information about a specific prompt, including its
      metadata, specification, and history.
    </p>

    <div className="grid grid-cols-2 gap-x-4 gap-y-2">
      <div>
        <h3 className="text-sm font-medium mb-2 text-gray-900 dark:text-white">
          Key Features
        </h3>
        <ul className="space-y-2">
          <li className="flex gap-2">
            <Box size={16} className="text-blue-500 flex-shrink-0 mt-0.5" />
            <span className="text-xs text-gray-700 dark:text-gray-300">
              <span className="font-medium text-gray-900 dark:text-white">
                Build Spec
              </span>
              : Complete prompt instructions
            </span>
          </li>

          <li className="flex gap-2">
            <Tag size={16} className="text-blue-500 flex-shrink-0 mt-0.5" />
            <span className="text-xs text-gray-700 dark:text-gray-300">
              <span className="font-medium text-gray-900 dark:text-white">
                Tags
              </span>
              : Add/remove categorization tags
            </span>
          </li>

          <li className="flex gap-2">
            <Copy size={16} className="text-blue-500 flex-shrink-0 mt-0.5" />
            <span className="text-xs text-gray-700 dark:text-gray-300">
              <span className="font-medium text-gray-900 dark:text-white">
                Clone
              </span>
              : Create a copy of this prompt
            </span>
          </li>

          <li className="flex gap-2">
            <TerminalSquare
              size={16}
              className="text-blue-500 flex-shrink-0 mt-0.5"
            />
            <span className="text-xs text-gray-700 dark:text-gray-300">
              <span className="font-medium text-gray-900 dark:text-white">
                Run History
              </span>
              : View related runs
            </span>
          </li>
        </ul>
      </div>

      <div>
        <h3 className="text-sm font-medium mb-2 text-gray-900 dark:text-white">
          State Workflow
        </h3>
        <ul className="space-y-2">
          <li className="flex gap-2">
            <FileText
              size={16}
              className="text-blue-500 flex-shrink-0 mt-0.5"
            />
            <span className="text-xs text-gray-700 dark:text-gray-300">
              <span className="font-medium text-gray-900 dark:text-white">
                Propose Changes
              </span>
              : Request state updates
            </span>
          </li>

          <li className="flex gap-2">
            <CheckCircle
              size={16}
              className="text-green-500 flex-shrink-0 mt-0.5"
            />
            <span className="text-xs text-gray-700 dark:text-gray-300">
              <span className="font-medium text-gray-900 dark:text-white">
                Review Proposals
              </span>
              : Approve or reject
            </span>
          </li>

          <li className="flex gap-2">
            <TerminalSquare
              size={16}
              className="text-blue-500 flex-shrink-0 mt-0.5"
            />
            <span className="text-xs text-gray-700 dark:text-gray-300">
              <span className="font-medium text-gray-900 dark:text-white">
                Observations
              </span>
              : Add notes on performance
            </span>
          </li>

          <li className="flex gap-2">
            <Clock
              size={16}
              className="text-gray-500 dark:text-gray-400 flex-shrink-0 mt-0.5"
            />
            <span className="text-xs text-gray-700 dark:text-gray-300">
              <span className="font-medium text-gray-900 dark:text-white">
                Activity Log
              </span>
              : View change history
            </span>
          </li>
        </ul>
      </div>
    </div>
  </>
)

const CreateHelp = () => (
  <>
    <h2 className="text-lg font-bold mb-2 text-gray-900 dark:text-white">
      Creating a Prompt
    </h2>
    <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">
      Create new build instructions for generating Minecraft structures or clone
      existing ones.
    </p>

    <div className="grid grid-cols-2 gap-x-4 gap-y-2">
      <div>
        <h3 className="text-sm font-medium mb-2 text-gray-900 dark:text-white">
          Form Fields
        </h3>
        <ul className="space-y-2">
          <li className="flex gap-2">
            <FileText
              size={16}
              className="text-blue-500 flex-shrink-0 mt-0.5"
            />
            <span className="text-xs text-gray-700 dark:text-gray-300">
              <span className="font-medium text-gray-900 dark:text-white">
                Name
              </span>
              : Descriptive title for identification
            </span>
          </li>

          <li className="flex gap-2">
            <Box size={16} className="text-blue-500 flex-shrink-0 mt-0.5" />
            <span className="text-xs text-gray-700 dark:text-gray-300">
              <span className="font-medium text-gray-900 dark:text-white">
                Build Size
              </span>
              : Optional scale constraints
            </span>
          </li>

          <li className="flex gap-2">
            <Tag size={16} className="text-blue-500 flex-shrink-0 mt-0.5" />
            <span className="text-xs text-gray-700 dark:text-gray-300">
              <span className="font-medium text-gray-900 dark:text-white">
                Tags
              </span>
              : Categories for organization and filtering
            </span>
          </li>

          <li className="flex gap-2">
            <TerminalSquare
              size={16}
              className="text-blue-500 flex-shrink-0 mt-0.5"
            />
            <span className="text-xs text-gray-700 dark:text-gray-300">
              <span className="font-medium text-gray-900 dark:text-white">
                Build Spec
              </span>
              : Actual prompt instructions
            </span>
          </li>
        </ul>
      </div>

      <div>
        <h3 className="text-sm font-medium mb-2 text-gray-900 dark:text-white">
          Size Options
        </h3>
        <div className="grid grid-cols-2 gap-x-2 gap-y-1">
          <div className="text-xs text-gray-700 dark:text-gray-300">
            <span className="font-medium text-gray-900 dark:text-white">
              Tiny
            </span>
            : 5×5×5
          </div>
          <div className="text-xs text-gray-700 dark:text-gray-300">
            <span className="font-medium text-gray-900 dark:text-white">
              Small
            </span>
            : 10×10×10
          </div>
          <div className="text-xs text-gray-700 dark:text-gray-300">
            <span className="font-medium text-gray-900 dark:text-white">
              Medium
            </span>
            : 20×20×20
          </div>
          <div className="text-xs text-gray-700 dark:text-gray-300">
            <span className="font-medium text-gray-900 dark:text-white">
              Large
            </span>
            : 40×40×40
          </div>
          <div className="text-xs text-gray-700 dark:text-gray-300">
            <span className="font-medium text-gray-900 dark:text-white">
              XL
            </span>
            : 60×60×60
          </div>
          <div className="text-xs text-gray-700 dark:text-gray-300">
            <span className="font-medium text-gray-900 dark:text-white">
              Massive
            </span>
            : 80×80×80
          </div>
        </div>

        <h3 className="text-sm font-medium mt-3 mb-2 text-gray-900 dark:text-white">
          Writing Tips
        </h3>
        <ul className="space-y-1 text-xs text-gray-700 dark:text-gray-300 list-disc ml-5">
          <li>Be specific about structure type</li>
          <li>Specify style or theme</li>
          <li>Include material preferences</li>
          <li>Mention specific features</li>
          <li>Use clear, descriptive language</li>
        </ul>
      </div>
    </div>
  </>
)

export default PromptsHelp
