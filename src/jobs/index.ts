import cron from 'node-cron'

import dailyHouskeepingJob from './houskeeping-job.js';
import updateUnfurlsJob from './update-unfurls-job.js';
import logger from '../utils/logger.js';

const registerScheduledTasks = () => {

  logger.debug('Registering houskeeping job daily at 6am');
  cron.schedule('0 6 * * *', dailyHouskeepingJob);

  logger.debug('Registering update unfurls job daily every hour from 7:00 to 18:59 at minute 0 on every day-of-week from Monday through Friday');
  cron.schedule('0 7-19 * * 1-5', updateUnfurlsJob);

  logger.info('Registered scheduled jobs!')
};

export default registerScheduledTasks;