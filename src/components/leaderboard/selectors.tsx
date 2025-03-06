import type {
  MetricOption,
  TagOption,
  TestSetOption,
} from '../../types/leaderboard'
import { SelectorProps } from '../../types/ui'

function Selector<T>({
  options,
  value,
  onChange,
  label,
  placeholder,
  className = '',
  optionText,
  optionValue,
}: SelectorProps<T>) {
  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
        {label}
      </label>
      <select
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        className="px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-md text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        <option value="" disabled>
          {placeholder}
        </option>
        {options.map((option) => (
          <option key={optionValue(option)} value={optionValue(option)}>
            {optionText(option)}
          </option>
        ))}
      </select>
    </div>
  )
}

export const MetricSelector = ({
  options,
  value,
  onChange,
  className,
}: {
  options: MetricOption[]
  value: string | null
  onChange: (value: string) => void
  className?: string
}) => {
  return (
    <Selector
      options={options}
      value={value}
      onChange={onChange}
      label="Metric"
      placeholder="Select a metric"
      className={className}
      optionText={(option) => option.name}
      optionValue={(option) => option.id}
    />
  )
}

export const TestSetSelector = ({
  options,
  value,
  onChange,
  className,
}: {
  options: TestSetOption[]
  value: string | null
  onChange: (value: string) => void
  className?: string
}) => {
  return (
    <Selector
      options={options}
      value={value}
      onChange={onChange}
      label="Test Set"
      placeholder="Select a test set"
      className={className}
      optionText={(option) => option.name}
      optionValue={(option) => option.id}
    />
  )
}

export const TagSelector = ({
  options,
  value,
  onChange,
  className,
}: {
  options: TagOption[]
  value: string | null
  onChange: (value: string) => void
  className?: string
}) => {
  return (
    <Selector
      options={[{ id: '', name: 'All Tags' }, ...options]}
      value={value}
      onChange={onChange}
      label="Tag"
      placeholder="Select a tag"
      className={className}
      optionText={(option) => option.name}
      optionValue={(option) => option.id}
    />
  )
}
