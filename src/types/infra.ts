export interface WorkerTask {
  id: string
  name: string
  started_at: string
  args: any[]
  kwargs: Record<string, any>
  status: string
  eta?: string
  retries: number
}

export interface Worker {
  id: string
  hostname: string
  status: string
  queues: string[]
  concurrency: number
  poolSize: number
  tasks: WorkerTask[]
  lastHeartbeat?: string
  started_at?: string
}

export interface QueuedTask {
  id: string
  name: string
  args: any[]
  kwargs: Record<string, any>
  eta?: string
  priority?: number
  queuedAt?: string
}

export interface Queue {
  name: string
  count: number
  workerCount: number
  tasks: QueuedTask[]
}

export interface InfraStatus {
  workers: Worker[]
  queues: Queue[]
  totalActiveTasks: number
  totalQueuedTasks: number
  warnings: string[]
}

export interface CancelConsumerRequest {
  queue: string
}

export interface CancelConsumerResponse {
  success: boolean
  message: string
}

export interface WorkerActionRequest {
  action: 'shutdown' | 'restart' | 'pool_grow' | 'pool_shrink'
  option?: number
}
