/**
 * ErrorState - Stato di errore
 * 
 * @see docs/filosofie/FILOSOFIA_FRONTEND.md (UI States)
 */

import React from 'react';
import { motion } from 'framer-motion';
import { WarningCircle, ArrowLeft, ArrowClockwise } from '@phosphor-icons/react';
import { MotionButton } from '../../../motion/MotionButton';
import { durations, easings, fadeUp } from '../../../motion/tokens';
import './ErrorState.css';

/**
 * ErrorState Component
 */
export function ErrorState({ error, onRetry, onBack }) {
  return (
    <motion.div
      className="error-state"
      variants={fadeUp}
      initial="initial"
      animate="animate"
      exit="exit"
    >
      <div className="error-state__content">
        <motion.div
          className="error-icon"
          initial={{ scale: 0.8 }}
          animate={{ scale: 1 }}
          transition={{ duration: durations.normal, ease: easings.softBounce }}
        >
          <WarningCircle size={64} weight="duotone" />
        </motion.div>

        <h2 className="error-title">Oops! Qualcosa è andato storto</h2>
        
        <p className="error-message">
          {error || 'Si è verificato un errore durante il caricamento dei dati.'}
        </p>

        <div className="error-actions">
          <MotionButton variant="primary" onClick={onRetry}>
            <ArrowClockwise size={18} weight="bold" />
            Riprova
          </MotionButton>

          {onBack && (
            <MotionButton variant="secondary" onClick={onBack}>
              <ArrowLeft size={18} weight="bold" />
              Torna alla Home
            </MotionButton>
          )}
        </div>

        <div className="error-hint">
          <p>Se il problema persiste, prova a:</p>
          <ul>
            <li>Verificare la connessione internet</li>
            <li>Ricaricare la pagina</li>
            <li>Controllare che il match sia ancora disponibile</li>
          </ul>
        </div>
      </div>
    </motion.div>
  );
}

export default ErrorState;
