import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const useThemeStore = create(
  persist(
    (set, get) => ({
      isDark: false,
      
      // Toggle theme
      toggleTheme: () => {
        set((state) => ({ isDark: !state.isDark }))
      },
      
      // Set specific theme
      setTheme: (isDark) => {
        set({ isDark })
      },
      
      // Initialize theme based on system preference
      initializeTheme: () => {
        const stored = localStorage.getItem('theme-storage')
        if (!stored) {
          const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
          set({ isDark: prefersDark })
        }
      },
    }),
    {
      name: 'theme-storage',
    }
  )
)
