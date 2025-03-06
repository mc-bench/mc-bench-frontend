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
import type { BucketStats, QuartileStats } from '../../types/leaderboard'
import { BucketChartProps } from '../../types/ui'

// Helper function to determine if an item is a QuartileStats
const isQuartileStat = (
  bucket: BucketStats | QuartileStats
): bucket is QuartileStats => {
  return 'quartile' in bucket
}

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
  const [totalSamples, setTotalSamples] = useState(0)
  const [avgElo, setAvgElo] = useState(0)
  const [variance, setVariance] = useState(0)

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

    // Calculate total samples and aggregate data
    let sampleTotal = 0
    let eloSum = 0
    let eloValues: number[] = []

    // Extract data based on the type of stats
    if (validBuckets.every(isQuartileStat)) {
      // For QuartileStats
      validBuckets.forEach((bucket) => {
        const typedBucket = bucket as QuartileStats
        const sampleCount = typedBucket.sample_count || 0
        const avgElo = typedBucket.avg_elo || 0

        sampleTotal += sampleCount
        eloSum += avgElo * sampleCount

        // Add approx ELO values for variance calculation
        for (let i = 0; i < sampleCount; i++) {
          eloValues.push(avgElo)
        }
      })
    } else if (validBuckets.every((bucket) => 'bucket' in bucket)) {
      // For BucketStats
      validBuckets.forEach((bucket) => {
        const typedBucket = bucket as BucketStats
        const sampleCount = typedBucket.sample_count || 0
        const avgElo = typedBucket.avg_elo || 0

        sampleTotal += sampleCount
        eloSum += avgElo * sampleCount

        // Add approx ELO values for variance calculation
        for (let i = 0; i < sampleCount; i++) {
          eloValues.push(avgElo)
        }
      })
    }

    setTotalSamples(sampleTotal)

    // Calculate average ELO
    const average = sampleTotal > 0 ? eloSum / sampleTotal : 0
    setAvgElo(average)

    // Calculate variance
    if (eloValues.length > 0) {
      const sumSquaredDiff = eloValues.reduce((sum, elo) => {
        return sum + Math.pow(elo - average, 2)
      }, 0)
      setVariance(sumSquaredDiff / eloValues.length)
    }

    // Create distribution buckets
    const distribution: Record<string, number> = {}

    // Initialize all buckets with 0
    for (let elo = MIN_ELO; elo < MAX_ELO; elo += RANGE_SIZE) {
      const rangeLabel = `${elo}-${elo + RANGE_SIZE}`
      distribution[rangeLabel] = 0
    }

    // Fill in the distribution
    if (validBuckets.every(isQuartileStat)) {
      validBuckets.forEach((bucket) => {
        const typedBucket = bucket as QuartileStats
        const sampleCount = typedBucket.sample_count || 0
        const avgElo = typedBucket.avg_elo || 0

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
    } else if (validBuckets.every((bucket) => 'bucket' in bucket)) {
      validBuckets.forEach((bucket) => {
        const typedBucket = bucket as BucketStats
        const sampleCount = typedBucket.sample_count || 0
        const avgElo = typedBucket.avg_elo || 0

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
    }

    // Convert to chart data array
    const chartData = Object.entries(distribution).map(([range, count]) => ({
      eloRange: range,
      sampleCount: count,
      percentOfTotal: ((count / sampleTotal) * 100).toFixed(1),
    }))

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
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
      {/* Stats summary */}
      <div className="mb-4 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded">
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">
            Average ELO
          </h3>
          <p className="text-xl font-bold text-gray-900 dark:text-gray-100">
            {Math.round(avgElo)}
          </p>
        </div>
        <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded">
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">
            Standard Deviation
          </h3>
          <p className="text-xl font-bold text-gray-900 dark:text-gray-100">
            {Math.round(Math.sqrt(variance))}
          </p>
        </div>
        <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded">
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">
            Total Samples
          </h3>
          <p className="text-xl font-bold text-gray-900 dark:text-gray-100">
            {totalSamples}
          </p>
        </div>
      </div>

      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={distributionData}
            margin={{ top: 10, right: 30, left: 20, bottom: 50 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} />
            <XAxis
              dataKey="eloRange"
              tick={{ fill: colors.axisLabel, fontSize: 11 }}
              axisLine={{ stroke: colors.grid }}
              tickLine={{ stroke: colors.grid }}
              height={50}
              angle={-45}
              textAnchor="end"
              interval={0}
              label={{
                value: 'ELO Score Range',
                position: 'insideBottom',
                offset: -15,
                fill: colors.axisLabel,
                fontSize: 12,
                style: {
                  textAnchor: 'middle',
                  display: isMobile ? 'none' : 'block',
                  fontWeight: '600', // Make it semibold for better visibility
                },
              }}
            />
            <YAxis
              tick={{ fill: colors.axisLabel, fontSize: 12 }}
              axisLine={{ stroke: colors.grid }}
              tickLine={{ stroke: colors.grid }}
            >
              <Label
                value="Sample Count"
                position="insideLeft"
                angle={-90}
                style={{
                  textAnchor: 'middle',
                  fill: colors.axisLabel,
                  fontSize: 12,
                  fontWeight: '600', // Make it semibold for better visibility
                  display: isMobile ? 'none' : 'block', // Hide on mobile
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

      <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-700 rounded text-sm text-gray-700 dark:text-white">
        <p>
          This chart shows the distribution of ELO scores across all samples for
          this model.
          {variance > 0 && (
            <>
              {' '}
              With a standard deviation of {Math.round(Math.sqrt(variance))},
              this model
              {Math.sqrt(variance) > 150
                ? ' is more specialized (performs very well on some samples, less well on others).'
                : ' is more generalized (performs consistently across different samples).'}
            </>
          )}
        </p>
      </div>
    </div>
  )
}

export default BucketChart
