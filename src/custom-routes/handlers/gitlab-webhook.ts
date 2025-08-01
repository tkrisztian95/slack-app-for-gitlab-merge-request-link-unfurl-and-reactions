import type { ParamsIncomingMessage } from '@slack/bolt/dist/receivers/ParamsIncomingMessage.d.ts';
import type { ServerResponse } from 'node:http';


import getRawBody from 'raw-body';
import logger from '../../utils/logger.js';

import config from '../../config.json' with { type: "json" };
import app from '../../slack/index.js';

import * as GL from '../../gitlab/index.js'
import * as dataStore from '../../data/index.js';
import { updateUnfurlLink } from '../../services/mentions-service.js';

const gitlabWebhookHandler = async (req: ParamsIncomingMessage, res: ServerResponse) => {
  try {

    if (!config.gitlabWebhooks.enabled) {
      res.writeHead(404);
      res.end();
      return; // Skip, this feature is not enabled
    }

    logger.debug('Processing request in gitlabWebhookHandler...');

    if (typeof process.env.X_GITLAB_TOKEN !== 'undefined' && process.env.X_GITLAB_TOKEN !== '') {
      logger.debug('Validating value in X-GitLab-Token header...');
      if (req.headers['x-gitlab-token'] !== process.env.X_GITLAB_TOKEN) {
        logger.debug('Authorization issue! Provided value in X-GitLab-Token header is invalid!');
        res.writeHead(401);
        res.end();
        return;
      }
    }

    const contentType = req.headers['content-type'];
    if (contentType !== 'application/json') {
      logger.debug('Not a request with content-type application/json!');
      res.writeHead(400);
      res.end();
      return;
    }

    if (req.headers['x-gitlab-instance'] !== 'https://gitlab.com') {
      logger.warn(`Received webhook but it's not from GitLab! Header X-Gitlab-Instance is missing!`, {
        receivedHeaders: req.headers,
      });
      logger.debug('Not from GitLab instance!');
      res.writeHead(400);
      res.end();
      return;
    }

    if (req.headers['x-gitlab-event'] !== 'Merge Request Hook') {
      logger.warn(`Received webhook from GitLab with event type '%s', but 'Merge Request Hook' type event is expected in header 'X-Gitlab-Event'!`, req.headers['x-gitlab-event']);
      logger.debug('Not a merge request type hook!');
      res.writeHead(400);
      res.end();
      return;
    }

    logger.debug('Reading the raw request body from the hook...');
    const rawBody = await getRawBody(req);

    logger.debug('Returning status code 200 to the hook..');
    res.writeHead(200);
    res.end();

    logger.debug('Extracting the eventUUID from the x-gitlab-event-uuid header');
    const eventUUID = req.headers['x-gitlab-event-uuid'];

    logger.debug(`Parsing the raw request body from the hook with event uuid ${eventUUID}...`);
    const body: GL.MergeRequestHook = JSON.parse(rawBody.toString());
    logger.debug(`Parsed request body:\n\t ${JSON.stringify(body)}`);

    // "object_kind": "merge_request", "event_type": "merge_request",
    if (body['object_kind'] !== 'merge_request' && body['event_type'] !== 'merge_request') {
      logger.debug(`Skip processing webhook with event uuid '${eventUUID}' from GitLab because it's not merge request related hook! Object kind is '${body['object_kind']}' and event type is '${body['event_type']}'!`);
      return;
    }

    const mrIID = body.object_attributes.iid;
    const projectPathWithNamespace = body.project.path_with_namespace;

    const mentionesArr = await dataStore.findAllMentionsOfMergeRequest(mrIID, projectPathWithNamespace);

    if (!mentionesArr || mentionesArr.length === 0) {
      logger.debug(`Skipping webhook for merge request ${mrIID} from project ${projectPathWithNamespace}. It was not mentioned in any Slack message! `);
      return;
    }

    if (mentionesArr.length > 1) {
      logger.debug(`Webhook for merge request ${mrIID} from project ${projectPathWithNamespace} was mentioned in more than one Slack message! `);
    }

    const handleErrorOnReactionAddOrRemove = (reason: unknown) => {
      logger.error(reason, 'Unexpected error during adding/removing reaction on merge request action');
    };

    mentionesArr.forEach(mention => {

      if (config.channelsOnly.length > 0 && !(config.channelsOnly as Array<string>).includes(mention.slackMessageChannel)) {
        logger.debug(`Skip processing webhook its not enabled for channel ${mention.slackMessageChannel}!`)
        return; // Skip, not processing this event for the channel
      }

      const action = body.object_attributes.action;
      switch (action) {
        case 'approved':
          logger.debug('MR has been approved webhook');

          if (config.gitlabWebhooks.mergeRequest.addReactions) {
            // Add reaction to the message mentioning this MR
            app.client.reactions.add({
              name: config.gitlabWebhooks.mergeRequest.useReactions.onApproved,
              channel: mention.slackMessageChannel,
              timestamp: mention.slackMessageTimeStamp,
              token: process.env.SLACK_BOT_TOKEN,
            }).catch(handleErrorOnReactionAddOrRemove)
              .then(() => {
                logger.debug(`Added an approved reaction to message ${mention.slackMessageTimeStamp} in channel ${mention.slackMessageChannel}`);
              });
          }
          break;
        case 'unapproved':
          logger.debug('MR has been unapproved webhook');

          if (config.gitlabWebhooks.mergeRequest.addReactions) {
            // Remove approved reaction from message
            app.client.reactions.remove({
              name: config.gitlabWebhooks.mergeRequest.useReactions.onApproved,
              channel: mention.slackMessageChannel,
              timestamp: mention.slackMessageTimeStamp,
              token: process.env.SLACK_BOT_TOKEN,
            }).catch(handleErrorOnReactionAddOrRemove)
              .then(() => {
                logger.debug(`Removed an approved reaction from message ${mention.slackMessageTimeStamp} in channel ${mention.slackMessageChannel}`);
              });
          }
          break;
        case 'merge':
          logger.debug('MR has been merged webhook');

          if (config.gitlabWebhooks.mergeRequest.addReactions) {
            // Add reaction to the message mentioning this MR
            app.client.reactions.add({
              name: config.gitlabWebhooks.mergeRequest.useReactions.onMerged,
              channel: mention.slackMessageChannel,
              timestamp: mention.slackMessageTimeStamp,
              token: process.env.SLACK_BOT_TOKEN,
            }).catch(handleErrorOnReactionAddOrRemove)
              .then(() => {
                logger.debug(`Added an on merged reaction to message ${mention.slackMessageTimeStamp} in channel ${mention.slackMessageChannel}`);
              });
          }
          break;
        case 'close':
          logger.debug('MR has been closed webhook');

          if (config.gitlabWebhooks.mergeRequest.addReactions) {
            // Add reaction to the message mentioning this MR
            app.client.reactions.add({
              name: config.gitlabWebhooks.mergeRequest.useReactions.onClosed,
              channel: mention.slackMessageChannel,
              timestamp: mention.slackMessageTimeStamp,
              token: process.env.SLACK_BOT_TOKEN,
            }).catch(handleErrorOnReactionAddOrRemove)
              .then(() => {
                logger.debug(`Added an on closed reaction to message ${mention.slackMessageTimeStamp} in channel ${mention.slackMessageChannel}`);
              });
          }
          break;
        case 'reopen':
          logger.debug('MR has been re-opened webhook');

          if (config.gitlabWebhooks.mergeRequest.addReactions) {
            // Remove on closed reaction from the message mentioning this MR
            app.client.reactions.remove({
              name: config.gitlabWebhooks.mergeRequest.useReactions.onClosed,
              channel: mention.slackMessageChannel,
              timestamp: mention.slackMessageTimeStamp,
              token: process.env.SLACK_BOT_TOKEN,
            }).catch(handleErrorOnReactionAddOrRemove)
              .then(() => {
                logger.debug(`Removed an on closed reaction due to reopening from message ${mention.slackMessageTimeStamp} in channel ${mention.slackMessageChannel}`);
              });
          }
          break;
        case 'update':
          {
            logger.debug('MR has been updated webhook');
            if (body['changes'].reviewers) {
              logger.debug('Reviewers has been updated');
            }
            break;
          }
        default:
          logger.warn(`Unsupported merge request update action '${action}'. No reactions will be added or removed...`);
      }

      if (config.gitlabWebhooks.mergeRequest.updateUnfurls) {
        logger.debug('Updating merge request link unfurl in message from webhook');
        updateUnfurlLink(mention);
      }

    });

  } catch (error) {
    logger.error('Error occured in gitlabWebhookHandler', error);
  }
};

export default gitlabWebhookHandler;