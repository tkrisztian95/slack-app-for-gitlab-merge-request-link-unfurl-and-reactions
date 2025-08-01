
import logger from "../../../utils/logger.js";
import type { AllMiddlewareArgs, SlackShortcutMiddlewareArgs, MessageShortcut } from '@slack/bolt';

import * as dataStore from '../../../data/index.js';
import { updateUnfurlLink } from "../../../services/mentions-service.js";


const shortcutUpdateUnfurlLinkCallback = async ({ shortcut, ack }: AllMiddlewareArgs & SlackShortcutMiddlewareArgs<MessageShortcut>) => {
  try {
    // Acknowledge shortcut request
    await ack();

    const mention = await dataStore.findMentionByMessage(shortcut.message_ts);

    if (mention) {
      updateUnfurlLink(mention);
    }
  }
  catch (error) {
    logger.error(error);
  }
}

export default shortcutUpdateUnfurlLinkCallback;