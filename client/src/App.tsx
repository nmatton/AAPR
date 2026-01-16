import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { SignupForm } from './features/auth/components/SignupForm'
import { useAuthStore } from './features/auth/state/authSlice'

function Teams() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">Teams</h1>
        <p className="text-gray-600">Welcome to your teams dashboard (placeholder)</p>
      </div>
    </div>
  )
}

const App = () => {
  const { isAuthenticated } = useAuthStore()

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/signup"
          element={
            isAuthenticated ? <Navigate to="/teams" replace /> : <SignupForm />
          }
        />
        <Route
          path="/teams"
          element={
            isAuthenticated ? <Teams /> : <Navigate to="/signup" replace />
          }
        />
        <Route path="/" element={<Navigate to="/signup" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
