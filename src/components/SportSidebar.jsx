import React from 'react';

const SPORTS = [
  { id: 'tennis', name: 'Tennis', icon: '🎾', enabled: true },
  { id: 'football', name: 'Calcio', icon: '⚽', enabled: false },
  { id: 'basketball', name: 'Basket', icon: '🏀', enabled: false },
  { id: 'rugby-union', name: 'Rugby Union', icon: '🏉', enabled: false },
];

function SportSidebar({ selectedSport, onSelectSport }) {
  return (
    <aside className="sport-sidebar">
      <div className="sport-sidebar-header">
        <span className="sport-sidebar-icon">🏆</span>
        <span className="sport-sidebar-title">Sport</span>
      </div>
      <nav className="sport-list">
        {SPORTS.map((sport) => (
          <button
            key={sport.id}
            className={`sport-item ${selectedSport === sport.id ? 'active' : ''} ${!sport.enabled ? 'disabled' : ''}`}
            onClick={() => sport.enabled && onSelectSport(sport.id)}
            disabled={!sport.enabled}
            title={!sport.enabled ? 'Coming soon' : sport.name}
          >
            <span className="sport-icon">{sport.icon}</span>
            <span className="sport-name">{sport.name}</span>
            {!sport.enabled && <span className="sport-badge">Soon</span>}
          </button>
        ))}
      </nav>
    </aside>
  );
}

export default SportSidebar;
