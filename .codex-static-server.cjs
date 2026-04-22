const http = require('http');
const fs = require('fs');
const path = require('path');
const root = path.resolve('storybook-static');
const mime = new Map([
  ['.html', 'text/html; charset=utf-8'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.css', 'text/css; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.svg', 'image/svg+xml'],
  ['.png', 'image/png'],
  ['.jpg', 'image/jpeg'],
  ['.jpeg', 'image/jpeg'],
  ['.woff', 'font/woff'],
  ['.woff2', 'font/woff2'],
]);
http.createServer((req, res) => {
  const url = new URL(req.url || '/', 'http://localhost');
  const requestPath = decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname);
  const filePath = path.join(root, requestPath);
  const normalized = path.normalize(filePath);
  if (!normalized.startsWith(root)) {
    res.writeHead(403).end('Forbidden');
    return;
  }
  fs.readFile(normalized, (err, data) => {
    if (err) {
      res.writeHead(404).end('Not found');
      return;
    }
    res.writeHead(200, { 'Content-Type': mime.get(path.extname(normalized)) || 'application/octet-stream' });
    res.end(data);
  });
}).listen(6011, '127.0.0.1');
