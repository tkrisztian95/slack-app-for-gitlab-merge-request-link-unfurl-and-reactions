import type { AllMiddlewareArgs, InteractiveButtonClick, SlackActionMiddlewareArgs } from '@slack/bolt';
import * as datastore from '../../../data/index.js';
import config from '../../../config.json' with { type: "json" };

// Your middleware will be called every time an interactive component with the action_id “approve_button” is triggered
const selectDefaultAppBehaviourAutoAssignAsReviewerButtonClickedCallback = async ({
  body,
  ack,
  respond,
  logger
}: AllMiddlewareArgs & SlackActionMiddlewareArgs<InteractiveButtonClick>) => {
  logger.debug('Recieved action select_default_app_behaviour_reviewer');
  // Acknowledge action request
  await ack();
  // Find the user
  const user = await datastore.findUser(body.user.id);
  if (!user) {
    throw new Error(`Cannot set preferred auto assign as reviewer behaviour for user because the user with slack user id ${body.user.id} not exists!`);
  }
  const value = body.actions[0].value;
  if (value === 'auto') {
    user.autoAssignAsReviewer = true;
    user.save();
    // Acknowledge action request
    await respond({
      'response_type': 'ephemeral',
      'text': `The default behaviour has been set to auto assign you as *Reviewer* whenever you react with :${config.onReactionAdded.assignReviewer.reaction}: on a message containing a merge request link in GitLab! 👍`,
      'replace_original': true,
      'delete_original': true,
    });
  } else if (value === 'never') {
    // should ignore reactions from this user from now on
    user.autoAssignAsReviewer = false;
    user.save();
    logger.debug(`User ${body.user.id} requested to never assign automatically as reviewer!`);
    await respond({
      'response_type': 'ephemeral',
      'text': `The default behaviour has been set to *never* assign you automatically as reviewer! Sorry for bothering you.`,
      'replace_original': true,
      'delete_original': true,
    });
  } else if (value === 'ask_later') {
    // do nothing just ack
    await respond({
      'response_type': 'ephemeral',
      'text': ``,
      'replace_original': false,
      'delete_original': true,
    });
  } else {
    logger.warn(`Not supported callback 'select_default_app_behaviour_reviewer' action value '${value}' !`);
  }
};

export default selectDefaultAppBehaviourAutoAssignAsReviewerButtonClickedCallback;