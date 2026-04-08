import { parseStringPromise } from 'xml2js';
import type { IAppCommand0300Request } from './types.js';
import { httpPostXml } from './http-post-xml.js';

export const fetchAppCommand0300 = async (
  host: string,
  port: number,
  commands: IAppCommand0300Request[],
) => {
  const commandXml = commands
    .map(({ name, params }) => {
      const paramsXml = params.map((param) => `<param name="${param}"></param>`).join('');
      return `<cmd id="3"><name>${name}</name><list>${paramsXml}</list></cmd>`;
    })
    .join('');
  const body = `<?xml version="1.0" encoding="utf-8"?><tx>${commandXml}</tx>`;
  const xml = await httpPostXml(host, port, '/goform/AppCommand0300.xml', body);
  return parseStringPromise(xml, { explicitArray: false });
};