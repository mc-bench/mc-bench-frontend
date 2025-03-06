import { ReactNode } from 'react'

import { BucketStats, QuartileStats } from './leaderboard'

export interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  description?: string
  children: React.ReactNode
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl'
}

export interface BucketChartProps {
  buckets: BucketStats[] | QuartileStats[]
}

export interface AuthProviderProps {
  children: ReactNode
}

export type HelpButtonProps = {
  section?: 'list' | 'view' | 'create'
}

export type PromptsHelpProps = {
  section?: 'list' | 'view' | 'create'
}

export interface SelectorProps<T> {
  options: T[]
  value: string | null
  onChange: (value: string) => void
  label: string
  placeholder: string
  className?: string
  optionText: (option: T) => string
  optionValue: (option: T) => string
}

export interface Item {
  id: string
  name?: string
  slug?: string
  experimentalState?: string
}

export interface SearchSelectProps<T extends Item> {
  items: T[]
  selected: T[]
  onSelectionChange: (items: T[]) => void
  searchValue: string
  onSearchChange: (value: string) => void
  placeholder: string
  urlStates?: string[]
  onStatesChange?: (states: string[]) => void
}

export interface SimpleItem {
  id: string
  name?: string
}

export interface SimpleSearchSelectProps<T extends SimpleItem> {
  items: T[]
  selected: T[]
  onSelectionChange: (items: T[]) => void
  searchValue: string
  onSearchChange: (value: string) => void
  placeholder: string
  disabled?: boolean
}
