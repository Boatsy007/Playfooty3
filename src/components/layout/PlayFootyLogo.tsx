import type { CSSProperties } from 'react'

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
      style={{
        display: 'block',
        height,
        width: 'auto',
        maxWidth,
        objectFit: 'contain',
        ...style,
      }}
    />
  )
}
