export const getStatusStyles = (status: string) => {
  const normalizedStatus = status.toLowerCase()
  switch (normalizedStatus) {
    case 'completed':
      return 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
    case 'failed':
      return 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
    case 'created':
    case 'running':
    case 'in_progress':
    case 'in_retry':
      return 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
    default:
      return 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
  }
}

export const getExperimentalStateStyles = (state: string) => {
  const normalizedState = state.toUpperCase()
  switch (normalizedState) {
    case 'RELEASED':
      return 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
    case 'EXPERIMENTAL':
      return 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300'
    case 'DEPRECATED':
      return 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
    case 'REJECTED':
      return 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
    default:
      return 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
  }
}
