import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { TeamCard } from './TeamCard';

const mockNavigate = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

const mockTeam = {
  id: 1,
  name: 'Team Alpha',
  memberCount: 5,
  practiceCount: 8,
  coverage: 74,
  role: 'owner' as const,
  createdAt: '2026-01-15T10:00:00.000Z',
};

const renderTeamCard = (team = mockTeam) => {
  return render(
    <BrowserRouter>
      <TeamCard team={team} />
    </BrowserRouter>
  );
};

describe('TeamCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('displays all team stats correctly', () => {
    renderTeamCard();

    expect(screen.getByText('Team Alpha')).toBeInTheDocument();
    expect(screen.getByText('5 members')).toBeInTheDocument();
    expect(screen.getByText('8 practices')).toBeInTheDocument();
    expect(screen.getByText('74% coverage')).toBeInTheDocument();
    expect(screen.getByText('Owner')).toBeInTheDocument();
  });

  it('shows singular labels for count of 1', () => {
    const singleTeam = {
      ...mockTeam,
      memberCount: 1,
      practiceCount: 1,
    };

    renderTeamCard(singleTeam);

    expect(screen.getByText('1 member')).toBeInTheDocument();
    expect(screen.getByText('1 practice')).toBeInTheDocument();
  });

  it('displays Member role badge correctly', () => {
    const memberTeam = {
      ...mockTeam,
      role: 'member' as const,
    };

    renderTeamCard(memberTeam);

    expect(screen.getByText('Member')).toBeInTheDocument();
    expect(screen.queryByText('Owner')).not.toBeInTheDocument();
  });

  it('navigates to team dashboard on click', () => {
    renderTeamCard();

    const card = screen.getByRole('button', { name: /Open Team Alpha dashboard/i });
    fireEvent.click(card);

    expect(mockNavigate).toHaveBeenCalledWith('/teams/1');
  });

  it('navigates to team dashboard on Enter key', () => {
    renderTeamCard();

    const card = screen.getByRole('button', { name: /Open Team Alpha dashboard/i });
    fireEvent.keyDown(card, { key: 'Enter' });

    expect(mockNavigate).toHaveBeenCalledWith('/teams/1');
  });

  it('navigates to team dashboard on Space key', () => {
    renderTeamCard();

    const card = screen.getByRole('button', { name: /Open Team Alpha dashboard/i });
    fireEvent.keyDown(card, { key: ' ' });

    expect(mockNavigate).toHaveBeenCalledWith('/teams/1');
  });

  it('does not navigate on other keys', () => {
    renderTeamCard();

    const card = screen.getByRole('button', { name: /Open Team Alpha dashboard/i });
    fireEvent.keyDown(card, { key: 'a' });

    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('formats creation date correctly', () => {
    renderTeamCard();

    // Date formatting depends on locale, so just check it exists
    const dateElement = screen.getByText(/15\/01\/2026|01\/15\/2026|1\/15\/2026/);
    expect(dateElement).toBeInTheDocument();
  });

  it('applies correct styling for owner role', () => {
    renderTeamCard();

    const roleBadge = screen.getByText('Owner');
    expect(roleBadge).toHaveClass('bg-blue-100', 'text-blue-800');
  });

  it('applies correct styling for member role', () => {
    const memberTeam = {
      ...mockTeam,
      role: 'member' as const,
    };

    renderTeamCard(memberTeam);

    const roleBadge = screen.getByText('Member');
    expect(roleBadge).toHaveClass('bg-gray-100', 'text-gray-800');
  });

  it('has proper accessibility attributes', () => {
    renderTeamCard();

    const card = screen.getByRole('button', { name: /Open Team Alpha dashboard/i });
    expect(card).toHaveAttribute('tabIndex', '0');
    expect(card).toHaveAttribute('aria-label', 'Open Team Alpha dashboard');
  });
});
