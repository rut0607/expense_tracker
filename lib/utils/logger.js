const isDev = process.env.NODE_ENV === 'development'

// Simple console logger (no external dependencies)
export const createLogger = (context) => {
  return {
    info: (message, data = {}) => {
      console.log(JSON.stringify({
        level: 'info',
        context,
        message,
        ...data,
        timestamp: new Date().toISOString()
      }))
    },
    error: (message, error = {}, data = {}) => {
      console.error(JSON.stringify({
        level: 'error',
        context,
        message,
        error: {
          message: error.message,
          stack: error.stack,
          ...error
        },
        ...data,
        timestamp: new Date().toISOString()
      }))
    },
    warn: (message, data = {}) => {
      console.warn(JSON.stringify({
        level: 'warn',
        context,
        message,
        ...data,
        timestamp: new Date().toISOString()
      }))
    },
    debug: (message, data = {}) => {
      if (isDev) {
        console.debug(JSON.stringify({
          level: 'debug',
          context,
          message,
          ...data,
          timestamp: new Date().toISOString()
        }))
      }
    }
  }
}

export const logger = createLogger('app')