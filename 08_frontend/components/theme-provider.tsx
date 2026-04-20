"use client"

import * as React from "react"

type ThemeProviderProps = {
  children: React.ReactNode
  defaultTheme?: string
  attribute?: string
  enableSystem?: boolean
  disableTransitionOnChange?: boolean
}

type ThemeContextType = {
  theme: string
  setTheme: (theme: string) => void
}

const ThemeContext = React.createContext<ThemeContextType>({
  theme: "dark",
  setTheme: () => null,
})

export function ThemeProvider({ children, defaultTheme = "dark" }: ThemeProviderProps) {
  const [theme, setThemeState] = React.useState(defaultTheme)
  const isMounted = React.useRef(false)

  React.useEffect(() => {
    isMounted.current = true
    const saved = localStorage.getItem("ui-theme") || defaultTheme
    setTheme(saved)
  }, [])

  const setTheme = (newTheme: string) => {
    setThemeState(newTheme)
    if (isMounted.current) {
      localStorage.setItem("ui-theme", newTheme)
    }
    const root = window.document.documentElement
    root.classList.remove("light", "dark")
    root.classList.add(newTheme)
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export const useTheme = () => React.useContext(ThemeContext)
