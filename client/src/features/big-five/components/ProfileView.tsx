import React from 'react';
import { Link } from 'react-router-dom';
import { ProfileRadarChart } from './ProfileRadarChart';
import { TraitScoreList } from './TraitScoreList';
import type { BigFiveScores } from '../api/bigFiveApi';

interface ProfileViewProps {
    scores: BigFiveScores;
    onRetake: () => void;
}

export const ProfileView: React.FC<ProfileViewProps> = ({ scores, onRetake }) => {
    return (
        <div className="container mx-auto px-4 max-w-6xl">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-100">My Personality Profile</h1>
                    <p className="text-gray-400 mt-1">
                        Completed on: {new Date(scores.createdAt).toLocaleDateString(undefined, {
                            year: 'numeric', month: 'long', day: 'numeric'
                        })}
                    </p>
                </div>
                <button
                    onClick={onRetake}
                    className="text-emerald-400 hover:text-emerald-300 font-medium flex items-center gap-2 border border-emerald-500/30 px-4 py-2 rounded-lg hover:bg-emerald-500/10 transition-colors"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
                    </svg>
                    Retake Assessment
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Radar Chart Section */}
                <div className="lg:col-span-1 bg-gray-800/50 rounded-xl p-6 border border-gray-700 shadow-lg flex flex-col items-center justify-center">
                    <h2 className="text-xl font-semibold text-gray-200 mb-6 self-start">Visualization</h2>
                    <ProfileRadarChart scores={scores} />
                </div>

                {/* Breakdown Section */}
                <div className="lg:col-span-2">
                    <h2 className="text-xl font-semibold text-gray-200 mb-6">Trait Dimensions</h2>
                    <TraitScoreList scores={scores} />
                </div>
            </div>

            <div className="mt-8 flex justify-end">
                <Link
                    to="/teams"
                    className="px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors shadow-lg"
                >
                    Continue to Teams
                </Link>
            </div>
        </div>
    );
};
