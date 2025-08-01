/// <reference types="node" />
import 'dotenv/config'
import logger from './utils/logger.js';
import app from './slack/index.js';
import registerScheduledTasks from './jobs/index.js';
import mongoose from 'mongoose'

process.on('uncaughtException', (err) => {
  logger.error(err);
  process.exit(1);
});

process.on('unhandledRejection', (err) => {
  logger.error(err);
  process.exit(1);
});

/** Start Bolt App */
(async () => {
  try {
    if (!process.env.MONGODB_URL) {
      logger.error('The MONGODB_URL env variable is not set!')
      process.exit(1);
    }

    if (typeof process.env.X_GITLAB_TOKEN !== 'undefined' && process.env.X_GITLAB_TOKEN !== '') {
      logger.info('Environment variable X_GITLAB_TOKEN is set for securing the webhooks endpoint!');
    }

    await mongoose.connect(process.env.MONGODB_URL);
    logger.info('Connected to MongoDB successfully!')

    await app.start();
    logger.info('⚡️ Bolt app is running!');

    registerScheduledTasks();
  } catch (error) {
    console.error('Unable to start App', error);
  }
})();
