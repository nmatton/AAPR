import { useId, useState, type ReactNode } from 'react'

interface TooltipProps {
  content: string
  children: ReactNode
  className?: string
}

export const Tooltip = ({ content, children, className }: TooltipProps) => {
  const [isOpen, setIsOpen] = useState(false)
  const tooltipId = useId()

  if (!content) {
    return <>{children}</>
  }

  return (
    <span
      className={`relative group inline-flex items-center ${className ?? ''}`}
      onMouseEnter={() => setIsOpen(true)}
      onMouseLeave={() => setIsOpen(false)}
      onFocus={() => setIsOpen(true)}
      onBlur={() => setIsOpen(false)}
      tabIndex={0}
      aria-describedby={isOpen ? tooltipId : undefined}
    >
      {children}
      {isOpen && (
        <span
          id={tooltipId}
          role="tooltip"
          className="absolute left-0 top-full mt-1 z-50 w-56 rounded-md bg-gray-800 p-2 text-xs leading-relaxed text-white shadow-lg whitespace-normal pointer-events-none"
        >
          {content}
        </span>
      )}
    </span>
  )
}
