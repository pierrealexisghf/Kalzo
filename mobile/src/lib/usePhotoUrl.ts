import { useEffect, useState } from 'react'
import { signedUrl } from './photos'

export function usePhotoUrl(path?: string | null): string | null {
  const [res, setRes] = useState<{ path: string; url: string | null } | null>(null)
  useEffect(() => {
    if (!path) return
    let alive = true
    signedUrl(path).then(url => { if (alive) setRes({ path, url }) })
    return () => { alive = false }
  }, [path])
  return path && res?.path === path ? res.url : null
}
