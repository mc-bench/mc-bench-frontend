import { Moon, Sun } from 'lucide-react'
import { useTheme } from '../../hooks/useTheme'

export const ThemeToggle = () => {
    const { theme, toggleTheme } = useTheme()

    return (
        <button
            onClick={toggleTheme}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
            aria-label="Toggle theme"
        >
            {theme === 'light' ? (
                <Moon className="h-5 w-5 text-gray-600 dark:text-gray-400" />
            ) : (
                <Sun className="h-5 w-5 text-gray-400" />
            )}
        </button>
    )
} 