import http from 'http';

export const httpPostXml = async (
  host: string,
  port: number,
  path: string,
  body: string,
): Promise<string> => {
  return await new Promise<string>((resolve, reject) => {
    const req = http.request(
      {
        host,
        port,
        path,
        method: 'POST',
        headers: {
          'Content-Type': 'text/xml',
          'Content-Length': Buffer.byteLength(body),
        },
        timeout: 5000,
      },
      (response) => {
        let data = '';
        response.setEncoding('utf-8');
        response.on('data', (chunk) => {
          data += chunk;
        });
        response.on('end', () => {
          resolve(data);
        });
        response.on('error', reject);
      },
    );

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('HTTP request timeout'));
    });
    req.write(body);
    req.end();
  });
};