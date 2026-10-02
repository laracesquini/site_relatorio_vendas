import { createContext, useContext } from 'react'

export type Theme = 'light' | 'dark' | 'system'

export const THEME_STORAGE_KEY = 'gestao3d.theme'

export type ThemeState = { theme: Theme; setTheme: (theme: Theme) => void }

export const ThemeContext = createContext<ThemeState | null>(null)

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme precisa estar dentro de <ThemeProvider>')
  return ctx
}
