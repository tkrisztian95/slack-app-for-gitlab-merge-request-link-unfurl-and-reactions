import logger from '../../../utils/logger.js';
import config from '../../../config.json' with { type: "json" };
import * as datastore from '../../../data/index.js';
import * as GL from '../../../gitlab/index.js'

import * as userService from '../../../services/user-service.js';

import type { AllMiddlewareArgs, SlackEventMiddlewareArgs } from '@slack/bolt';

import type { ReactionAddedEvent, WebClient } from '@slack/web-api'

const askUser = (client: WebClient, event: ReactionAddedEvent) => {
  client.chat.postEphemeral({
    channel: event.item.channel,
    user: event.user,
    text: `You have been automatically assigned as *Reviewer* to the Merge Request in this channel with your :${event.reaction}: reaction.`,
    attachments: [
      {
        'text': 'Would you like to change the default behaviour of this?',
        'fallback': 'You are unable to choose a default behaviour',
        'callback_id': 'select_default_app_behaviour_reviewer',
        'color': '#3AA3E3',
        'actions': [
          {
            'name': 'default',
            'text': 'Assign me on :eyes: reaction (always)',
            'type': 'button',
            'style': 'primary',
            'value': 'auto',
          },
          {
            'name': 'default',
            'text': 'Do nothing (never assign me)',
            'type': 'button',
            'style': 'danger',
            'value': 'never',
            'confirm': {
              'title': 'Are you sure?',
              'text': 'Wouldn\'t you prefer a to be assigned as reviewer automatically?',
              'ok_text': 'Yes',
              'dismiss_text': 'No',
            },
          },
          {
            'name': 'default',
            'text': 'Ask me later',
            'type': 'button',
            'value': 'ask_later',
          },
        ],
      },
    ],
  });
}

// Thanks for reactions
// subscribe to 'reaction_added' event in your App config
// need reactions:read scope
const reactionAddedCallback = async ({
  event,
  client
}: AllMiddlewareArgs & SlackEventMiddlewareArgs<'reaction_added'>) => {
  logger.debug(event, 'Recieved event reaction_added');
  try {

    if (!config.onReactionAdded.assignReviewer.enabled) {
      return; // Skip, this feature is not enabled
    }

    if (event.reaction !== config.onReactionAdded.assignReviewer.reaction) {
      return // Skip, this is not the reaction we are looking for
    }

    if (config.channelsOnly.length > 0 && !(config.channelsOnly as Array<string>).includes(event.item.channel)) {
      logger.debug(`Skip processing reaction added event because its not enabled for channel ${event.item.channel}!`)
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

      // Does the user requested to never assign automatically?
      if (appUser.autoAssignAsReviewer === false) {
        logger.debug(`Skip processing reaction added event because ${event.user} user asked for never assign!`)
        return; // do nothing
      }

      if (!appUser) {
        logger.warn(`Skip assigning user to reviewers! App used not exists for the Slack user with id ${event.user}!`);
        return;
      }

      // Assign to the reviewers
      await GL.assignAsReviewer(
        encodeURIComponent(mergeRequestMention.mergeRequestProjectPath),
        mergeRequestMention.mergeRequestId,
        appUser.gitlabUser.id,
      ).then((success) => {
        if (success) {
          // Send message only visible for user
          // Ask: Do yo want to auto assign or never?
          if (appUser.autoAssignAsReviewer === undefined) {
            askUser(client, event);
          }
          /*
          // Notfy user about success
          client.chat.postMessage({
            channel: event.user,
            text: `Assigned you to merge request reviewers`,
            attachments: [
              {
                text: mergeRequestMention.mergeRequestLink,
              },
            ],
          });
          */
        }
      });
    } else {
      logger.info(`Skip: Message '${ts}' not found in mentioning messages lookup`);
    }

  } catch (error) {
    logger.error(error);
  }
};

export default reactionAddedCallback;