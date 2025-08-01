import type { App, InteractiveButtonClick } from '@slack/bolt';

import selectDefaultAppBehaviourAutoAssignAsReviewerButtonClickedCallback from './select-app-behaviour-reviewer.js';
import selectDefaultAppBehaviourAutoAssignAsAssigneeButtonClickedCallback from './select-app-behaviour-assignee.js'


const register = (app: App) => {
  app.action<InteractiveButtonClick>({ callback_id: 'select_default_app_behaviour_reviewer' }, selectDefaultAppBehaviourAutoAssignAsReviewerButtonClickedCallback)
  app.action<InteractiveButtonClick>({ callback_id: 'select_default_app_behaviour_assignee' }, selectDefaultAppBehaviourAutoAssignAsAssigneeButtonClickedCallback)
};

export default { register };