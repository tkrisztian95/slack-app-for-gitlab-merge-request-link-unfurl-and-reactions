import type { App } from '@slack/bolt';
import actions from './actions/index.js';
import events from './events/index.js';
import shortcuts from './shortcuts/index.js';

const registerListeners = (app: App) => {
  actions.register(app);
  events.register(app);
  shortcuts.register(app);
};

export default registerListeners;