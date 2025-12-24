/**
 * MatchPage - Layout principale della pagina match
 * 
 * Struttura a 3 zone come da FILOSOFIA_FRONTEND.md:
 * - Header sticky
 * - Sidebar + Main Tabs
 * - Right Rail
 * 
 * @see docs/filosofie/FILOSOFIA_FRONTEND.md
 */

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import {
  ArrowLeft,
  House,
  ChartLineUp,
  ListBullets,
  ChartBar,
  Target,
  Lightning,
  Broadcast,
  ClipboardText,
  TrendUp,
  Scales,
  Bell,
  Gear,
} from '@phosphor-icons/react';

import { useMatchBundle, BundleState } from '../../hooks/useMatchBundle';
import { durations, easings, fadeUp, staggerContainer } from '../../motion/tokens';
import { MotionTab, MotionTabList } from '../../motion/MotionTab';

// Tab Components
import OverviewTab from './tabs/OverviewTab';
import StrategiesTab from './tabs/StrategiesTab';
import OddsTab from './tabs/OddsTab';
import PointByPointTab from './tabs/PointByPointTab';
import StatsTab from './tabs/StatsTab';
import MomentumTab from './tabs/MomentumTab';
import PredictorTab from './tabs/PredictorTab';
import JournalTab from './tabs/JournalTab';

// Layout Components
import MatchHeader from './layout/MatchHeader';
import MatchSidebar from './layout/MatchSidebar';
import RightRail from './layout/RightRail';
import LoadingSkeleton from './layout/LoadingSkeleton';
import ErrorState from './layout/ErrorState';

import './MatchPage.css';

// Definizione tabs
const TABS = [
  { id: 'overview', label: 'Overview', icon: House },
  { id: 'strategies', label: 'Strategie', icon: Target },
  { id: 'odds', label: 'Odds', icon: ChartLineUp },
  { id: 'pointByPoint', label: 'Point-by-Point', icon: ListBullets },
  { id: 'stats', label: 'Stats', icon: ChartBar },
  { id: 'momentum', label: 'Momentum', icon: TrendUp },
  { id: 'predictor', label: 'Predictor', icon: Scales },
  { id: 'journal', label: 'Journal', icon: ClipboardText },
];

/**
 * MatchPage Component
 */
export function MatchPage({ matchId, onBack }) {
  const shouldReduceMotion = useReducedMotion();
  const [activeTab, setActiveTab] = useState('overview');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Hook unificato per MatchBundle
  const {
    bundle,
    tabs,
    header,
    dataQuality,
    state,
    error,
    isLive,
    isLoading,
    isRefreshing,
    isError,
    actions,
  } = useMatchBundle(matchId);

  // Varianti motion
  const pageVariants = shouldReduceMotion
    ? { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } }
    : fadeUp;

  // Render tab content
  const renderTabContent = () => {
    const tabData = tabs[activeTab];

    switch (activeTab) {
      case 'overview':
        return <OverviewTab data={tabData} header={header} strategies={tabs.strategies} />;
      case 'strategies':
        return <StrategiesTab data={tabData} header={header} />;
      case 'odds':
        return <OddsTab data={tabData} header={header} strategies={tabs.strategies} />;
      case 'pointByPoint':
        return <PointByPointTab data={tabData} header={header} />;
      case 'stats':
        return <StatsTab data={tabData} header={header} />;
      case 'momentum':
        return <MomentumTab data={tabData} header={header} />;
      case 'predictor':
        return <PredictorTab data={tabData} header={header} />;
      case 'journal':
        return <JournalTab data={tabData} matchId={matchId} />;
      default:
        return <OverviewTab data={tabs.overview} header={header} />;
    }
  };

  // Loading state
  if (isLoading && !bundle) {
    return <LoadingSkeleton />;
  }

  // Error state
  if (isError && !bundle) {
    return <ErrorState error={error} onRetry={actions.refresh} onBack={onBack} />;
  }

  return (
    <motion.div
      className="match-page"
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
    >
      {/* Header Sticky */}
      <MatchHeader
        header={header}
        isLive={isLive}
        isRefreshing={isRefreshing}
        dataQuality={dataQuality}
        onBack={onBack}
        onRefresh={actions.refresh}
      />

      {/* Main Layout */}
      <div className="match-page__layout">
        {/* Sidebar */}
        <MatchSidebar
          tabs={TABS}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        />

        {/* Main Content */}
        <main className="match-page__main">
          {/* Tab Bar (mobile) */}
          <div className="match-page__tabs-mobile">
            <MotionTabList>
              {TABS.map((tab) => (
                <MotionTab
                  key={tab.id}
                  isActive={activeTab === tab.id}
                  onClick={() => setActiveTab(tab.id)}
                >
                  <tab.icon size={16} weight={activeTab === tab.id ? 'duotone' : 'regular'} />
                  <span className="tab-label">{tab.label}</span>
                </MotionTab>
              ))}
            </MotionTabList>
          </div>

          {/* Tab Content */}
          <div className="match-page__content">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: durations.normal, ease: easings.premium }}
                className="match-page__tab-content"
              >
                {renderTabContent()}
              </motion.div>
            </AnimatePresence>
          </div>
        </main>

        {/* Right Rail */}
        <RightRail
          strategies={tabs.strategies}
          odds={tabs.odds}
          header={header}
        />
      </div>
    </motion.div>
  );
}

export default MatchPage;
