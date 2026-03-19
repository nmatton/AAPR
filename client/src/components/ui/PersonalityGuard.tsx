import { ReactNode, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '../../features/auth/state/authSlice'

interface PersonalityGuardProps {
    children: ReactNode
}

export const PersonalityGuard = ({ children }: PersonalityGuardProps) => {
    const { user, isAuthenticated } = useAuthStore()
    const navigate = useNavigate()
    const location = useLocation()

    useEffect(() => {
        if (isAuthenticated && user && !user.hasCompletedBigFive && !user.isAdminMonitor) {
            // Prevent infinite redirect loop if already on the page
            if (location.pathname !== '/big-five') {
                navigate('/big-five', { replace: true })
            }
        }
    }, [isAuthenticated, user, navigate, location])

    // If user needs to complete survey and isn't on the survey page, don't render children
    // expecting the effect to redirect
    if (isAuthenticated && user && !user.hasCompletedBigFive && !user.isAdminMonitor && location.pathname !== '/big-five') {
        return null
    }

    return <>{children}</>
}
