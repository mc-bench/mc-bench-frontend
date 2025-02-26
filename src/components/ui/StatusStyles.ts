export const getStatusStyles = (status: string) => {
  const normalizedStatus = status.toLowerCase()
  switch (normalizedStatus) {
    case 'completed':
      return 'bg-green-100 text-green-700'
    case 'failed':
      return 'bg-red-100 text-red-700'
    case 'created':
    case 'running':
    case 'in_progress':
    case 'in_retry':
      return 'bg-blue-100 text-blue-700'
    default:
      return 'bg-gray-100 text-gray-700'
  }
}
