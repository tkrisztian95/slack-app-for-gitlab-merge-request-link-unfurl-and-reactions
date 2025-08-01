import logger from "../utils/logger.js";
import { MergeRequestSlackMention } from "../data/mention.js";
import { fetchMessage } from "../slack/index.js";
import { fetchMergeRequestDetails } from "../gitlab/index.js";
import { addOrUpdateUnfurlOnMessagePostedInChannel } from "../slack/unfurl/index.js";
import { MessageElement } from '@slack/web-api/dist/types/response/ConversationsHistoryResponse.js';


function hasUnfurlLinkAttachment(message: MessageElement | undefined, link: string): boolean {
  if (message?.attachments) {
    return message.attachments.some((attachment) => { return attachment.is_app_unfurl && attachment.app_unfurl_url === link })
  }
  return false;
}

export const updateUnfurlLink = (mention: MergeRequestSlackMention) => {
  try {

    if (!mention.linkUnfurled) {
      return;
    }

    fetchMessage(mention.slackMessageChannel, mention.slackMessageTimeStamp)
      .then((message) => {
        if (hasUnfurlLinkAttachment(message, mention.mergeRequestLink)) {
          // Update attachment if not removed
          fetchMergeRequestDetails(encodeURIComponent(mention.mergeRequestProjectPath), mention.mergeRequestId)
            .then((mergeRequestDetails) => {
              if (mergeRequestDetails) {
                addOrUpdateUnfurlOnMessagePostedInChannel(mention.slackMessageTimeStamp, mention.slackMessageChannel, mention.mergeRequestLink, mergeRequestDetails);
              }
            });
        } else {
          logger.debug('Skip update merge request unfurl link in message because attachment not found!');
        }
      });
  } catch (error) {
    logger.error(error)
  }
}