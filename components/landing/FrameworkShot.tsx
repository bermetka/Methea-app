'use client'

import { useEffect, useRef, useState } from 'react'

const SRC = '/landing/framework-screenshot.png'

/**
 * /start block 7: product screenshot. Stays hidden until the image has loaded,
 * so nothing shows while public/landing/framework-screenshot.png doesn't exist.
 */
export default function FrameworkShot() {
  const ref = useRef<HTMLImageElement>(null)
  const [loaded, setLoaded] = useState(false)
  useEffect(() => {
    // It may have finished loading before hydration attached onLoad.
    const img = ref.current
    if (img?.complete && img.naturalWidth > 0) setLoaded(true)
  }, [])
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      ref={ref}
      src={SRC}
      alt="Methea framework diagram for a sample project"
      onLoad={() => setLoaded(true)}
      style={{
        display: loaded ? 'block' : 'none',
        width: '100%', height: 'auto',
        border: '1px solid var(--stone-soft)', borderRadius: 'var(--radius-lg)',
      }}
    />
  )
}
