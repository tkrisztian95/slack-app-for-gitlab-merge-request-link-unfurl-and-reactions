import * as dataStore from "../data/index.js";
import logger from "../utils/logger.js";

const SEVEN_DAY_IN_MILLIS = 7 * 24 * 60 * 60 * 1000;   // Seven day in milliseconds

const houskeepingJob = async () => {
  try {
    const currentDate = new Date();
    const sevenDaysAgo = new Date(currentDate.getTime() - SEVEN_DAY_IN_MILLIS);

    const result = await dataStore.deleteMentionsCreatedBefore(sevenDaysAgo);

    logger.info('Successfully removed %d mentions from mentions map in houskeeping job!', result.deletedCount)
  } catch (error) {
    logger.error(error)
  }
}

export default houskeepingJob;