/**
 * Logger utility per il backend
 * 
 * Centralizza il logging per:
 * 1. Disabilitare facilmente i log in production
 * 2. Aggiungere timestamp e contesto
 * 3. Supportare futuri log strutturati (JSON)
 * 
 * @file backend/utils/logger.js
 * @version 1.0.0
 */

const IS_PRODUCTION = process.env.NODE_ENV === 'production';
const LOG_LEVEL = process.env.LOG_LEVEL || (IS_PRODUCTION ? 'warn' : 'debug');

const LEVELS = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const currentLevel = LEVELS[LOG_LEVEL] || LEVELS.info;

/**
 * Formatta il messaggio con timestamp
 */
function formatMessage(level, context, message, data) {
  const timestamp = new Date().toISOString();
  const prefix = context ? `[${context}]` : '';
  
  if (IS_PRODUCTION) {
    // JSON structured logging per production
    return JSON.stringify({
      timestamp,
      level,
      context,
      message,
      ...(data ? { data } : {}),
    });
  }
  
  // Human-readable per development
  return `${timestamp} ${level.toUpperCase()} ${prefix} ${message}`;
}

/**
 * Logger factory - crea logger con contesto
 * @param {string} context - Nome del modulo/servizio
 * @returns {Object} Logger con metodi debug/info/warn/error
 */
function createLogger(context = '') {
  return {
    debug(message, data) {
      if (currentLevel <= LEVELS.debug) {
        console.log(formatMessage('debug', context, message, data));
        if (data && !IS_PRODUCTION) console.log(data);
      }
    },
    
    info(message, data) {
      if (currentLevel <= LEVELS.info) {
        console.log(formatMessage('info', context, message, data));
        if (data && !IS_PRODUCTION) console.log(data);
      }
    },
    
    warn(message, data) {
      if (currentLevel <= LEVELS.warn) {
        console.warn(formatMessage('warn', context, message, data));
        if (data && !IS_PRODUCTION) console.warn(data);
      }
    },
    
    error(message, data) {
      if (currentLevel <= LEVELS.error) {
        console.error(formatMessage('error', context, message, data));
        if (data) console.error(data);
      }
    },
  };
}

// Default logger senza contesto
const logger = createLogger();

module.exports = {
  createLogger,
  logger,
  IS_PRODUCTION,
  LOG_LEVEL,
};
