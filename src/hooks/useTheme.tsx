import { createContext, useContext, useEffect, useState } from 'react'

export const THEME_MODES = {
  LIGHT: 'light',
  DARK: 'dark',
} as const

type Theme = (typeof THEME_MODES)[keyof typeof THEME_MODES]

interface ThemeContextType {
  theme: Theme
  toggleTheme: () => void
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => {
    const savedTheme = localStorage.getItem('theme')
    return (savedTheme as Theme) || THEME_MODES.LIGHT
  })

  useEffect(() => {
    const root = window.document.documentElement
    root.classList.remove(THEME_MODES.LIGHT, THEME_MODES.DARK)
    root.classList.add(theme)
    localStorage.setItem('theme', theme)
  }, [theme])

  const toggleTheme = () => {
    setTheme((prev) =>
      prev === THEME_MODES.LIGHT ? THEME_MODES.DARK : THEME_MODES.LIGHT
    )
  }

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}
