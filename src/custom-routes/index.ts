import gitlabWebhookHandler from './handlers/gitlab-webhook.js';
import healthCheckHandler from './handlers/health-check.js';

import type { CustomRoute } from '@slack/bolt';

export const healthCheckCustomRoute: CustomRoute = {
  path: '/health-check',
  method: ['GET'],
  handler: healthCheckHandler,
}

export const gitlabWebhooksCustomRoute: CustomRoute = {
  path: '/gitlab/webhooks',
  method: ['POST'],
  handler: gitlabWebhookHandler,
}

export default { healthCheckCustomRoute, gitlabWebhooksCustomRoute };