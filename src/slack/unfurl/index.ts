import logger from '../../utils/logger.js';
import app from '../index.js';

import { MergeRequestDetails } from '../../gitlab/index.js';

import type { ChatUnfurlArguments } from '@slack/web-api';
import * as dataStore from '../../data/index.js';

const humanReadableStatus = (detailed_merge_status: string, state: string): string => {

  if (state === 'merged') {
    return 'Merged :tada:'
  }

  if (state === 'closed') {
    return 'Closed (the changes were not merged) :octagonal_sign:'
  }

  switch (detailed_merge_status) {
    case 'conflict':
      return 'Conflict - _Cannot be merged until conflicts resolved._';
    case 'draft_status':
      return 'Draft - _Cannot be merged until marked ready._';
    case 'checking':
      return '_GitLab is checking if merge request can be merged..._';
    case 'approvals_syncing':
      return '_GitLab is checking if merge request can be merged..._';
    case 'mergeable':
      return 'Ready to merge!';
    case 'ci_still_running':
      return '_GitLab CI pipeline is still running..._';
    case 'ci_must_pass':
      return '_Merge blocked: Pipeline must succeed._';
    case 'not_approved':
      return 'Requires approval!';
    case 'requested_changes':
      return '_The change requests must be completed or resolved._'
    default:
      return detailed_merge_status;
  }
}

export const addUnfurlOnMessageInComposer = async (unfurl_id: string, link_url: string, mergeRequestTitle: string) => {
  const data: ChatUnfurlArguments = {
    source: 'composer',
    unfurl_id: unfurl_id,
    unfurls: {},
  };
  data.unfurls[link_url] = {
    blocks: [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `<${link_url}|${mergeRequestTitle}>`,
        },
        accessory: {
          type: 'image',
          image_url: 'https://about.gitlab.com/images/press/logo/png/gitlab-logo-500.png',
          alt_text: 'GitLab logo',
        },
      },
    ],
  };

  await app.client.chat.unfurl(data);
}

export const addOrUpdateUnfurlOnMessagePostedInChannel = async (messageTs: string, channel: string, link: string, mrObj: MergeRequestDetails) => {
  logger.debug('addOrUpdateUnfurlOnMessage');
  try {
    const data: ChatUnfurlArguments = {
      ts: messageTs,
      channel: channel,
      unfurls: {},
    };
    // https://api.slack.com/block-kit/building
    data.unfurls[link] = {
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `:merge-request: *<${link}|${mrObj.title}>*`,
          },
        },
        /*
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Description*:\n ${mrObj.description.substring(0, 500)}`,
        },
      },
      */
        {
          'type': 'section',
          'accessory': {
            type: 'image',
            image_url: 'https://about.gitlab.com/images/press/logo/png/gitlab-logo-500.png',
            alt_text: 'GitLab logo',
          },
          'fields': [
            {
              'type': 'mrkdwn',
              'text': `*Assignee* :technologist:\n ${mrObj.assignees.length === 0 ? ':exclamation: None - _the author (' + mrObj.author.username + ') of this merge request should set the responsible person(s) for e.g. developing the code, merging the MR)._' : mrObj.assignees.length > 1 ? mrObj.assignees[0].username + ' (+' + (mrObj.assignees.length - 1) + ')' : mrObj.assignees[0].username}`,
            },
            {
              'type': 'mrkdwn',
              'text': `*Changes* :ocean:\n ${mrObj.changes_count}`,
            },
            {
              'type': 'mrkdwn',
              'text': `*Reviewers* :eyes:\n ${mrObj.reviewers.length === 0 ? ':exclamation: None - _assign yourself with the :eyes: reaction to participate in giving peer review._' : mrObj.reviewers.length > 1 ? mrObj.reviewers[0].username + ' (+' + (mrObj.reviewers.length - 1) + ')' : mrObj.reviewers[0].username}`,
            },
            {
              'type': 'mrkdwn',
              'text': `*Status* :vertical_traffic_light:\n ${humanReadableStatus(mrObj.detailed_merge_status, mrObj.state)}`,
            },
          ],
        },
      ],
    };
    await app.client.chat.unfurl(data).then(async (res) => {
      if (res.ok) {
        const mention = await dataStore.findMentionByMessage(messageTs);
        if (mention) {
          if (!mention.linkUnfurled) {
            mention.linkUnfurled = true;
            mention.linkUnfurlAddedAt = new Date();
          } else {
            mention.linkUnfurlUpdatedAt = new Date();
          }
          mention.save();
        }
      }
    });
  } catch (e) {
    logger.error(e, 'Error unfurling link ' + link + ' in message ' + messageTs);
  }
};

export default { addOrUpdateUnfurlOnMessage: addOrUpdateUnfurlOnMessagePostedInChannel, addUnfurlInComposer: addUnfurlOnMessageInComposer };