import type { CSSProperties } from 'react'

export const PLAYFOOTY_LOGO_SRC = '/logo.webp'

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
