import * as net from 'net';

const HEOS_PORT = 1255;

export const heosCommand = async (host: string, command: string, timeout = 5000): Promise<unknown> => {
  return await new Promise<unknown>((resolve, reject) => {
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

      try {
        resolve(JSON.parse(buffer.trim()));
      } catch {
        resolve(null);
      }
    });
    socket.on('error', (error) => {
      clearTimeout(timer);
      socket.destroy();
      reject(error);
    });
  });
};