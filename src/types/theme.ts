export const THEME_MODES = {
  LIGHT: 'light',
  DARK: 'dark',
} as const

export type Theme = (typeof THEME_MODES)[keyof typeof THEME_MODES]

export interface ThemeContextType {
  theme: Theme
  toggleTheme: () => void
}
