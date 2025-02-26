import { useState } from 'react'

interface Item {
  id: string
  name?: string
  slug?: string
  experimentalState?: string
}

interface SearchSelectProps<T extends Item> {
  items: T[]
  selected: T[]
  onSelectionChange: (items: T[]) => void
  searchValue: string
  onSearchChange: (value: string) => void
  placeholder: string
}

const EXPERIMENTAL_STATES = [
  { value: 'EXPERIMENTAL', label: 'Experimental', color: 'text-orange-600' },
  { value: 'RELEASED', label: 'Released', color: 'text-green-600' },
  { value: 'DEPRECATED', label: 'Deprecated', color: 'text-gray-600' },
  { value: 'REJECTED', label: 'Rejected', color: 'text-red-600' },
] as const

export function SearchSelect<T extends Item>({
  items,
  selected,
  onSelectionChange,
  searchValue,
  onSearchChange,
  placeholder,
}: SearchSelectProps<T>) {
  const [enabledStates, setEnabledStates] = useState<Set<string>>(
    new Set(['EXPERIMENTAL', 'RELEASED'])
  )

  const getStateChar = (state?: string) => {
    switch (state) {
      case 'EXPERIMENTAL':
        return 'E'
      case 'RELEASED':
        return 'R'
      case 'DEPRECATED':
        return 'D'
      case 'REJECTED':
        return 'X'
      default:
        return undefined
    }
  }

  const filteredItems = items.filter(
    (item) =>
      (item.name?.toLowerCase() || item.slug?.toLowerCase() || '').includes(
        searchValue.toLowerCase()
      ) &&
      (!item.experimentalState || enabledStates.has(item.experimentalState))
  )

  const handleSelectAll = () => {
    onSelectionChange(filteredItems)
  }

  const handleSelectNone = () => {
    const filteredIds = new Set(filteredItems.map((item) => item.id))
    onSelectionChange(selected.filter((item) => !filteredIds.has(item.id)))
  }

  const isAllSelected =
    filteredItems.length > 0 &&
    filteredItems.every((item) => selected.some((s) => s.id === item.id))

  const getStateColor = (state?: string) => {
    switch (state) {
      case 'EXPERIMENTAL':
        return 'text-orange-600 bg-orange-50'
      case 'RELEASED':
        return 'text-green-600 bg-green-50'
      case 'DEPRECATED':
        return 'text-gray-600 bg-gray-50'
      case 'REJECTED':
        return 'text-red-600 bg-red-50'
      default:
        return ''
    }
  }

  const toggleState = (state: string) => {
    const newStates = new Set(enabledStates)
    if (newStates.has(state)) {
      newStates.delete(state)
    } else {
      newStates.add(state)
    }
    setEnabledStates(newStates)
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-4 mb-2">
        <span className="text-sm text-gray-600">Show:</span>
        {EXPERIMENTAL_STATES.map((state) => (
          <label
            key={state.value}
            className="flex items-center gap-2 cursor-pointer"
          >
            <input
              type="checkbox"
              checked={enabledStates.has(state.value)}
              onChange={() => toggleState(state.value)}
              className="rounded border-gray-300"
            />
            <span className={`text-sm ${state.color}`}>{state.label}</span>
          </label>
        ))}
      </div>

      <div className="relative">
        <input
          type="text"
          className="w-full px-4 py-2 border rounded-md pr-10"
          placeholder={`Search ${placeholder}...`}
          value={searchValue}
          onChange={(e) => onSearchChange(e.target.value)}
        />
        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
          <svg
            className="h-5 w-5 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>
      </div>

      <div className="border rounded-md overflow-hidden">
        <div className="bg-gray-50 px-4 py-2 border-b flex justify-between items-center">
          <span className="text-sm text-gray-600">
            {filteredItems.length} items
          </span>
          <button
            onClick={isAllSelected ? handleSelectNone : handleSelectAll}
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            {isAllSelected ? 'Deselect All' : 'Select All'}
          </button>
        </div>

        <div className="max-h-48 overflow-auto">
          {filteredItems.map((item) => (
            <div
              key={item.id}
              className="flex items-center px-4 py-2 hover:bg-gray-50 cursor-pointer"
              onClick={() => {
                const isSelected = selected.some((s) => s.id === item.id)
                onSelectionChange(
                  isSelected
                    ? selected.filter((s) => s.id !== item.id)
                    : [...selected, item]
                )
              }}
            >
              <input
                type="checkbox"
                checked={selected.some((s) => s.id === item.id)}
                readOnly
                className="h-4 w-4 text-blue-600 border-gray-300 rounded"
              />
              <span className="ml-2 flex items-center gap-2">
                {item.experimentalState && (
                  <span
                    className={`text-xs px-1.5 py-0.5 rounded-md font-medium ${getStateColor(item.experimentalState)}`}
                  >
                    {getStateChar(item.experimentalState)}
                  </span>
                )}
                {item.name || item.slug}
              </span>
            </div>
          ))}
        </div>
      </div>

      {selected.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selected.map((item) => (
            <span
              key={item.id}
              className="inline-flex items-center bg-blue-100 text-blue-800 px-2 py-1 rounded-md text-sm"
            >
              {item.name || item.slug}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
