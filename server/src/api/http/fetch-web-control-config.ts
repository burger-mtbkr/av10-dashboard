import { parseStringPromise } from 'xml2js';
import { httpGet } from './get.js';

const WEB_CONTROL_PORT = 11080;

export const fetchWebControlConfig = async (host: string, path: string, type?: number) => {
  const requestPath = typeof type === 'number' ? `${path}?type=${type}` : path;
  const xml = await httpGet(host, WEB_CONTROL_PORT, requestPath);
  return parseStringPromise(xml, { explicitArray: false });
};
