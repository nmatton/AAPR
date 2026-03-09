import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { TagFilter } from './TagFilter'
import { usePracticesStore } from '../state/practices.slice'

vi.mock('../state/practices.slice', () => ({
  usePracticesStore: vi.fn()
}))

describe('TagFilter', () => {
  it('renders categorized selector and updates selected tags', () => {
    const setTags = vi.fn()

    vi.mocked(usePracticesStore).mockReturnValue({
      selectedTags: ['Written / Async-Ready'],
      setTags
    } as any)

    const { container } = render(<TagFilter />)

    expect(container.firstChild).toMatchSnapshot()

    expect(screen.getByText('Interaction & Communication Style')).toBeInTheDocument()
    expect(screen.getByRole('checkbox', { name: 'Written / Async-Ready' })).toBeChecked()

    fireEvent.click(screen.getByRole('checkbox', { name: 'Remote-Friendly' }))

    expect(setTags).toHaveBeenCalledWith(['Written / Async-Ready', 'Remote-Friendly'])
  })
})
