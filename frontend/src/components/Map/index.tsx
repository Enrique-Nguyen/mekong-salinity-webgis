import dynamic from 'next/dynamic'
import { MapSkeleton } from '@/components/Skeleton'

// Dynamic import with SSR disabled (Leaflet requires window/document)
export const SalinityMap = dynamic(
  () => import('./SalinityMap'),
  { 
    ssr: false,
    loading: () => <MapSkeleton />,
  }
)

// Re-export types for convenience
export type { default as SalinityMapComponent } from './SalinityMap'
