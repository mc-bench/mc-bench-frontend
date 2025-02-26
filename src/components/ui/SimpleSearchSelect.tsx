interface Item {
  id: string
  name?: string
}

interface SimpleSearchSelectProps<T extends Item> {
  items: T[]
  selected: T[]
  onSelectionChange: (items: T[]) => void
  searchValue: string
  onSearchChange: (value: string) => void
  placeholder: string
  disabled?: boolean
}

export function SimpleSearchSelect<T extends Item>({
  items,
  selected,
  onSelectionChange,
  searchValue,
  onSearchChange,
  placeholder,
  disabled,
}: SimpleSearchSelectProps<T>) {
  const filteredItems = items.filter((item) =>
    (item.name?.toLowerCase() || '').includes(searchValue.toLowerCase())
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

  return (
    <div className="space-y-2">
      <div className="relative">
        <input
          type="text"
          className="w-full px-4 py-2 border rounded-md pr-10"
          placeholder={`Search ${placeholder}...`}
          value={searchValue}
          onChange={(e) => onSearchChange(e.target.value)}
          disabled={disabled}
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
            disabled={disabled}
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
              <span className="ml-2">{item.name}</span>
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
              {item.name}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
