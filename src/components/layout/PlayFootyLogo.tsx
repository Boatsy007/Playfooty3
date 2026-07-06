import type { CSSProperties } from 'react'

// Cache-bust the public logo URL because /logo.webp replaced an older Go Netty image in production.
// The file still resolves to public/logo.webp; the query only forces browsers/CDNs to fetch the current asset.
export const PLAYFOOTY_LOGO_SRC = '/logo.webp?v=playfooty-football-logo-c176cbb'

type PlayFootyLogoProps = {
  height?: number
  maxWidth?: number
  style?: CSSProperties
}

export default function PlayFootyLogo({ height = 62, maxWidth = 300, style }: PlayFootyLogoProps) {
  return (
    <img
      src={PLAYFOOTY_LOGO_SRC}
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
