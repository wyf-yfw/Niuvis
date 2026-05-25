import { createContext, useContext, type ReactNode } from 'react'

const SettingsPortalContext = createContext<HTMLElement | null>(null)

export function SettingsPortalProvider({
  container,
  children,
}: {
  container: HTMLElement | null
  children: ReactNode
}) {
  return (
    <SettingsPortalContext.Provider value={container}>{children}</SettingsPortalContext.Provider>
  )
}

export function useSettingsPortalContainer() {
  return useContext(SettingsPortalContext)
}
