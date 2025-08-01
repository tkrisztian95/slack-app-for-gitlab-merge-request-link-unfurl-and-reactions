
import logger from '../utils/logger.js'
import { GitLabUser, findProjectMemberByUsername } from '../gitlab/index.js'
import * as Slack from '../slack/index.js'

import { SlackAppUser } from '../data/user.js'
import * as dataStore from '../data/index.js'

export const createUser = async (slackUserId: string, gitlabProjectPath: string) => {

  const slackUser = await Slack.fetchUser(slackUserId);

  if (!slackUser) {
    throw new Error(`User ${slackUserId} in slack not found!`);
  }

  const slackUserName = slackUser.name;

  if (!slackUserName) {
    throw new Error(`User ${slackUserId} in slack has no username!`);
  }

  // Try finding the reaction submitter user's GitLab user ID by it's slack username
  const gitlabUser = await findProjectMemberByUsername(
    gitlabProjectPath,
    slackUserName);

  if (!gitlabUser) {
    throw new Error(`Cannot create user for the slack user with ${slackUserId} without a GitLab user!`);
  }

  const appUser: SlackAppUser = {
    id: slackUserId,
    username: slackUserName,
    createdAt: new Date(),
    gitlabUser: gitlabUser
  };

  return dataStore.createUser(appUser)
    .then((saved) => {
      logger.debug(`User created successfully for slack user ${slackUserId} with username`);
      return saved;
    });
}

export const getUser = async (slackUserId: string) => {
  return dataStore.findUser(slackUserId);
}

export const getGitLabUser = async (slackUserId: string): Promise<GitLabUser | undefined> => {
  return (await getUser(slackUserId))?.gitlabUser;
}