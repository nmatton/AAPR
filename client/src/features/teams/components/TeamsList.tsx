import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTeamsStore } from '../state/teamsSlice';
import { TeamCard } from './TeamCard';
import { EmptyState } from './EmptyState';
import { sendPrivacyCodeEmail } from '../../auth/api/authApi';

interface PrivacyCodeToast {
  type: 'success' | 'error';
  message: string;
}

export const TeamsList = () => {
  const { teams, isLoading, error, fetchTeams } = useTeamsStore();
  const [minLoadTime, setMinLoadTime] = useState(false);
  const [isSendingPrivacyCode, setIsSendingPrivacyCode] = useState(false);
  const [privacyCodeToast, setPrivacyCodeToast] = useState<PrivacyCodeToast | null>(null);
  const navigate = useNavigate();
  const userGuideUrl = '/AAPR%20User%20Guide.pdf';

  useEffect(() => {
    fetchTeams();
  }, [fetchTeams]);

  // Ensure loading skeleton shows for at least 300ms to avoid flash
  useEffect(() => {
    if (isLoading) {
      setMinLoadTime(false);
      const timer = setTimeout(() => setMinLoadTime(true), 300);
      return () => clearTimeout(timer);
    } else {
      setMinLoadTime(true);
    }
  }, [isLoading]);

  useEffect(() => {
    if (!privacyCodeToast) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setPrivacyCodeToast(null);
    }, 3000);

    return () => window.clearTimeout(timeoutId);
  }, [privacyCodeToast]);

  const handleRetry = () => {
    fetchTeams();
  };

  const handleSendPrivacyCode = async () => {
    setIsSendingPrivacyCode(true);

    try {
      await sendPrivacyCodeEmail();
      setPrivacyCodeToast({
        type: 'success',
        message: 'Check your email for your privacy code'
      });
    } catch {
      setPrivacyCodeToast({
        type: 'error',
        message: 'Failed to send your privacy code email. Please try again.'
      });
    } finally {
      setIsSendingPrivacyCode(false);
    }
  };

  const headerActions = (
    <div className="flex items-center gap-3">
      <a
        href={userGuideUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="text-sm font-medium text-blue-700 hover:text-blue-900"
      >
        User Guide
      </a>
      <button
        type="button"
        onClick={() => navigate('/teams/create')}
        className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
      >
        Create Team
      </button>
    </div>
  );

  const privacyCodeAction = (
    <div className="mt-8 border-t border-gray-200 pt-6">
      <button
        type="button"
        onClick={handleSendPrivacyCode}
        disabled={isSendingPrivacyCode}
        className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
          isSendingPrivacyCode
            ? 'bg-blue-300 text-white cursor-not-allowed'
            : 'bg-blue-600 text-white hover:bg-blue-700'
        }`}
      >
        {isSendingPrivacyCode ? 'Sending...' : 'Send my personal code by email'}
      </button>
    </div>
  );

  const privacyCodeToastBanner = privacyCodeToast && (
    <div
      className={`mb-6 rounded-md px-4 py-3 text-sm ${
        privacyCodeToast.type === 'success'
          ? 'bg-green-50 text-green-800 border border-green-200'
          : 'bg-red-50 text-red-800 border border-red-200'
      }`}
    >
      {privacyCodeToast.message}
    </div>
  );

  if (isLoading || !minLoadTime) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-gray-800">My Teams</h1>
          {headerActions}
        </div>
        <div className="animate-pulse space-y-4">
          <div className="bg-gray-200 h-32 rounded-lg"></div>
          <div className="bg-gray-200 h-32 rounded-lg"></div>
          <div className="bg-gray-200 h-32 rounded-lg"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-gray-800">My Teams</h1>
          {headerActions}
        </div>
        {privacyCodeToastBanner}
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <svg
            className="w-16 h-16 text-red-400 mb-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <h2 className="text-2xl font-semibold text-gray-700 mb-2">Something went wrong</h2>
          <p className="text-gray-500 mb-6">{error}</p>
          <button
            onClick={handleRetry}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Retry
          </button>
        </div>
        {privacyCodeAction}
      </div>
    );
  }

  if (teams.length === 0) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-gray-800">My Teams</h1>
          {headerActions}
        </div>
        {privacyCodeToastBanner}
        <EmptyState />
        {privacyCodeAction}
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-gray-800">My Teams</h1>
        {headerActions}
      </div>
      {privacyCodeToastBanner}
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {teams.map((team) => (
          <TeamCard key={team.id} team={team} />
        ))}
      </div>
      {privacyCodeAction}
    </div>
  );
};
