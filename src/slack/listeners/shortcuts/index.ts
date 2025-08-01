import type { App } from '@slack/bolt';
import shortcutUpdateUnfurlLinkCallback from './update-unfurl-link.js'

const register = (app: App) => {
  app.shortcut('msg_shortcut_update_mr_link_unfurl', shortcutUpdateUnfurlLinkCallback);
};

export default { register };