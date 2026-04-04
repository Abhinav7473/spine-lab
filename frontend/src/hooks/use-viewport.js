import { useState, useEffect } from 'react'
import { breakpoints } from '../constants/theme'

export function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState(
    () => typeof window !== 'undefined' && window.innerWidth >= 900
  )

  useEffect(() => {
    const handler = () => setIsDesktop(window.innerWidth >= 900)
    window.addEventListener('resize', handler, { passive: true })
    return () => window.removeEventListener('resize', handler)
  }, [])

  return isDesktop
}
