interface SectionLabelProps {
  children: React.ReactNode
  light?: boolean
  className?: string
}

export default function SectionLabel({ children, light = false, className = '' }: SectionLabelProps) {
  return (
    <div className={`inline-flex items-center gap-2 mb-4 ${className}`}>
      <div className={`h-px w-8 ${light ? 'bg-pink-300' : 'bg-pink-500'}`} />
      <span className={`text-xs font-bold tracking-[0.15em] uppercase ${light ? 'text-pink-300' : 'text-pink-500'}`}>
        {children}
      </span>
      <div className={`h-px w-8 ${light ? 'bg-pink-300' : 'bg-pink-500'}`} />
    </div>
  )
}
