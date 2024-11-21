export interface Provider {
  id?: string
  name: string
  providerClass: string
  config: Record<string, any>
  isDefault?: boolean
  _configStr?: string // Temporary field for editing
}

export interface Model {
  id?: string
  slug: string
  providers: Provider[]
  created?: string
  createdBy?: string
  lastModified?: string
  lastModifiedBy?: string
  active?: boolean
  usage: number
}

export interface ModelFormData {
  slug: string
  providers: Provider[]
}

export interface ProviderClass {
  id: string
  name: string
}
