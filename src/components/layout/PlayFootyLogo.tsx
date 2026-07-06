import type { CSSProperties } from 'react'

/**
 * Single source of truth for the PlayFooty brand mark in public/admin headers.
 * Keep this pointed at the public-folder asset exactly: /public/logo.webp is
 * served by Vite/Vercel as /logo.webp. Do not import, generate, or dynamically
 * swap another header logo here.
 */
type PlayFootyLogoProps = {
  height?: number
  maxWidth?: number
  style?: CSSProperties
}

export default function PlayFootyLogo({ height = 62, maxWidth = 300, style }: PlayFootyLogoProps) {
  return (
    <img
      src="/logo.webp"
      alt="PlayFooty"
      decoding="async"
      loading="eager"
      style={{
        display: 'block',
        height,
        width: 'auto',
        maxWidth,
        objectFit: 'contain',
        maxHeight: '100%',
        flexShrink: 0,
        userSelect: 'none',
        ...style,
      }}
    />
  )
}
