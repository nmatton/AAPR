import { TeamDashboard } from './features/teams/components/TeamDashboard'
import { CreateTeamForm } from './features/teams/components/CreateTeamForm'
import { MemberDetailView } from './features/teams/components/MemberDetailView'
import { TeamMembersView } from './features/teams/pages/TeamMembersView'
import { AddPracticesView } from './features/teams/pages/AddPracticesView'
import { CoverageDetailsView } from './features/teams/pages/CoverageDetailsView'
import { ManagePracticesView } from './features/teams/pages/ManagePracticesView'
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import { useEffect } from 'react'
import { SignupForm } from './features/auth/components/SignupForm'
import { LoginForm } from './features/auth/components/LoginForm'
import { ProtectedRoute } from './features/auth/components/ProtectedRoute'
import { useAuthStore } from './features/auth/state/authSlice'
import { getCurrentUser } from './features/auth/api/authApi'
import { TeamsList } from './features/teams/components/TeamsList'
import { PracticeCatalog } from './features/practices/pages/PracticeCatalog'

const TeamsPage = () => {
  const navigate = useNavigate()
  const { logout, isLoading } = useAuthStore()

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
           <h1 className="text-xl font-semibold text-gray-900">AAPR</h1>
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => navigate('/practices')}
              className="text-sm font-medium text-blue-600 hover:text-blue-800"
            >
              Practice Catalog
            </button>
            <button
              type="button"
              onClick={handleLogout}
              disabled={isLoading}
              className="text-sm font-medium text-indigo-600 hover:text-indigo-800"
            >
              Logout
            </button>
          </div>
        </div>
      </header>
      <main>
        <TeamsList />
      </main>
    </div>
  )
}

const AppRoutes = () => {
  const navigate = useNavigate()
  const { isAuthenticated, setCurrentUser, reset, setError, setLoading } = useAuthStore()

  useEffect(() => {
    const validateSession = async () => {
      if (!isAuthenticated) {
        return
      }

      setLoading(true)
      try {
        const user = await getCurrentUser()
        setCurrentUser({
          id: user.id,
          name: user.name,
          email: user.email,
          createdAt: user.createdAt
        })
      } catch (error) {
        reset()
        // Set error message for display on login page
        if (error && typeof error === 'object' && 'code' in error) {
          const apiError = error as { code: string; message: string }
          if (apiError.code === 'session_expired') {
            setError('Session expired. Please log in again.')
          } else {
            setError('Your session is no longer valid. Please log in again.')
          }
        } else {
          setError('Your session is no longer valid. Please log in again.')
        }
        navigate('/login', { replace: true })
      }
    }

    void validateSession()
  }, [isAuthenticated, navigate, reset, setCurrentUser, setError, setLoading])

  const { isAuthenticated: isAuthed } = useAuthStore()

  return (
    <Routes>
      <Route
        path="/signup"
        element={
          isAuthed ? <Navigate to="/teams" replace /> : <SignupForm />
        }
      />
      <Route
        path="/login"
        element={
          isAuthed ? <Navigate to="/teams" replace /> : <LoginForm />
        }
      />
      <Route
        path="/teams"
        element={
          <ProtectedRoute>
              <TeamsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/practices"
        element={
          <ProtectedRoute>
            <PracticeCatalog />
          </ProtectedRoute>
        }
      />
        <Route
          path="/teams/create"
          element={
            <ProtectedRoute>
              <CreateTeamForm />
            </ProtectedRoute>
          }
        />
        <Route
          path="/teams/:teamId"
          element={
            <ProtectedRoute>
              <TeamDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/teams/:teamId/members"
          element={
            <ProtectedRoute>
              <TeamMembersView />
            </ProtectedRoute>
          }
        />
        <Route
          path="/teams/:teamId/members/:userId"
          element={
            <ProtectedRoute>
              <MemberDetailView />
            </ProtectedRoute>
          }
        />
        <Route
          path="/teams/:teamId/practices/add"
          element={
            <ProtectedRoute>
              <AddPracticesView />
            </ProtectedRoute>
          }
        />
        <Route
          path="/teams/:teamId/practices/manage"
          element={
            <ProtectedRoute>
              <ManagePracticesView />
            </ProtectedRoute>
          }
        />
        <Route
          path="/teams/:teamId/coverage"
          element={
            <ProtectedRoute>
              <CoverageDetailsView />
            </ProtectedRoute>
          }
        />
      <Route path="/" element={<Navigate to="/login" replace />} />
    </Routes>
  )
}

const App = () => (
  <BrowserRouter>
    <AppRoutes />
  </BrowserRouter>
)

export default App
