import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { TeamMembersView } from '../pages/TeamMembersView'
import * as teamsApi from '../api/teamsApi'
import * as membersApi from '../api/membersApi'
import * as invitesApi from '../api/invitesApi'
import { useTeamsStore } from '../state/teamsSlice'
import { useMembersStore } from '../state/membersSlice'
import { useInvitesStore } from '../state/invitesSlice'

// Mock the API modules
vi.mock('../api/teamsApi')
vi.mock('../api/membersApi')
vi.mock('../api/invitesApi')

// Mock data
const mockTeam = {
  id: 1,
  name: 'Test Team',
  practiceCount: 5,
  memberCount: 3,
  createdAt: '2025-01-01T00:00:00Z',
  coverage: 75,
  role: 'owner' as const
}

const mockMembers = [
  {
    id: 1,
    name: 'John Doe',
    email: 'john@example.com',
    joinDate: '2025-01-01T00:00:00Z',
    inviteStatus: 'Added' as const,
    bigFiveCompleted: true
  },
  {
    id: 2,
    name: 'Jane Smith',
    email: 'jane@example.com',
    joinDate: '2025-01-05T00:00:00Z',
    inviteStatus: 'Added' as const,
    bigFiveCompleted: false
  }
]

const mockInvites = [
  {
    id: 1,
    teamId: 1,
    email: 'pending@example.com',
    status: 'Pending' as const,
    createdAt: '2025-01-10T00:00:00Z'
  }
]

describe('TeamMembersView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useTeamsStore.setState({ teams: [], isLoading: false, isCreating: false, error: null })
    useMembersStore.setState({ members: [], isLoading: false, isRemoving: false, error: null })
    useInvitesStore.setState({ invites: [], isLoading: false, isCreating: false, isResending: false, error: null })
    // Mock the API calls to return resolved promises
    vi.mocked(teamsApi.getTeams).mockResolvedValue([mockTeam])
    vi.mocked(membersApi.getMembers).mockResolvedValue(mockMembers)
    vi.mocked(invitesApi.getInvites).mockResolvedValue(mockInvites)
    vi.mocked(membersApi.logMembersPageViewed).mockResolvedValue(undefined)
  })

  const renderWithRoute = () =>
    render(
      <MemoryRouter initialEntries={['/teams/1/members']}>
        <Routes>
          <Route path="/teams/:teamId/members" element={<TeamMembersView />} />
        </Routes>
      </MemoryRouter>
    )

  it('renders the team members page', async () => {
    renderWithRoute()

    expect(await screen.findByRole('heading', { level: 2, name: /Team Members/i })).toBeInTheDocument()
  })

  it('loads members on mount', async () => {
    renderWithRoute()

    await waitFor(() => {
      expect(vi.mocked(membersApi.getMembers)).toHaveBeenCalled()
    })
  })

  it('loads invites on mount', async () => {
    renderWithRoute()

    await waitFor(() => {
      expect(vi.mocked(invitesApi.getInvites)).toHaveBeenCalled()
    })
  })

  it('displays the back button', async () => {
    renderWithRoute()

    await waitFor(() => {
      const backButton = screen.getByText(/Back to Team Dashboard/i)
      expect(backButton).toBeInTheDocument()
    })
  })

  it('displays members list', async () => {
    renderWithRoute()

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument()
      expect(screen.getByText('Jane Smith')).toBeInTheDocument()
    })
  })

  it('displays invite panel', async () => {
    renderWithRoute()

    await waitFor(() => {
      expect(screen.getByText(/Invite Member/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/Email address to invite/i)).toBeInTheDocument()
    })
  })

  it('displays pending invites section', async () => {
    renderWithRoute()

    await waitFor(() => {
      expect(screen.getByText(/Pending Invitations/i)).toBeInTheDocument()
      expect(screen.getByText('pending@example.com')).toBeInTheDocument()
    })
  })

  it('shows loading state initially', () => {
    vi.mocked(teamsApi.getTeams).mockImplementation(
      () => new Promise<typeof mockTeam[]>(() => {}) // Never resolves
    )
    useTeamsStore.setState({ teams: [], isLoading: true, isCreating: false, error: null })

    renderWithRoute()

    expect(screen.getByText(/Loading team members/i)).toBeInTheDocument()
  })

  it('handles member removal', async () => {
    vi.mocked(membersApi.removeMember).mockResolvedValue(true)

    renderWithRoute()

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument()
    })

    const removeButtons = screen.getAllByLabelText(/Remove/i)
    removeButtons[0].click()

    await waitFor(() => {
      expect(screen.getByText(/Are you sure/i)).toBeInTheDocument()
    })
  })
})
