import { RunResponse } from './generations.ts'

export interface Template {
  id: string
  name: string
  description: string
  content: string
  created: string
  createdBy: string
  lastModified: string
  lastModifiedBy: string
  active: boolean
  frozen: boolean
  usage: number
  runs?: RunResponse[]
}
