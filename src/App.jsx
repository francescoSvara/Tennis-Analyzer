/**
 * App.jsx - Main Application
 *
 * New architecture based on FILOSOFIA_FRONTEND.md
 * Clean, minimal routing between Home and Match views
 */

import React, { useState, useEffect, useCallback } from 'react';
import { AnimatePresence } from 'framer-motion';

// New components
import { HomePage } from './components/home';
import { MatchPage } from './components/match';
import PlayerPage from './components/PlayerPage';
import ErrorBoundary from './components/ErrorBoundary';

// Config & Utils
import { apiUrl } from './config';

// Styles
import './index.css';

// Views enum
const View = {
  HOME: 'home',
  MATCH: 'match',
  PLAYER: 'player',
};

export default function App() {
  const [currentView, setCurrentView] = useState(View.HOME);
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [summaryCache, setSummaryCache] = useState(null);
  const [summaryLoading, setSummaryLoading] = useState(true);

  console.log('🚀 App rendering, currentView:', currentView);

  // Fetch summary on mount
  useEffect(() => {
    fetchSummary();
  }, []);

  const fetchSummary = useCallback(async () => {
    setSummaryLoading(true);
    try {
      const response = await fetch(apiUrl('/api/matches/summary'));
      if (response.ok) {
        const data = await response.json();
        setSummaryCache(data);
      }
    } catch (error) {
      console.error('Failed to fetch summary:', error);
    } finally {
      setSummaryLoading(false);
    }
  }, []);

  // Navigation handlers
  const handleMatchSelect = useCallback((match) => {
    setSelectedMatch(match);
    setCurrentView(View.MATCH);
  }, []);

  const handleBackToHome = useCallback(() => {
    setSelectedMatch(null);
    setCurrentView(View.HOME);
  }, []);

  const handleNavigateToPlayer = useCallback(() => {
    setCurrentView(View.PLAYER);
  }, []);

  const handleBackFromPlayer = useCallback(() => {
    setCurrentView(View.HOME);
  }, []);

  return (
    <ErrorBoundary>
      <AnimatePresence mode="wait">
        {currentView === View.HOME && (
          <HomePage
            key="home"
            onMatchSelect={handleMatchSelect}
            onNavigateToPlayer={handleNavigateToPlayer}
            summaryCache={summaryCache}
            summaryLoading={summaryLoading}
            onRefreshSummary={fetchSummary}
          />
        )}

        {currentView === View.MATCH && selectedMatch && (
          <MatchPage
            key="match"
            matchId={selectedMatch.id || selectedMatch.eventId}
            matchData={selectedMatch}
            onBack={handleBackToHome}
          />
        )}

        {currentView === View.PLAYER && <PlayerPage key="player" onBack={handleBackFromPlayer} />}
      </AnimatePresence>
    </ErrorBoundary>
  );
}
