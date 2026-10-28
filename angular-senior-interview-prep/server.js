const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3300;
const BASE_DIR = __dirname;

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2'
};

function startServer(port) {
  const server = http.createServer((req, res) => {
    // Enable CORS for flexibility
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    try {
      const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
      let reqPath = decodeURIComponent(parsedUrl.pathname);
      const isRawRequest = parsedUrl.searchParams.get('raw') === '1' || parsedUrl.searchParams.get('view') === 'raw';
      const acceptHeader = req.headers.accept || '';
      const acceptsHtml = acceptHeader.includes('text/html');

      // Static assets that might be requested with nested doc paths (e.g., /01-fundamentals/viewer.css)
      const assetFilename = path.basename(reqPath);
      const rootAssets = [
        'viewer.css', 'viewer.js', 'docs-manifest.js', 
        'marked.min.js', 'highlight.min.js', 
        'highlight-dark.css', 'highlight-light.css', 'favicon.ico'
      ];
      if (rootAssets.includes(assetFilename) && !fs.existsSync(path.join(BASE_DIR, reqPath))) {
        reqPath = '/' + assetFilename;
      }

      // Root path
      if (reqPath === '/' || reqPath === '') {
        reqPath = '/index.html';
      }

      let filePath = path.normalize(path.join(BASE_DIR, reqPath));

      // Security check: ensure path is within BASE_DIR
      if (!filePath.startsWith(BASE_DIR)) {
        res.writeHead(403, { 'Content-Type': 'text/plain' });
        res.end('403 Forbidden');
        return;
      }

      // Check if file exists as-is or with .md extension
      let fileExists = fs.existsSync(filePath) && fs.statSync(filePath).isFile();
      let isDocFile = false;

      if (!fileExists && fs.existsSync(filePath + '.md') && fs.statSync(filePath + '.md').isFile()) {
        filePath = filePath + '.md';
        reqPath = reqPath + '.md';
        fileExists = true;
        isDocFile = true;
      } else if (fileExists && reqPath.endsWith('.md')) {
        isDocFile = true;
      }

      // If this is a markdown document request from a browser expecting HTML, serve index.html (SPA UI)
      if (isDocFile && acceptsHtml && !isRawRequest) {
        const indexPath = path.join(BASE_DIR, 'index.html');
        const indexStats = fs.statSync(indexPath);
        res.writeHead(200, {
          'Content-Type': 'text/html; charset=utf-8',
          'Content-Length': indexStats.size,
          'Cache-Control': 'no-cache'
        });
        fs.createReadStream(indexPath).pipe(res);
        return;
      }

      if (!fileExists) {
        // Fallback to index.html for unknown SPA routes if HTML is accepted
        if (acceptsHtml) {
          const indexPath = path.join(BASE_DIR, 'index.html');
          if (fs.existsSync(indexPath)) {
            const indexStats = fs.statSync(indexPath);
            res.writeHead(200, {
              'Content-Type': 'text/html; charset=utf-8',
              'Content-Length': indexStats.size,
              'Cache-Control': 'no-cache'
            });
            fs.createReadStream(indexPath).pipe(res);
            return;
          }
        }

        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end(`404 Not Found: ${reqPath}`);
        return;
      }

      const stats = fs.statSync(filePath);
      const ext = path.extname(filePath).toLowerCase();
      const contentType = MIME_TYPES[ext] || 'application/octet-stream';

      res.writeHead(200, {
        'Content-Type': contentType,
        'Content-Length': stats.size,
        'Cache-Control': 'no-cache'
      });

      fs.createReadStream(filePath).pipe(res);
    } catch (e) {
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end(`500 Server Error: ${e.message}`);
    }
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.log(`Port ${port} in use, trying port ${port + 1}...`);
      startServer(port + 1);
    } else {
      console.error('Server error:', err);
    }
  });

  server.listen(port, () => {
    console.log(`\n======================================================`);
    console.log(`🚀 Angular Senior Interview Prep Documentation Viewer`);
    console.log(`🌐 Local URL: http://localhost:${port}`);
    console.log(`📄 Available Docs: 56 modules across 10 specialized domains`);
    console.log(`======================================================\n`);
  });
}

startServer(PORT);
