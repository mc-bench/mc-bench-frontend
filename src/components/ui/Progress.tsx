interface ProgressProps {
  value: number
  note: string | null
  className?: string
  animated?: boolean
}

export const Progress = ({
  value,
  note,
  className = '',
  animated = false,
}: ProgressProps) => {
  return (
    <div className="h-8 flex flex-col justify-center">
      <div
        className={`h-2 w-full bg-gray-200 rounded-full overflow-hidden ${className}`}
      >
        <div
          className={`h-full bg-blue-500 transition-all duration-300 ease-in-out
            ${animated ? 'relative overflow-hidden' : ''}`}
          style={{ width: `${Math.min(Math.max(value, 0), 100)}%` }}
        >
          {animated && (
            <div
              className="absolute inset-0 animate-shimmer bg-gradient-to-r from-transparent via-white/25 to-transparent"
              style={{
                backgroundSize: '200% 100%',
                animation: 'shimmer 2s infinite linear',
              }}
            />
          )}
        </div>
      </div>
      <div className="h-4 text-xs text-gray-500 mt-1 italic">
        {note || '\u00A0'}
      </div>
    </div>
  )
}
