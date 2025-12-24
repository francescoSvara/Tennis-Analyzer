/**
 * MatchSidebar - Sidebar navigazione tabs
 * 
 * @see docs/filosofie/FILOSOFIA_FRONTEND.md
 */

import React from 'react';
import { motion } from 'framer-motion';
import { CaretLeft, CaretRight } from '@phosphor-icons/react';
import { durations, easings } from '../../../motion/tokens';
import './MatchSidebar.css';

/**
 * SidebarItem - Singola voce della sidebar
 */
function SidebarItem({ tab, isActive, onClick, collapsed }) {
  const Icon = tab.icon;

  return (
    <motion.button
      className={`sidebar-item ${isActive ? 'sidebar-item--active' : ''}`}
      onClick={onClick}
      whileHover={{ x: collapsed ? 0 : 4 }}
      whileTap={{ scale: 0.98 }}
      transition={{ duration: durations.fast, ease: easings.premium }}
      title={collapsed ? tab.label : undefined}
    >
      <span className="sidebar-item__icon">
        <Icon size={20} weight={isActive ? 'duotone' : 'regular'} />
      </span>
      {!collapsed && (
        <span className="sidebar-item__label">{tab.label}</span>
      )}
      {isActive && (
        <motion.div
          className="sidebar-item__indicator"
          layoutId="sidebar-indicator"
          transition={{ duration: durations.normal, ease: easings.premium }}
        />
      )}
    </motion.button>
  );
}

/**
 * MatchSidebar Component
 */
export function MatchSidebar({
  tabs,
  activeTab,
  onTabChange,
  collapsed,
  onToggleCollapse,
}) {
  return (
    <aside className={`match-sidebar ${collapsed ? 'match-sidebar--collapsed' : ''}`}>
      <nav className="match-sidebar__nav">
        {tabs.map((tab) => (
          <SidebarItem
            key={tab.id}
            tab={tab}
            isActive={activeTab === tab.id}
            onClick={() => onTabChange(tab.id)}
            collapsed={collapsed}
          />
        ))}
      </nav>

      <div className="match-sidebar__footer">
        <motion.button
          className="collapse-button"
          onClick={onToggleCollapse}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          title={collapsed ? 'Espandi' : 'Comprimi'}
        >
          {collapsed ? (
            <CaretRight size={16} weight="bold" />
          ) : (
            <CaretLeft size={16} weight="bold" />
          )}
        </motion.button>
      </div>
    </aside>
  );
}

export default MatchSidebar;
