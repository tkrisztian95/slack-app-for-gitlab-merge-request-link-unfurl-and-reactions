import type { App } from '@slack/bolt';
import reactionAddedCallback from './reaction-added.js';
import linkSharedCallback from './link-shared.js';
import reactionRemovedCallback from './reaction-removed.js';

const register = (app: App) => {
  app.event('link_shared', linkSharedCallback); //Merge Request is mentioned
  app.event('reaction_added', reactionAddedCallback); //Assign reviewer
  app.event('reaction_removed', reactionRemovedCallback); //Unassign reviewer
};

export default { register };