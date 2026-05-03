import { parseStringPromise } from 'xml2js';
import { httpGet } from './get.js';

export const fetchMainZoneStatus = async (host: string, port: number) => {
  const xml = await httpGet(host, port, '/goform/formMainZone_MainZoneXmlStatus.xml');
  return parseStringPromise(xml, { explicitArray: false });
};
