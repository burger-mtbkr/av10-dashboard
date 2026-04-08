import http from 'http';

export const httpGet = async (host: string, port: number, path: string): Promise<string> => {
  return await new Promise<string>((resolve, reject) => {
    const req = http.request({ host, port, path, method: 'GET', timeout: 5000 }, (response) => {
      let body = '';
      response.setEncoding('utf-8');
      response.on('data', (chunk) => {
        body += chunk;
      });
      response.on('end', () => {
        resolve(body);
      });
      response.on('error', reject);
    });

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('HTTP request timeout'));
    });
    req.end();
  });
};