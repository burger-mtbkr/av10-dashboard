import * as net from 'net';

const HEOS_PORT = 1255;

/**
 * HEOS CLI uses a raw TCP socket protocol (not HTTP).
 * Keep this isolated under api/heos so REST/http modules stay clearly separated.
 */
export const heosCommand = async (host: string, command: string, timeout = 5000): Promise<unknown> => {
  const response = await new Promise<string | null>((resolve, reject) => {
    const socket = net.createConnection(HEOS_PORT, host);
    let buffer = '';
    const timer = setTimeout(() => {
      socket.destroy();
      reject(new Error('HEOS command timeout'));
    }, timeout);

    socket.setEncoding('utf-8');
    socket.on('connect', () => {
      socket.write(`${command}\r\n`);
    });
    socket.on('data', (chunk: string) => {
      buffer += chunk;
      if (!buffer.includes('\r\n')) {
        return;
      }

      clearTimeout(timer);
      socket.destroy();
      resolve(buffer.trim());
    });
    socket.on('error', (error) => {
      clearTimeout(timer);
      socket.destroy();
      reject(error);
    });
  });

  if (!response) {
    return null;
  }

  try {
    return JSON.parse(response);
  } catch {
    return null;
  }
};
