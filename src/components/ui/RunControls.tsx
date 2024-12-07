import { useState } from "react";
import { adminAPI } from '../../api/client'
import { RefreshCw, ChevronDown, ChevronRight } from 'lucide-react';

const taskList = [
  'run.execute_prompt',
  'run.parse_prompt',
  'run.build_structure',
  'run.export_structure_views',
  'run.post_processing',
  'run.sample_prep'
];

const formatTaskName = (task: string) =>
  task.replace('run.', '').split('_').map(word =>
    word.charAt(0).toUpperCase() + word.slice(1)
  ).join(' ');

const RunControls = ({ runId }: { runId: string | undefined }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedTask, setSelectedTask] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleRetry = async () => {
    if (!selectedTask) return;

    setIsSubmitting(true);
    const taskIndex = taskList.indexOf(selectedTask);
    const tasksToRetry = taskList.slice(taskIndex);

    try {
      await adminAPI.post(`/run/${runId}/task-retry/`, {
        tasks: tasksToRetry
      });
    } catch (error) {
      console.error('Failed to retry tasks:', error);
    } finally {
      setIsSubmitting(false);
      setSelectedTask(null);
    }
  };

  return (
    <>
      <div className="mb-4 border rounded-lg p-4">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-2 w-full text-left font-medium"
        >
          {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          Controls
        </button>

        {isExpanded && (
          <div className="mt-4 space-y-2">
            {taskList.map((task) => (
                <div
                    key={task}
                    className="flex items-center justify-left">
                    <button
                        onClick={() => setSelectedTask(task)}
                        className="p-1 hover:bg-gray-100 rounded"
                    >
                        <RefreshCw
                            className="h-4 w-4"/>
                    </button>
                    <span>{formatTaskName(task)}</span>
                </div>
            ))}
          </div>
        )}
      </div>

        {selectedTask && (
            <div
                className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div
                    className="bg-white rounded-lg max-w-md w-full mx-4">
            <div className="border-b p-4 text-center">
              <h2 className="text-xl font-semibold">Confirm Task Retry</h2>
            </div>

            <div className="p-8 text-center">
              <p className="text-gray-600">
                This will retry {formatTaskName(selectedTask)} and all subsequent tasks.
              </p>
            </div>

            <div className="border-t p-4 flex justify-center gap-4">
              <button
                onClick={() => setSelectedTask(null)}
                disabled={isSubmitting}
                className="px-6 py-2 text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg hover:bg-gray-50 min-w-[120px]"
              >
                Cancel
              </button>
              <button
                onClick={handleRetry}
                disabled={isSubmitting}
                className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 min-w-[120px]"
              >
                {isSubmitting ? (
                  <>
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                        fill="none"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                      />
                    </svg>
                    Retrying...
                  </>
                ) : (
                  'Confirm'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default RunControls;