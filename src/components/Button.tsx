import { forwardRef, type ButtonHTMLAttributes } from 'react'

type ButtonVariant = 'unstyled' | 'primary' | 'secondary' | 'danger'

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant
}

const baseStyles =
  'inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-lime-500 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-gray-900 disabled:opacity-50 disabled:cursor-not-allowed'

const variants: Record<ButtonVariant, string> = {
  // "unstyled" keeps sizing/focus/disabled behavior but avoids forcing colors.
  unstyled: '',
  primary: 'bg-blue-600 hover:bg-blue-700 text-white',
  secondary: 'border-2 border-blue-600 text-blue-600 hover:bg-blue-50',
  danger: 'bg-red-500 hover:bg-red-600 text-white',
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'unstyled', className = '', type = 'button', ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={`${baseStyles} ${variants[variant]} ${className}`.trim()}
      {...props}
    />
  )
})
