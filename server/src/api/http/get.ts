import { receiverHttpClient, toHttpRequestError } from './client.js';

export const httpGet = async (host: string, port: number, path: string): Promise<string> => {
  try {
    const response = await receiverHttpClient.get<string>(`http://${host}:${port}${path}`);
    return response.data;
  } catch (error) {
    throw toHttpRequestError(error);
  }
};
