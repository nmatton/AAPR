import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { CategorizedTagSelector } from './CategorizedTagSelector'

describe('CategorizedTagSelector', () => {
  it('renders all category headings and toggles tag selection', () => {
    const onChange = vi.fn()

    render(
      <CategorizedTagSelector
        selectedTags={['Written / Async-Ready']}
        onChange={onChange}
      />
    )

    expect(screen.getByText('Interaction & Communication Style')).toBeInTheDocument()
    expect(screen.getByText('Knowledge & Technical Continuity')).toBeInTheDocument()
    expect(screen.getByRole('checkbox', { name: 'Written / Async-Ready' })).toBeChecked()

    fireEvent.click(screen.getByRole('checkbox', { name: 'Remote-Friendly' }))

    expect(onChange).toHaveBeenCalledWith(['Written / Async-Ready', 'Remote-Friendly'])
  })

  it('honors disabled state', () => {
    const onChange = vi.fn()

    render(
      <CategorizedTagSelector
        selectedTags={[]}
        onChange={onChange}
        disabled
      />
    )

    const checkbox = screen.getByRole('checkbox', { name: 'Written / Async-Ready' })
    expect(checkbox).toBeDisabled()
  })

  it('shows tag descriptions on hover only when showDescriptions is enabled', () => {
    const onChange = vi.fn()

    const { rerender } = render(
      <CategorizedTagSelector
        selectedTags={[]}
        onChange={onChange}
      />
    )

    fireEvent.mouseEnter(screen.getByText('Remote-Friendly'))
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument()

    rerender(
      <CategorizedTagSelector
        selectedTags={[]}
        onChange={onChange}
        showDescriptions
      />
    )

    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument()

    fireEvent.mouseEnter(screen.getByText('Remote-Friendly'))
    expect(screen.getByRole('tooltip')).toHaveTextContent('Well suited for remote work')

    fireEvent.mouseLeave(screen.getByText('Remote-Friendly'))
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument()
  })
})
