import logger from '../../../utils/logger.js';
import config from '../../../config.json' with { type: "json" };
import * as datastore from '../../../data/index.js';
import * as GL from '../../../gitlab/index.js';

import * as userService from '../../../services/user-service.js';

import type { AllMiddlewareArgs, SlackEventMiddlewareArgs } from '@slack/bolt';

// Thanks for reactions
// subscribe to 'reaction_removed' event in your App config
// need reactions:read scope
const reactionRemovedCallback = async ({
  event
}: AllMiddlewareArgs & SlackEventMiddlewareArgs<'reaction_removed'>) => {
  logger.debug(event, 'Recieved event reaction_removed');
  try {

    if (!config.onReactionRemoved.unassignReviewer.enabled) {
      return; // Skip, this feature is not enabled
    }

    if (event.reaction !== config.onReactionRemoved.unassignReviewer.reaction) {
      return // Skip, this is not the reaction we are looking for
    }

    if (config.channelsOnly.length > 0 && !(config.channelsOnly as Array<string>).includes(event.item.channel)) {
      logger.debug(`Skip processing reaction removed event because its not enabled for channel ${event.item.channel}!`)
      return // Skip, not processing this event for the channel
    }

    // Fetch message using a channel ID and message TS
    const ts = event.item.ts;
    // const message = await fetchMessage(event.item.channel, ts);

    // Find MR details among messages listened
    const mergeRequestMention = await datastore.findMentionByMessage(ts);

    if (mergeRequestMention) {

      let appUser = await userService.getUser(event.user);
      if (!appUser) {
        appUser = await userService.createUser(event.user, encodeURIComponent(mergeRequestMention.mergeRequestProjectPath));
      }

      if (appUser) {

        // Does the user requested to never assign automatically?
        if (appUser.autoAssignAsReviewer === false) {
          logger.debug(`Skip processing reaction removed event because ${event.user} user asked for never assign as reviewer!`)
          return; // do nothing
        }

        // Unassign from the reviewers
        await GL.unassignFromReviewers(
          encodeURIComponent(mergeRequestMention.mergeRequestProjectPath),
          mergeRequestMention.mergeRequestId,
          appUser.gitlabUser.id,
        ).then((success) => {
          if (success) {
            /*
                  client.chat.postMessage({
                    channel: event.user,
                    text: `Unassigned you from merge request reviewers `,
                    attachments: [
                      {
                        text: mergeRequestMention.mergeRequestLink,
                      },
                    ],
                  });
            */
          }
        });
      }
    }

  } catch (error) {
    logger.error(error);
  }
};

export default reactionRemovedCallback;