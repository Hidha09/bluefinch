const http = require('http');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = __dirname;

const mimeTypes = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

const server = http.createServer((req, res) => {
  console.log(`${req.method} ${req.url}`);

  // Handle API PHP script execution if requested
  if (req.url.startsWith('/api/')) {
    const urlObj = new URL(req.url, `http://localhost:${PORT}`);
    const scriptPath = path.join(PUBLIC_DIR, urlObj.pathname);

    if (fs.existsSync(scriptPath) && scriptPath.endsWith('.php')) {
      // Collect request body
      let body = '';
      req.on('data', chunk => { body += chunk.toString(); });
      req.on('end', () => {
        // Execute PHP via CLI if installed
        const phpCmd = `php -f "${scriptPath}" -- "${urlObj.search}"`;
        exec(phpCmd, {
          env: {
            ...process.env,
            REQUEST_METHOD: req.method,
            QUERY_STRING: urlObj.search.replace('?', ''),
            CONTENT_TYPE: req.headers['content-type'] || '',
            HTTP_ACCEPT: req.headers['accept'] || ''
          }
        }, (error, stdout, stderr) => {
          if (!error && stdout) {
            // Strip PHP response headers if present
            const parts = stdout.split(/\r?\n\r?\n/);
            let responseBody = stdout;
            if (parts.length > 1 && (parts[0].toLowerCase().includes('content-type') || parts[0].toLowerCase().includes('http/'))) {
              responseBody = parts.slice(1).join('\n\n');
            }
            res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
            res.end(responseBody);
          } else {
            // Fallback response handled by client side API wrapper
            res.writeHead(404, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: false, message: 'PHP CLI execution unavailable locally. Client fallback active.' }));
          }
        });
      });
      return;
    }
  }

  // Serve static files
  let filePath = path.join(PUBLIC_DIR, req.url === '/' ? 'index.html' : req.url.split('?')[0]);
  const extname = String(path.extname(filePath)).toLowerCase();
  const contentType = mimeTypes[extname] || 'application/octet-stream';

  fs.readFile(filePath, (error, content) => {
    if (error) {
      if (error.code === 'ENOENT') {
        fs.readFile(path.join(PUBLIC_DIR, 'index.html'), (err, indexContent) => {
          if (err) {
            res.writeHead(500);
            res.end('Error 500: File not found');
          } else {
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(indexContent, 'utf-8');
          }
        });
      } else {
        res.writeHead(500);
        res.end(`Server Error: ${error.code}`);
      }
    } else {
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content, 'utf-8');
    }
  });
});

server.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(`BlueFinch Purchase Management ERP App is running!`);
  console.log(`Local Access: http://localhost:${PORT}`);
  console.log(`====================================================`);
});
