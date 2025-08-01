import { pino } from 'pino';

const logger = pino({
  level: process.env.PINO_LOG_LEVEL || 'info',
});

logger.debug('If you can see this, log level is set to debug! See the PINO_LOG_LEVEL env variable!');

export default logger;
