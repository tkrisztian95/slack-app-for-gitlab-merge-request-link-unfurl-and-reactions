import type { AllMiddlewareArgs, InteractiveButtonClick, SlackActionMiddlewareArgs } from '@slack/bolt';
import * as datastore from '../../../data/index.js';

// Your middleware will be called every time an interactive component with the action_id “approve_button” is triggered
const selectDefaultAppBehaviourAutoAssignAsAssigneeButtonClickedCallback = async ({
  body,
  ack,
  respond,
  logger
}: AllMiddlewareArgs & SlackActionMiddlewareArgs<InteractiveButtonClick>) => {
  logger.debug('Recieved action select_default_app_behaviour_assignee');
  // Acknowledge action request
  await ack();
  // Find the user
  const user = await datastore.findUser(body.user.id);
  if (!user) {
    throw new Error(`Cannot set preferred auto assign as assignee behaviour for user because the user with slack user id ${body.user.id} not exists!`);
  }
  const value = body.actions[0].value;
  if (value === 'auto') {
    user.autoAssignAsAssignee = true;
    user.save();
    // Acknowledge action request
    await respond({
      'response_type': 'ephemeral',
      'text': `The default behaviour has been set to auto assign you as *Assignee * whenever you post a merge request link in a message that has no assignee, but you are the author of it!`,
      'replace_original': true,
      'delete_original': true,
    });
  } else if (value === 'never') {
    // should ignore reactions from this user from now on
    user.autoAssignAsAssignee = false;
    user.save();
    logger.debug(`User ${body.user.id} requested to never assign automatically as assignee!`);
    await respond({
      'response_type': 'ephemeral',
      'text': `The default behaviour has been set to * never * assign you automatically as assignee! Sorry for bothering you.`,
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
    logger.warn(`Not supported callback 'select_default_app_behaviour_assignee' action value '${value}'!`);
  }
};

export default selectDefaultAppBehaviourAutoAssignAsAssigneeButtonClickedCallback;