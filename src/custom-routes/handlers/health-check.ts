import type { ParamsIncomingMessage } from '@slack/bolt/dist/receivers/ParamsIncomingMessage.d.ts';
import type { ServerResponse } from 'node:http';

const healthCheckHandler = async (req: ParamsIncomingMessage, res: ServerResponse) => {
  res.writeHead(200);
  res.end('OK');
}

export default healthCheckHandler;