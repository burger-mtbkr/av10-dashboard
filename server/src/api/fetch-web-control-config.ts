import { parseStringPromise } from 'xml2js';
import { httpGet } from './http-get.js';

const WEB_CONTROL_PORT = 11080;

export const fetchWebControlConfig = async (host: string, path: string, type: number) => {
  const xml = await httpGet(host, WEB_CONTROL_PORT, `${path}?type=${type}`);
  return parseStringPromise(xml, { explicitArray: false });
};