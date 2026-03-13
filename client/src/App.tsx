import { TeamDashboard } from './features/teams/components/TeamDashboard'
import { CreateTeamForm } from './features/teams/components/CreateTeamForm'
import { MemberDetailView } from './features/teams/components/MemberDetailView'
import { TeamMembersView } from './features/teams/pages/TeamMembersView'
import { CoverageDetailsView } from './features/teams/pages/CoverageDetailsView'
import { ManagePracticesView } from './features/teams/pages/ManagePracticesView'
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { SignupForm } from './features/auth/components/SignupForm'
import { LoginForm } from './features/auth/components/LoginForm'
import { ProtectedRoute } from './features/auth/components/ProtectedRoute'
import { useAuthStore } from './features/auth/state/authSlice'
import { getCurrentUser } from './features/auth/api/authApi'
import { TeamsList } from './features/teams/components/TeamsList'
import { PracticeCatalog } from './features/practices/pages/PracticeCatalog'
import { BigFivePage } from './features/big-five/pages/BigFivePage'
import { AuthenticatedLayout } from './components/ui/AuthenticatedLayout'
import { PersonalityGuard } from './components/ui/PersonalityGuard'
import { IssueDetailView } from './features/issues/components/IssueDetailView'
import { IssuesDashboard } from './features/issues/pages/IssuesDashboard'

const TeamsPage = () => {
  return <TeamsList />
}

const AppRoutes = () => {
  const navigate = useNavigate()
  const { isAuthenticated, setCurrentUser, reset, setError, setLoading } = useAuthStore()
  const [isSessionChecked, setIsSessionChecked] = useState(false)

  useEffect(() => {
    let isCancelled = false

    const validateSession = async () => {
      if (!isAuthenticated) {
        if (!isCancelled) {
          setLoading(false)
          setIsSessionChecked(true)
        }
        return
      }

      if (!isCancelled) {
        setLoading(true)
      }

      try {
        const user = await getCurrentUser()
        if (!isCancelled) {
          setCurrentUser({
            id: user.id,
            name: user.name,
            email: user.email,
            createdAt: user.createdAt,
            hasCompletedBigFive: user.hasCompletedBigFive
          })
        }
      } catch (error) {
        if (!isCancelled) {
          reset()
          // Set error message for display on login page.
          if (error && typeof error === 'object' && 'code' in error) {
            const apiError = error as { code: string; message: string }
            if (apiError.code === 'session_expired') {
              setError('Session expired. Please log in again.')
            } else {
              setError('Your session is no longer valid. Please log in again.')
            }
          } else {
            setError('Session expired. Please log in again.')
          }
          navigate('/login', { replace: true })
        }
      } finally {
        if (!isCancelled) {
          setLoading(false)
          setIsSessionChecked(true)
        }
      }
    }

    setIsSessionChecked(false)
    void validateSession()

    return () => {
      isCancelled = true
    }
  }, [isAuthenticated, navigate, reset, setCurrentUser, setError, setLoading])

  const { isAuthenticated: isAuthed } = useAuthStore()

  if (!isSessionChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-600">Loading...</div>
      </div>
    )
  }

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
            <PersonalityGuard>
              <AuthenticatedLayout>
                <TeamsPage />
              </AuthenticatedLayout>
            </PersonalityGuard>
          </ProtectedRoute>
        }
      />
      <Route
        path="/practices"
        element={
          <ProtectedRoute>
            <AuthenticatedLayout>
              <PracticeCatalog />
            </AuthenticatedLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/teams/create"
        element={
          <ProtectedRoute>
            <PersonalityGuard>
              <AuthenticatedLayout>
                <CreateTeamForm />
              </AuthenticatedLayout>
            </PersonalityGuard>
          </ProtectedRoute>
        }
      />
      <Route
        path="/teams/:teamId"
        element={
          <ProtectedRoute>
            <PersonalityGuard>
              <AuthenticatedLayout>
                <TeamDashboard />
              </AuthenticatedLayout>
            </PersonalityGuard>
          </ProtectedRoute>
        }
      />
      <Route
        path="/teams/:teamId/members"
        element={
          <ProtectedRoute>
            <PersonalityGuard>
              <AuthenticatedLayout>
                <TeamMembersView />
              </AuthenticatedLayout>
            </PersonalityGuard>
          </ProtectedRoute>
        }
      />
      <Route
        path="/teams/:teamId/members/:userId"
        element={
          <ProtectedRoute>
            <PersonalityGuard>
              <AuthenticatedLayout>
                <MemberDetailView />
              </AuthenticatedLayout>
            </PersonalityGuard>
          </ProtectedRoute>
        }
      />
      <Route
        path="/teams/:teamId/practices/add"
        element={<Navigate to="../manage" relative="path" replace />}
      />
      <Route
        path="/teams/:teamId/practices/manage"
        element={
          <ProtectedRoute>
            <PersonalityGuard>
              <AuthenticatedLayout>
                <ManagePracticesView />
              </AuthenticatedLayout>
            </PersonalityGuard>
          </ProtectedRoute>
        }
      />
      <Route
        path="/teams/:teamId/coverage"
        element={
          <ProtectedRoute>
            <PersonalityGuard>
              <AuthenticatedLayout>
                <CoverageDetailsView />
              </AuthenticatedLayout>
            </PersonalityGuard>
          </ProtectedRoute>
        }
      />
      <Route
        path="/big-five"
        element={
          <ProtectedRoute>
            <AuthenticatedLayout>
              <BigFivePage />
            </AuthenticatedLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/teams/:teamId/issues"
        element={
          <ProtectedRoute>
            <PersonalityGuard>
              <AuthenticatedLayout>
                <IssuesDashboard />
              </AuthenticatedLayout>
            </PersonalityGuard>
          </ProtectedRoute>
        }
      />
      <Route
        path="/teams/:teamId/issues/:issueId"
        element={
          <ProtectedRoute>
            <PersonalityGuard>
              <AuthenticatedLayout>
                <IssueDetailView />
              </AuthenticatedLayout>
            </PersonalityGuard>
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
