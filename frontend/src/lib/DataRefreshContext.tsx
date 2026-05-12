'use client'

import { createContext, useContext, useState, useCallback, ReactNode } from 'react'

interface DataRefreshContextType {
  refreshKey: number
  triggerRefresh: () => void
}

const DataRefreshContext = createContext<DataRefreshContextType>({
  refreshKey: 0,
  triggerRefresh: () => {},
})

export function DataRefreshProvider({ children }: { children: ReactNode }) {
  const [refreshKey, setRefreshKey] = useState(0)

  const triggerRefresh = useCallback(() => {
    setRefreshKey((prev) => prev + 1)
  }, [])

  return (
    <DataRefreshContext.Provider value={{ refreshKey, triggerRefresh }}>
      {children}
    </DataRefreshContext.Provider>
  )
}

export function useDataRefresh() {
  return useContext(DataRefreshContext)
}
