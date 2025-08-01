import pkg from '@slack/bolt';
const { App, LogLevel } = pkg;

import logger from '../utils/logger.js';
import registerListeners from './listeners/index.js';
import { gitlabWebhooksCustomRoute, healthCheckCustomRoute } from '../custom-routes/index.js'
import { MessageElement } from '@slack/web-api/dist/types/response/ConversationsHistoryResponse.js';
import type { User } from '@slack/web-api/dist/types/response/UsersInfoResponse.js';

const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  appToken: process.env.SLACK_APP_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  socketMode: true,
  // Socket Mode doesn't listen on a port,
  // but in case you want your app to respond to OAuth,
  // you still need to listen on some port!
  port: Number(process.env.PORT) || 3000,
  customRoutes: [
    healthCheckCustomRoute,
    gitlabWebhooksCustomRoute,
  ],
  logLevel: LogLevel.INFO
});

// A more generic, global error handler
app.error(async (error) => {
  // Check the details of the error to handle cases where you should retry sending a message or stop the app
  console.error(error);
});

/** Register Listeners */
registerListeners(app);

// Fetch conversation history using the ID and a TS from the last example
export const fetchMessage = async (id: string, ts: string): Promise<MessageElement | undefined> => {
  try {
    // Call the conversations.history method using the built-in WebClient
    const result = await app.client.conversations.history({
      // The token you used to initialize your app
      token: process.env.SLACK_BOT_TOKEN,
      channel: id,
      // In a more realistic app, you may store ts data in a db
      latest: ts,
      // Limit results
      inclusive: true,
      limit: 1
    });

    if (!result.messages) {
      return
    }

    // There should only be one result (stored in the zeroth index)
    return result.messages[0];
  }
  catch (error) {
    logger.error(error);
  }
}

export const fetchUser = async (id: string): Promise<User | undefined> => {
  // need users:read.email scope
  // https://api.slack.com/methods/users.info#email-addresses
  const result = await app.client.users.info({
    user: id, //ID of the user who performed this event
    token: process.env.SLACK_BOT_TOKEN,
  });

  if (!result.ok) {
    throw new Error(`Cannot find Slack User by user id. Error ${result.error}`);
  }

  return result.user
}

export default app;