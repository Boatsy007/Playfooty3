import { motion } from 'framer-motion'

interface ButtonProps {
  children: React.ReactNode
  variant?: 'primary' | 'outline' | 'ghost' | 'outline-white'
  size?: 'sm' | 'md' | 'lg'
  className?: string
  onClick?: () => void
  type?: 'button' | 'submit'
  disabled?: boolean
}

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  className = '',
  onClick,
  type = 'button',
  disabled = false,
}: ButtonProps) {
  const base = 'inline-flex items-center justify-center font-bold rounded-full transition-all duration-200 cursor-pointer select-none'

  const sizes = {
    sm: 'px-5 py-2.5 text-sm',
    md: 'px-7 py-3.5 text-sm',
    lg: 'px-9 py-4 text-base',
  }

  const variants = {
    primary: 'bg-pink-500 text-white hover:bg-pink-600 shadow-lg shadow-pink-500/25 hover:shadow-pink-500/40 hover:scale-[1.02] active:scale-[0.98]',
    outline: 'border-2 border-navy-700 text-navy-700 hover:bg-navy-700 hover:text-white',
    ghost: 'text-navy-700 hover:text-pink-500',
    'outline-white': 'border-2 border-white text-white hover:bg-white hover:text-navy-900',
  }

  return (
    <motion.button
      type={type}
      onClick={onClick}
      disabled={disabled}
      whileTap={{ scale: 0.97 }}
      className={`${base} ${sizes[size]} ${variants[variant]} ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}
    >
      {children}
    </motion.button>
  )
}
