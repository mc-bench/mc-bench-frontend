type Settings = {
  adminApiUrl: string
  apiUrl: string
  githubClientId: string
  object_cdn_root_url: string
  isProd: boolean
}

const settings: Settings = {
  adminApiUrl: import.meta.env.VITE_ADMIN_API_URL ?? '',
  apiUrl: import.meta.env.VITE_API_URL ?? '',
  githubClientId: import.meta.env.VITE_GITHUB_CLIENT_ID ?? '',
  object_cdn_root_url: import.meta.env.VITE_OBJECT_CDN_ROOT_URL ?? '',
  isProd: import.meta.env.VITE_IS_PROD === 'true',
}

// Validate required settings
Object.entries(settings).forEach(([key, value]) => {
  if (!value && key !== 'isProd') {
    // isProd can be false
    throw new Error(`Missing required environment variable for ${key}`)
  }
})

export default settings
