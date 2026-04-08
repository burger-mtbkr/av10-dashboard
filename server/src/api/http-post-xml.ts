import { receiverHttpClient, toHttpRequestError } from './http-client.js';

export const httpPostXml = async (
  host: string,
  port: number,
  path: string,
  body: string,
): Promise<string> => {
  try {
    const response = await receiverHttpClient.post<string>(
      `http://${host}:${port}${path}`,
      body,
      {
        headers: {
          'Content-Type': 'text/xml',
        },
      },
    );
    return response.data;
  } catch (error) {
    throw toHttpRequestError(error);
  }
};