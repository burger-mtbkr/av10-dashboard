import axios from 'axios';

const REQUEST_TIMEOUT_MS = 5000;

export const receiverHttpClient = axios.create({
  timeout: REQUEST_TIMEOUT_MS,
  responseType: 'text',
});

export const toHttpRequestError = (error: unknown): Error => {
  if (axios.isAxiosError(error) && error.code === 'ECONNABORTED') {
    return new Error('HTTP request timeout');
  }

  if (error instanceof Error) {
    return error;
  }

  return new Error('HTTP request failed');
};