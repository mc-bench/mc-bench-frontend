type Settings = {
  adminApiUrl: string;
  apiUrl: string;
  githubClientId: string;
}

const settings: Settings = {
  adminApiUrl: import.meta.env.VITE_ADMIN_API_URL ?? '',
  apiUrl: import.meta.env.VITE_API_URL ?? '',
  githubClientId: import.meta.env.VITE_GITHUB_CLIENT_ID ?? '',
}

// Validate required settings
Object.entries(settings).forEach(([key, value]) => {
  if (!value) {
    throw new Error(`Missing required environment variable for ${key}`);
  }
});

export default settings;