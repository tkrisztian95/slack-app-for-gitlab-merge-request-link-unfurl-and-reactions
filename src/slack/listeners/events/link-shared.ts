import logger from '../../../utils/logger.js';
import { extractMergeRequestAndProjectIdFromGitLabWebUrl } from '../../../utils/uri.js'

import config from '../../../config.json' with { type: "json" };

import type { AllMiddlewareArgs, SlackEventMiddlewareArgs } from '@slack/bolt';
import type { LinkSharedEvent, WebClient } from '@slack/web-api'

import * as GL from '../../../gitlab/index.js'
import * as userService from '../../../services/user-service.js'
import * as dataStore from '../../../data/index.js'

import { addOrUpdateUnfurlOnMessagePostedInChannel, addUnfurlOnMessageInComposer } from '../../unfurl/index.js';
import { MergeRequestSlackMention } from '../../../data/mention.js';
import { SlackAppUser } from '../../../data/user.js';

const assignAuthorAsAssigneeAsync = async (client: WebClient, event: LinkSharedEvent, mention: MergeRequestSlackMention, user: SlackAppUser) => {
  if (!config.onLinkShared.autoAssignAuthorAsAssignee) {
    return; // Skip, this feature is not enabled
  }

  if (user.autoAssignAsAssignee === false) {
    return; // Skip, because user dont want this
  }

  GL.fetchMergeRequestDetails(encodeURIComponent(mention.mergeRequestProjectPath), mention.mergeRequestId)
    .then((mergeRequestDetails) => {
      if (mergeRequestDetails && mergeRequestDetails.assignees.length === 0) {
        if (user.gitlabUser.id === mergeRequestDetails.author.id) {
          GL.assignAsAssignee(encodeURIComponent(mention.mergeRequestProjectPath), mention.mergeRequestId, user.gitlabUser.id)
            .then((success) => {
              if (success) {
                if (user.autoAssignAsAssignee === undefined) {
                  askUserForDefaultBehaviourAboutAutoAssignAsAssignee(client, event.channel, event.user);
                }
              }
            })
        }

      }
    }).catch((error) => {
      logger.error(error);
    });
}

const askUserForDefaultBehaviourAboutAutoAssignAsAssignee = (client: WebClient, channel: string, user: string) => {
  // Send message only visible for user
  // Ask: Do yo want to auto assign or never?
  client.chat.postEphemeral({
    channel: channel,
    user: user,
    text: `You have been automatically assigned as *Assignee* to the Merge Request that you shared in this channel because you are the author of the merge request.`,
    attachments: [
      {
        'text': 'Would you like to change the default behaviour of this?',
        'fallback': 'You are unable to choose a default behaviour',
        'callback_id': 'select_default_app_behaviour_assignee',
        'color': '#3AA3E3',
        'actions': [
          {
            'name': 'default',
            'text': 'Assign me (always)',
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
              'text': 'Please note that its recommended to choose someone who takes responsibility (e.g., developing the code; ensuring all review steps are followed, merging the MR). This is usually the author of the merge request. Are you sure to be *not* assigned as *Assignee* automatically if you share your own merge request link? ',
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

const unfurlMessageInChannelAsync = (client: WebClient, event: LinkSharedEvent, mention: MergeRequestSlackMention) => {
  if (!config.onLinkShared.unfurlLinkInMessages) {
    return; // Skip, this feature is not enabled
  }

  // Unfurl message with MR details
  // Async fetch more merge request details
  GL.fetchMergeRequestDetails(encodeURIComponent(mention.mergeRequestProjectPath), mention.mergeRequestId)
    .then((mergeRequestDetails) => {
      if (mergeRequestDetails) {
        addOrUpdateUnfurlOnMessagePostedInChannel(event.message_ts, event.channel, mention.mergeRequestLink, mergeRequestDetails);
      }
    }).catch((error) => {
      logger.error(error);
    });
}

const unfurlMessageInComposerAsync = (unfurl_id: string, link_url: string, mergeRequestProjectPathEncoded: string, mergeRequestId: string) => {
  if (!config.onLinkShared.unfrulLinkInComposer) {
    return; // Skip, this feature is not enabled
  }

  // Unfurl message with MR details
  // Async fetch more merge request details
  GL.fetchMergeRequestDetails(mergeRequestProjectPathEncoded, mergeRequestId)
    .then((mergeRequestDetails) => {
      if (mergeRequestDetails) {
        addUnfurlOnMessageInComposer(unfurl_id, link_url, mergeRequestDetails.title);
      }
    }).catch((error) => {
      logger.error(error);
    });
}

// Listens to a gitlab link posted on slack
// https://api.slack.com/reference/messaging/link-unfurling#setup
const linkSharedCallback = async ({
  event,
  client
}: AllMiddlewareArgs & SlackEventMiddlewareArgs<'link_shared'>) => {
  logger.debug(event, 'Recieved event link_shared');
  try {

    if (!event.unfurl_id) {
      // event.unfurl_id is undefined
      logger.debug(`Skip processing link shared event because event.unfurl_id is undefined!`)
      return;
    }

    if (config.channelsOnly.length > 0 && !(config.channelsOnly as Array<string>).includes(event.channel)) {
      logger.debug(` its not enabled for channel ${event.channel}!`)
      return; // Skip, not processing this event for the channel
    }

    if (event.links.length > 1) {
      logger.debug('Skip processing link shared event because there are more than one GitLab links found!');
      return; // Skip, more links
    }

    const link_url = event.links[0].url;
    const mrCompositKey = extractMergeRequestAndProjectIdFromGitLabWebUrl(link_url);

    if (!mrCompositKey) {
      // Not a merge request link
      return;
    }

    logger.debug('The link_shared event source is %s', event.source);

    if (event.source === 'composer') {
      unfurlMessageInComposerAsync(event.unfurl_id, link_url, mrCompositKey.mergeRequestProjectPathUriEncoded, mrCompositKey.mergeRequestID);
    } else {

      const mention: MergeRequestSlackMention = {
        createdAt: new Date(),
        mergeRequestId: mrCompositKey.mergeRequestID,
        mergeRequestLink: link_url,
        mergeRequestProjectPath: mrCompositKey.projectPath,
        slackMessageTimeStamp: event.message_ts,
        slackMessageChannel: event.channel,
      };
      await dataStore.createMention(mention);

      let appUser = await userService.getUser(event.user);
      if (!appUser) {
        appUser = await userService.createUser(event.user, encodeURIComponent(mention.mergeRequestProjectPath));
      }

      if (appUser) {
        assignAuthorAsAssigneeAsync(client, event, mention, appUser.toObject());
        unfurlMessageInChannelAsync(client, event, mention);
      }
    }
  } catch (error) {
    logger.error(error);
  }
};

export default linkSharedCallback;