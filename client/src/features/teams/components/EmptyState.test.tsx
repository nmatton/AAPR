import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { EmptyState } from './EmptyState';

const mockNavigate = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

const renderEmptyState = () => {
  return render(
    <BrowserRouter>
      <EmptyState />
    </BrowserRouter>
  );
};

describe('EmptyState', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('displays empty state message', () => {
    renderEmptyState();

    expect(screen.getByText('No teams yet')).toBeInTheDocument();
    expect(screen.getByText('Create one or wait for an invite.')).toBeInTheDocument();
  });

  it('displays Create Team button', () => {
    renderEmptyState();

    const button = screen.getByRole('button', { name: /Create your first team/i });
    expect(button).toBeInTheDocument();
    expect(button).toHaveTextContent('Create Team');
  });

  it('navigates to team creation form on button click', () => {
    renderEmptyState();

    const button = screen.getByRole('button', { name: /Create your first team/i });
    fireEvent.click(button);

    expect(mockNavigate).toHaveBeenCalledWith('/teams/create');
  });

  it('has proper accessibility attributes', () => {
    renderEmptyState();

    const button = screen.getByRole('button', { name: /Create your first team/i });
    expect(button).toHaveAttribute('aria-label', 'Create your first team');
  });

  it('renders team icon', () => {
    renderEmptyState();

    // SVG should be in the document
    const svg = document.querySelector('svg');
    expect(svg).toBeInTheDocument();
    expect(svg).toHaveClass('w-16', 'h-16', 'text-gray-400');
  });
});
