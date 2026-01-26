import { ReactNode, useState } from 'react'
import { useNavigate, useParams, NavLink } from 'react-router-dom'
import { useAuthStore } from '../../features/auth/state/authSlice'

interface AuthenticatedLayoutProps {
    children: ReactNode
}

/**
 * Persistent layout for authenticated pages
 * Provides AAPR header with navigation and logout
 */
export const AuthenticatedLayout = ({ children }: AuthenticatedLayoutProps) => {
    const navigate = useNavigate()
    const { teamId } = useParams<{ teamId: string }>()
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
    const { logout, isLoading, user } = useAuthStore()

    const handleLogout = async () => {
        await logout()
        navigate('/login')
    }

    const handleLogoClick = () => {
        navigate('/teams')
    }

    // Determine if we're in a team context
    const isInTeamContext = !!teamId

    return (
        <div className="min-h-screen bg-gray-50">
            <header className="bg-white shadow">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                    <div className="flex justify-between items-center">
                        <div className="flex items-center">
                            {/* Logo/Branding - clickable */}
                            <button
                                type="button"
                                onClick={handleLogoClick}
                                className="text-xl font-semibold text-gray-900 hover:text-teal-600 transition-colors"
                            >
                                AAPR
                            </button>
                        </div>

                        {/* Desktop Navigation */}
                        <nav className="hidden md:flex items-center gap-6">
                            {/* Practice Catalog - always visible */}
                            <NavLink
                                to="/practices"
                                className={({ isActive }) =>
                                    `text-sm font-medium transition-colors ${isActive
                                        ? 'text-teal-600'
                                        : 'text-gray-700 hover:text-teal-600'
                                    }`
                                }
                            >
                                Practice Catalog
                            </NavLink>

                            {/* Team Dashboard - visible only in team context */}
                            {isInTeamContext && (
                                <NavLink
                                    to={`/teams/${teamId}`}
                                    className={({ isActive }) =>
                                        `text-sm font-medium transition-colors ${isActive
                                            ? 'text-teal-600'
                                            : 'text-gray-700 hover:text-teal-600'
                                        }`
                                    }
                                >
                                    Team Dashboard
                                </NavLink>
                            )}

                            {/* Members - visible only in team context */}
                            {isInTeamContext && (
                                <NavLink
                                    to={`/teams/${teamId}/members`}
                                    className={({ isActive }) =>
                                        `text-sm font-medium transition-colors ${isActive
                                            ? 'text-teal-600'
                                            : 'text-gray-700 hover:text-teal-600'
                                        }`
                                    }
                                >
                                    Members
                                </NavLink>
                            )}

                            {/* User Profile/Avatar */}
                            {user && (
                                <div className="flex items-center gap-2 text-sm text-gray-700 ml-4 border-l pl-6 border-gray-200">
                                    <div className="w-8 h-8 rounded-full bg-teal-100 flex items-center justify-center">
                                        <span className="text-teal-700 font-medium">
                                            {user.name.charAt(0).toUpperCase()}
                                        </span>
                                    </div>
                                    <span className="hidden lg:inline">{user.name}</span>
                                </div>
                            )}

                            {/* Logout Button */}
                            <button
                                type="button"
                                onClick={handleLogout}
                                disabled={isLoading}
                                className="text-sm font-medium text-indigo-600 hover:text-indigo-800 disabled:opacity-50 transition-colors"
                            >
                                Logout
                            </button>
                        </nav>

                        {/* Mobile menu button */}
                        <div className="flex items-center md:hidden">
                            <button
                                type="button"
                                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                                className="inline-flex items-center justify-center p-2 rounded-md text-gray-700 hover:text-teal-600 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-teal-500"
                                aria-expanded="false"
                                data-testid="mobile-menu-button"
                            >
                                <span className="sr-only">Open main menu</span>
                                {/* Icon when menu is closed */}
                                {!isMobileMenuOpen ? (
                                    <svg className="block h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                                    </svg>
                                ) : (
                                    /* Icon when menu is open */
                                    <svg className="block h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                )}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Mobile Menu */}
                {isMobileMenuOpen && (
                    <div className="md:hidden border-t border-gray-200" data-testid="mobile-menu-container">
                        <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
                            <NavLink
                                to="/practices"
                                onClick={() => setIsMobileMenuOpen(false)}
                                className={({ isActive }) =>
                                    `block px-3 py-2 rounded-md text-base font-medium ${isActive
                                        ? 'bg-teal-50 text-teal-700'
                                        : 'text-gray-700 hover:text-teal-600 hover:bg-gray-50'
                                    }`
                                }
                            >
                                Practice Catalog
                            </NavLink>

                            {isInTeamContext && (
                                <>
                                    <NavLink
                                        to={`/teams/${teamId}`}
                                        onClick={() => setIsMobileMenuOpen(false)}
                                        className={({ isActive }) =>
                                            `block px-3 py-2 rounded-md text-base font-medium ${isActive
                                                ? 'bg-teal-50 text-teal-700'
                                                : 'text-gray-700 hover:text-teal-600 hover:bg-gray-50'
                                            }`
                                        }
                                    >
                                        Team Dashboard
                                    </NavLink>
                                    <NavLink
                                        to={`/teams/${teamId}/members`}
                                        onClick={() => setIsMobileMenuOpen(false)}
                                        className={({ isActive }) =>
                                            `block px-3 py-2 rounded-md text-base font-medium ${isActive
                                                ? 'bg-teal-50 text-teal-700'
                                                : 'text-gray-700 hover:text-teal-600 hover:bg-gray-50'
                                            }`
                                        }
                                    >
                                        Members
                                    </NavLink>
                                </>
                            )}
                        </div>
                        <div className="pt-4 pb-4 border-t border-gray-200">
                            {user && (
                                <div className="flex items-center px-5 mb-3">
                                    <div className="flex-shrink-0">
                                        <div className="w-10 h-10 rounded-full bg-teal-100 flex items-center justify-center">
                                            <span className="text-teal-700 font-bold text-lg">
                                                {user.name.charAt(0).toUpperCase()}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="ml-3">
                                        <div className="text-base font-medium leading-none text-gray-800">{user.name}</div>
                                        <div className="text-sm font-medium leading-none text-gray-500 mt-1">{user.email}</div>
                                    </div>
                                </div>
                            )}
                            <div className="px-2 space-y-1">
                                <button
                                    type="button"
                                    onClick={handleLogout}
                                    className="block w-full text-left px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50"
                                >
                                    Logout
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </header>

            {/* Main Content */}
            <main>{children}</main>
        </div>
    )
}
