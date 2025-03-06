import React, { useEffect, useState } from 'react'

import {
  Bar,
  BarChart,
  CartesianGrid,
  Label,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

import { useTheme } from '../../hooks/useTheme'
// We use the BucketChartProps type that references BucketStats
import { BucketChartProps } from '../../types/ui'

// No longer need to check for quartile stats

// Custom tooltip component
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload

    return (
      <div className="bg-white dark:bg-gray-800 p-3 border border-gray-200 dark:border-gray-700 rounded shadow-lg">
        <p className="font-medium text-gray-900 dark:text-white">
          ELO Range: {label}
        </p>
        <p className="text-sm text-blue-600 dark:text-blue-200">
          Sample Count: {data.sampleCount}
        </p>
        <p className="text-sm text-gray-700 dark:text-gray-100">
          {data.percentOfTotal}% of all samples
        </p>
        {data.winRate !== undefined && (
          <p className="text-sm text-green-600 dark:text-green-300">
            Win Rate: {(data.winRate * 100).toFixed(1)}%
          </p>
        )}
        {data.totalWins !== undefined &&
          data.totalLosses !== undefined &&
          data.totalTies !== undefined && (
            <p className="text-sm text-gray-700 dark:text-gray-100">
              W/L/T: {data.totalWins}/{data.totalLosses}/{data.totalTies}
            </p>
          )}
      </div>
    )
  }

  return null
}

export const BucketChart: React.FC<BucketChartProps> = ({ buckets }) => {
  // Get current theme from context
  const { theme } = useTheme()
  const isDarkMode = theme === 'dark'

  // Ensure we have valid buckets
  const validBuckets = Array.isArray(buckets) ? buckets : []

  // State for chart data
  const [distributionData, setDistributionData] = useState<any[]>([])
  const [isMobile, setIsMobile] = useState(false)

  // Check for mobile screen size
  useEffect(() => {
    // Check for mobile screen size
    const mobileMediaQuery = window.matchMedia('(max-width: 640px)')

    const handleMobileChange = (e: MediaQueryListEvent) => {
      setIsMobile(e.matches)
    }

    // Set initial mobile value
    setIsMobile(mobileMediaQuery.matches)

    // Listen for changes to mobile size
    mobileMediaQuery.addEventListener('change', handleMobileChange)

    // Cleanup
    return () => {
      mobileMediaQuery.removeEventListener('change', handleMobileChange)
    }
  }, [])

  // Format data for recharts - transform from buckets to ELO distribution
  useEffect(() => {
    if (validBuckets.length === 0) return

    // Define ELO ranges for the distribution
    const RANGE_SIZE = 50 // ELO points per bucket
    const MIN_ELO = 800
    const MAX_ELO = 1600

    // Calculate total samples for percentage calculations
    let sampleTotal = 0

    // Process bucket stats
    validBuckets.forEach((bucket) => {
      const sampleCount = bucket.sampleCount || 0
      sampleTotal += sampleCount
    })

    // Create distribution buckets
    const distribution: Record<string, number> = {}

    // Initialize all buckets with 0
    for (let elo = MIN_ELO; elo < MAX_ELO; elo += RANGE_SIZE) {
      const rangeLabel = `${elo}-${elo + RANGE_SIZE}`
      distribution[rangeLabel] = 0
    }

    // Fill in the distribution
    validBuckets.forEach((bucket) => {
      const sampleCount = bucket.sampleCount || 0
      const avgElo = bucket.avgElo || 0

      if (sampleCount > 0) {
        // Find the closest ELO range
        const rangeStart = Math.floor(avgElo / RANGE_SIZE) * RANGE_SIZE
        const rangeLabel = `${rangeStart}-${rangeStart + RANGE_SIZE}`

        // Add to the range if it exists in our predefined ranges
        if (distribution[rangeLabel] !== undefined) {
          distribution[rangeLabel] += sampleCount
        } else if (rangeStart < MIN_ELO) {
          distribution[`${MIN_ELO}-${MIN_ELO + RANGE_SIZE}`] += sampleCount
        } else if (rangeStart >= MAX_ELO - RANGE_SIZE) {
          distribution[`${MAX_ELO - RANGE_SIZE}-${MAX_ELO}`] += sampleCount
        }
      }
    })

    // Create a mapping of bucket ELO ranges to bucket data for tooltips
    const bucketEloMap = new Map()
    validBuckets.forEach((bucket) => {
      const rangeStart = Math.floor(bucket.avgElo / RANGE_SIZE) * RANGE_SIZE
      const rangeLabel = `${rangeStart}-${rangeStart + RANGE_SIZE}`
      bucketEloMap.set(rangeLabel, bucket)
    })

    // Convert to chart data array with bucket stats
    const chartData = Object.entries(distribution).map(([range, count]) => {
      const bucket = bucketEloMap.get(range)

      return {
        eloRange: range,
        sampleCount: count,
        percentOfTotal: ((count / sampleTotal) * 100).toFixed(1),
        winRate: bucket?.winRate || 0,
        totalWins: bucket?.totalWins || 0,
        totalLosses: bucket?.totalLosses || 0,
        totalTies: bucket?.totalTies || 0,
        totalVotes: bucket?.totalVotes || 0,
      }
    })

    setDistributionData(chartData)
  }, [validBuckets])

  // Chart colors based on theme
  const colors = {
    bar: isDarkMode ? '#60a5fa' : '#2563eb', // blue-400 / blue-600
    grid: isDarkMode ? '#374151' : '#e5e7eb', // gray-700 / gray-200
    text: isDarkMode ? '#ffffff' : '#374151', // white in dark mode, gray-700 in light
    axisLabel: isDarkMode ? '#ffffff' : '#374151', // white in dark mode, gray-700 in light
    avgLine: isDarkMode ? '#f87171' : '#dc2626', // red-400 / red-600
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-1 sm:p-4">
      {/* Stats summary */}
      {/* Removed summary cards per request - just showing the graph */}

      <div className={`${isMobile ? 'h-64' : 'h-80'} w-full`}>
        <ResponsiveContainer width="99%" height="100%">
          <BarChart
            data={distributionData}
            margin={
              isMobile
                ? { top: 0, right: 10, left: 15, bottom: 35 }
                : { top: 10, right: 30, left: 20, bottom: 50 }
            }
            barSize={isMobile ? 12 : 20}
            maxBarSize={25}
          >
            <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} />
            <XAxis
              dataKey="eloRange"
              tick={{
                fill: colors.axisLabel,
                fontSize: isMobile ? 8 : 11,
                width: isMobile ? 25 : undefined,
              }}
              axisLine={{ stroke: colors.grid }}
              tickLine={{ stroke: colors.grid }}
              height={isMobile ? 50 : 50}
              angle={-45}
              textAnchor="end"
              interval={isMobile ? 2 : 0} // Skip more labels on mobile
              label={{
                value: isMobile ? 'ELO Range' : 'ELO Score Range',
                position: 'insideBottom',
                offset: isMobile ? -10 : -15,
                fill: colors.axisLabel,
                fontSize: isMobile ? 10 : 12,
                style: {
                  textAnchor: 'middle',
                  fontWeight: '600', // Make it semibold for better visibility
                },
              }}
            />
            <YAxis
              tick={{ fill: colors.axisLabel, fontSize: isMobile ? 10 : 12 }}
              axisLine={{ stroke: colors.grid }}
              tickLine={{ stroke: colors.grid }}
              width={isMobile ? 30 : 40}
              tickCount={isMobile ? 4 : 5}
              allowDecimals={false}
              // Y-axis padding
            >
              <Label
                value="Samples"
                position="insideLeft"
                angle={-90}
                offset={isMobile ? 2 : 5}
                style={{
                  textAnchor: 'middle',
                  fill: colors.axisLabel,
                  fontSize: isMobile ? 9 : 12,
                  fontWeight: '600', // Make it semibold for better visibility
                }}
              />
            </YAxis>
            <Tooltip content={<CustomTooltip />} />
            <Bar
              dataKey="sampleCount"
              name="Sample Count"
              fill={colors.bar}
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div
        className={`${isMobile ? 'mt-1 p-2' : 'mt-4 p-3'} bg-gray-50 dark:bg-gray-700 rounded text-sm text-gray-700 dark:text-white`}
      >
        <p>
          This chart shows the distribution of ELO scores across all samples for
          this model. Hover over bars to see detailed statistics.
        </p>
      </div>
    </div>
  )
}

export default BucketChart
