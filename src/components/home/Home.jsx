/**
 * Home Component
 * 
 * FILOSOFIA_FRONTEND_UI: STRUCTURE_Home component
 * Main entry point for the home/lobby view
 * 
 * @see docs/filosofie/FILOSOFIA_FRONTEND.md
 */

import React from 'react';
import HomePage from './HomePage';

/**
 * Home component - wrapper for HomePage
 * 
 * This provides the canonical "Home" component name expected by FILOSOFIA_FRONTEND_UI
 * while delegating to the full HomePage implementation.
 */
function Home(props) {
  return <HomePage {...props} />;
}

export default Home;
