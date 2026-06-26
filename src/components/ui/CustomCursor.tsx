import { useEffect, useRef } from 'react'

export default function CustomCursor() {
  const cursorRef = useRef<HTMLDivElement>(null)
  const followerRef = useRef<HTMLDivElement>(null)
  let followerX = 0, followerY = 0

  useEffect(() => {
    if (window.innerWidth < 768) return

    const cursor = cursorRef.current
    const follower = followerRef.current
    if (!cursor || !follower) return

    let cursorX = 0, cursorY = 0
    let raf: number

    const onMove = (e: MouseEvent) => {
      cursorX = e.clientX
      cursorY = e.clientY
      cursor.style.left = cursorX + 'px'
      cursor.style.top = cursorY + 'px'
    }

    const animate = () => {
      followerX += (cursorX - followerX) * 0.1
      followerY += (cursorY - followerY) * 0.1
      if (follower) {
        follower.style.left = followerX + 'px'
        follower.style.top = followerY + 'px'
      }
      raf = requestAnimationFrame(animate)
    }

    const onEnter = () => document.body.classList.add('cursor-hover')
    const onLeave = () => document.body.classList.remove('cursor-hover')

    window.addEventListener('mousemove', onMove)
    document.querySelectorAll('a, button').forEach(el => {
      el.addEventListener('mouseenter', onEnter)
      el.addEventListener('mouseleave', onLeave)
    })

    raf = requestAnimationFrame(animate)

    return () => {
      window.removeEventListener('mousemove', onMove)
      cancelAnimationFrame(raf)
    }
  }, [])

  return (
    <>
      <div ref={cursorRef} className="cursor hidden md:block" />
      <div ref={followerRef} className="cursor-follower hidden md:block" />
    </>
  )
}
