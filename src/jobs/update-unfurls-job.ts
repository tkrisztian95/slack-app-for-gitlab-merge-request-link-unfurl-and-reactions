
import { findAllMentions } from "../data/index.js"
import logger from "../utils/logger.js";
import { updateUnfurlLink } from "../services/mentions-service.js"


const updateUnfurlsJob = async () => {
  logger.debug('Updating unfurls on mentions job...');
  try {
    const allMentions = await findAllMentions();

    allMentions.forEach((mention) => {
      try {
        updateUnfurlLink(mention);
      } catch (error) {
        logger.error(error, 'Cannot update unfurl for mention in update unfurls job because of an error!')
      }
    });
    logger.debug('Finished updating unfurls on all mentions in update unfurls job!');
  } catch (error) {
    logger.error(error)
  }
}

export default updateUnfurlsJob;
