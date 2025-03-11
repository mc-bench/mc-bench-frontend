import React from 'react'

import { Clock, Server } from 'lucide-react'

import SchedulerControls from './ui/SchedulerControls'

/**
 * Scheduler page that provides a standalone interface for managing the task scheduler
 */
const Scheduler: React.FC = () => {
  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center">
          <Clock className="h-6 w-6 mr-2 text-blue-500 dark:text-blue-400" />
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white">
            Scheduler Management
          </h1>
        </div>
        <a
          href="/admin/tasks"
          className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 flex items-center gap-1"
        >
          <Server className="h-4 w-4" />
          <span>Task Status</span>
        </a>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <SchedulerControls />
      </div>
    </div>
  )
}

export default Scheduler
