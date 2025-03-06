import React, { useEffect, useState } from 'react'

import {
  Bar,
  BarChart,
  CartesianGrid,
  Label,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

import type { QuartileStats } from '../../types/leaderboard'

interface QuartileChartProps {
  quartiles: QuartileStats[]
}

// Helper function to get bucket label
const getBucketLabel = (bucket: number, totalBuckets: number): string => {
  if (totalBuckets === 4) {
    // Special case for quartiles
    switch (bucket) {
      case 1:
        return 'Q1 (Lowest 25%)'
      case 2:
        return 'Q2 (25%-50%)'
      case 3:
        return 'Q3 (50%-75%)'
      case 4:
        return 'Q4 (Top 25%)'
      default:
        return `Bucket ${bucket}`
    }
  }

  // For other bucket counts, show percentage ranges
  const bucketSize = 100 / totalBuckets
  const lowerBound = (bucket - 1) * bucketSize
  const upperBound = bucket * bucketSize
  return `${lowerBound.toFixed(0)}%-${upperBound.toFixed(0)}%`
}

// Custom tooltip component
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    // Find the data item
    const data = payload[0].payload

    return (
      <div className="bg-white dark:bg-gray-800 p-3 border border-gray-200 dark:border-gray-700 rounded shadow-lg">
        <p className="font-medium">{label}</p>
        <p className="text-sm text-blue-600 dark:text-blue-400">
          ELO: {Math.round(data.elo)}
        </p>
        <p className="text-sm text-green-600 dark:text-green-400">
          Win Rate: {(data.winRate * 100).toFixed(1)}%
        </p>
        <p className="text-sm">Samples: {data.samples}</p>
        <div className="text-xs mt-1 pt-1 border-t border-gray-200 dark:border-gray-700">
          <p>
            Wins: {data.wins} | Losses: {data.losses} | Ties: {data.ties}
          </p>
        </div>
      </div>
    )
  }

  return null
}

export const QuartileChart: React.FC<QuartileChartProps> = ({ quartiles }) => {
  // Ensure we have valid buckets
  const validBuckets = Array.isArray(quartiles) ? quartiles : []

  // Sort buckets by bucket number
  const sortedBuckets = [...validBuckets].sort(
    (a, b) => a.quartile - b.quartile
  )

  // State for chart data
  const [chartData, setChartData] = useState<any[]>([])
  const [isDarkMode, setIsDarkMode] = useState(false)

  // Check for dark mode
  useEffect(() => {
    // Check for dark mode preference
    const darkModeMediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const handleChange = (e: MediaQueryListEvent) => {
      setIsDarkMode(e.matches)
    }

    // Set initial value
    setIsDarkMode(darkModeMediaQuery.matches)

    // Listen for changes
    darkModeMediaQuery.addEventListener('change', handleChange)
    return () => darkModeMediaQuery.removeEventListener('change', handleChange)
  }, [])

  // Format data for recharts
  useEffect(() => {
    if (sortedBuckets.length === 0) return

    const formattedData = sortedBuckets.map((bucket) => ({
      name: getBucketLabel(bucket.quartile, sortedBuckets.length),
      elo: bucket.avg_elo || 0,
      winRate: bucket.win_rate || 0,
      samples: bucket.sample_count || 0,
      wins: bucket.total_wins || 0,
      losses: bucket.total_losses || 0,
      ties: bucket.total_ties || 0,
    }))

    setChartData(formattedData)
  }, [sortedBuckets])

  // Chart colors based on theme
  const colors = {
    elo: isDarkMode ? '#60a5fa' : '#2563eb', // blue-400 / blue-600
    winRate: isDarkMode ? '#34d399' : '#059669', // emerald-400 / emerald-600
    grid: isDarkMode ? '#374151' : '#e5e7eb', // gray-700 / gray-200
    text: isDarkMode ? '#d1d5db' : '#4b5563', // gray-300 / gray-600
    tooltip: isDarkMode ? '#1f2937' : '#ffffff', // gray-800 / white
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            margin={{ top: 10, right: 30, left: 10, bottom: 30 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke={colors.grid}
              vertical={false}
            />
            <XAxis
              dataKey="name"
              tick={{ fill: colors.text, fontSize: 12 }}
              axisLine={{ stroke: colors.grid }}
              tickLine={{ stroke: colors.grid }}
            />
            <YAxis
              yAxisId="left"
              tick={{ fill: colors.text, fontSize: 12 }}
              axisLine={{ stroke: colors.grid }}
              tickLine={{ stroke: colors.grid }}
            >
              <Label
                value="ELO Score"
                position="insideLeft"
                angle={-90}
                style={{
                  textAnchor: 'middle',
                  fill: colors.text,
                  fontSize: 12,
                }}
              />
            </YAxis>
            <YAxis
              yAxisId="right"
              orientation="right"
              domain={[0, 1]}
              tickFormatter={(value) => `${(value * 100).toFixed(0)}%`}
              tick={{ fill: colors.text, fontSize: 12 }}
              axisLine={{ stroke: colors.grid }}
              tickLine={{ stroke: colors.grid }}
            >
              <Label
                value="Win Rate"
                position="insideRight"
                angle={90}
                style={{
                  textAnchor: 'middle',
                  fill: colors.text,
                  fontSize: 12,
                }}
              />
            </YAxis>
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ paddingTop: 20 }} />
            <Bar
              yAxisId="left"
              dataKey="elo"
              name="ELO Score"
              fill={colors.elo}
              radius={[4, 4, 0, 0]}
              barSize={30}
            />
            <Bar
              yAxisId="right"
              dataKey="winRate"
              name="Win Rate"
              fill={colors.winRate}
              radius={[4, 4, 0, 0]}
              barSize={30}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Stats Grid */}
      <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {sortedBuckets.map((q) => (
          <div
            key={`stats-${q.quartile}`}
            className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg"
          >
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {getBucketLabel(q.quartile, sortedBuckets.length)}
            </h4>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                Total Votes:{' '}
                <span className="font-medium">{q.total_votes || 0}</span>
              </div>
              <div>
                Win Rate:{' '}
                <span className="font-medium">
                  {q.win_rate !== undefined
                    ? `${(q.win_rate * 100).toFixed(1)}%`
                    : 'N/A'}
                </span>
              </div>
              <div>
                Wins: <span className="font-medium">{q.total_wins || 0}</span>
              </div>
              <div>
                Losses:{' '}
                <span className="font-medium">{q.total_losses || 0}</span>
              </div>
              <div>
                Ties: <span className="font-medium">{q.total_ties || 0}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default QuartileChart
