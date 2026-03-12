import type { ReactNode } from 'react'

interface TooltipProps {
  content: string
  children: ReactNode
  className?: string
}

export const Tooltip = ({ content, children, className }: TooltipProps) => {
  if (!content) {
    return <>{children}</>
  }

  return (
    <span className={`relative group inline-flex items-center ${className ?? ''}`}>
      {children}
      <span
        role="tooltip"
        className="invisible group-hover:visible absolute left-0 top-full mt-1 z-50 w-56 rounded-md bg-gray-800 p-2 text-xs leading-relaxed text-white shadow-lg whitespace-normal pointer-events-none"
      >
        {content}
      </span>
    </span>
  )
}
