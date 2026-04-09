import type { ReactNode } from 'react'

interface ButtonProps {
  children: ReactNode
  variant?: 'primary' | 'secondary' | 'danger'
  onClick?: () => void
  className?: string
}

export const Button = ({
  children,
  variant = 'primary',
  onClick,
  className = ''
}: ButtonProps) => {
  const baseStyles = 'font-bold py-2 px-4 rounded-lg transition'
  
  const variants = {
    primary: 'bg-blue-600 hover:bg-blue-700 text-white',
    secondary: 'border-2 border-blue-600 text-blue-600 hover:bg-blue-50',
    danger: 'bg-red-500 hover:bg-red-600 text-white'
  }

  return (
    <button
      className={`${baseStyles} ${variants[variant]} ${className}`}
      onClick={onClick}
    >
      {children}
    </button>
  )
}
