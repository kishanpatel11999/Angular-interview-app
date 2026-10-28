const http = require('http');
const fs = require('fs');
const path = require('path');

const BASE_DIR = __dirname;
const PORT = 3300;

const vm = require('vm');

// Read docs-manifest to get all known files
const manifestContent = fs.readFileSync(path.join(BASE_DIR, 'docs-manifest.js'), 'utf-8');
const sandbox = { window: {} };
vm.createContext(sandbox);
vm.runInContext(manifestContent, sandbox);
const manifest = sandbox.window.DOCS_MANIFEST;
if (!manifest || !Array.isArray(manifest)) {
  console.error('❌ Could not parse window.DOCS_MANIFEST');
  process.exit(1);
}
const allDocs = [];
manifest.forEach(s => s.docs.forEach(d => allDocs.push(d)));

console.log(`\n======================================================`);
console.log(`🧪 Comprehensive Routing & Markdown Link Verification`);
console.log(`📁 Loaded ${allDocs.length} documentation files from manifest`);
console.log(`======================================================\n`);

// Path resolution function mirroring viewer.js
function resolveRelativePath(currentDocPath, relativeHref) {
  if (!relativeHref) return null;
  if (relativeHref.startsWith('http://') || relativeHref.startsWith('https://') || relativeHref.startsWith('mailto:') || relativeHref.startsWith('tel:')) {
    return null;
  }

  const [rawPath, rawHash] = relativeHref.split('#');
  const hash = rawHash ? `#${rawHash}` : '';

  if (!rawPath) {
    return { path: currentDocPath, hash };
  }

  const cleanCurrent = (currentDocPath || '').replace(/^\//, '');
  const currentDir = cleanCurrent.includes('/') 
    ? cleanCurrent.substring(0, cleanCurrent.lastIndexOf('/')) 
    : '';

  let combined = '';
  if (rawPath.startsWith('/')) {
    combined = rawPath.replace(/^\//, '');
  } else if (currentDir) {
    combined = currentDir + '/' + rawPath;
  } else {
    combined = rawPath;
  }

  const segments = combined.split('/');
  const resolvedSegments = [];
  for (const seg of segments) {
    if (seg === '.' || seg === '') continue;
    if (seg === '..') {
      if (resolvedSegments.length > 0) resolvedSegments.pop();
    } else {
      resolvedSegments.push(seg);
    }
  }

  let resolvedPath = resolvedSegments.join('/');

  if (resolvedPath.endsWith('.md') || allDocs.some(d => d.path === resolvedPath || d.path === resolvedPath + '.md')) {
    if (!resolvedPath.endsWith('.md') && allDocs.some(d => d.path === resolvedPath + '.md')) {
      resolvedPath += '.md';
    }
    return { path: resolvedPath, hash };
  }

  return null;
}

// 1. Test getDocFromLocation simulation
console.log(`▶ Test Suite 1: Route Detection from URLs`);
const routeCases = [
  { url: '/01-fundamentals/javascript-typescript.md', expected: '01-fundamentals/javascript-typescript.md' },
  { url: '/01-fundamentals/javascript-typescript', expected: '01-fundamentals/javascript-typescript.md' },
  { url: '/03-advanced-angular/performance-optimization.md', expected: '03-advanced-angular/performance-optimization.md' },
  { url: '/ROADMAP.md', expected: 'ROADMAP.md' },
  { url: '/?doc=02-core-angular/signals-deep-dive.md', expected: '02-core-angular/signals-deep-dive.md' },
  { url: '/', expected: 'README.md' }
];

let routePass = 0;
for (const testCase of routeCases) {
  const parsed = new URL(testCase.url, 'http://localhost:3300');
  let detected = 'README.md';
  if (parsed.searchParams.get('doc')) {
    detected = parsed.searchParams.get('doc').replace(/^\//, '');
  } else {
    let pathname = decodeURIComponent(parsed.pathname).replace(/^\//, '');
    if (pathname && pathname !== 'index.html' && pathname !== '') {
      if (pathname.endsWith('.md')) {
        detected = pathname;
      } else if (allDocs.some(d => d.path === pathname + '.md')) {
        detected = pathname + '.md';
      } else if (allDocs.some(d => d.path === pathname)) {
        detected = pathname;
      }
    }
  }

  if (detected === testCase.expected) {
    console.log(`  ✓ Route "${testCase.url}" correctly maps to: "${detected}"`);
    routePass++;
  } else {
    console.error(`  ❌ Route "${testCase.url}" expected "${testCase.expected}" but got "${detected}"`);
  }
}

// 2. Test all internal markdown cross-references across all 56 files
console.log(`\n▶ Test Suite 2: Markdown Link Resolution Across All 56 Docs`);
let totalLinks = 0;
let validResolved = 0;
let brokenLinks = 0;

for (const doc of allDocs) {
  const fullPath = path.join(BASE_DIR, doc.path);
  const content = fs.readFileSync(fullPath, 'utf-8');
  const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
  let match;

  while ((match = linkRegex.exec(content)) !== null) {
    const text = match[1];
    const href = match[2].trim();

    // Skip external
    if (href.startsWith('http://') || href.startsWith('https://') || href.startsWith('mailto:')) {
      continue;
    }

    totalLinks++;
    const resolved = resolveRelativePath(doc.path, href);
    if (!resolved) {
      console.warn(`  ⚠️ Unresolved relative link in ${doc.path}: "${href}" (text: "${text}")`);
      brokenLinks++;
      continue;
    }

    const targetDiskPath = path.join(BASE_DIR, resolved.path);
    if (!fs.existsSync(targetDiskPath)) {
      console.error(`  ❌ Target file does not exist on disk: ${resolved.path} (from ${doc.path} -> "${href}")`);
      brokenLinks++;
    } else {
      validResolved++;
    }
  }
}

console.log(`  📊 Processed ${totalLinks} internal links.`);
console.log(`  ✓ Valid resolved links: ${validResolved}`);
console.log(`  ${brokenLinks === 0 ? '✓ Broken links: 0' : '❌ Broken links: ' + brokenLinks}`);

// 3. Test HTTP live server endpoints
console.log(`\n▶ Test Suite 3: Live HTTP Server Endpoint Verification`);

function makeRequest(urlPath, headers = {}) {
  return new Promise((resolve, reject) => {
    const req = http.request(`http://localhost:${PORT}${urlPath}`, { headers }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          data
        });
      });
    });
    req.on('error', reject);
    req.end();
  });
}

async function runHttpTests() {
  const testEndpoints = [
    {
      name: 'Direct doc URL with browser Accept: text/html',
      path: '/01-fundamentals/javascript-typescript.md',
      headers: { 'Accept': 'text/html,application/xhtml+xml' },
      validate: (res) => res.statusCode === 200 && res.headers['content-type'].includes('text/html') && res.data.includes('id="markdown-body"')
    },
    {
      name: 'Raw doc fetch with ?raw=1',
      path: '/01-fundamentals/javascript-typescript.md?raw=1',
      headers: { 'Accept': 'text/markdown, text/plain' },
      validate: (res) => res.statusCode === 200 && res.headers['content-type'].includes('text/markdown') && res.data.includes('# JavaScript and TypeScript')
    },
    {
      name: 'Extensionless browser URL',
      path: '/01-fundamentals/javascript-typescript',
      headers: { 'Accept': 'text/html' },
      validate: (res) => res.statusCode === 200 && res.headers['content-type'].includes('text/html')
    },
    {
      name: 'Root index route',
      path: '/',
      headers: { 'Accept': 'text/html' },
      validate: (res) => res.statusCode === 200 && res.data.includes('Angular Senior Prep')
    },
    {
      name: 'Nested asset path resolution (viewer.css)',
      path: '/01-fundamentals/viewer.css',
      headers: {},
      validate: (res) => res.statusCode === 200 && res.headers['content-type'].includes('text/css')
    },
    {
      name: 'Nested asset path resolution (viewer.js)',
      path: '/01-fundamentals/viewer.js',
      headers: {},
      validate: (res) => res.statusCode === 200 && res.headers['content-type'].includes('application/javascript')
    },
    {
      name: 'Phase 2 doc check',
      path: '/02-core-angular/signals-and-rxjs.md?raw=1',
      headers: {},
      validate: (res) => res.statusCode === 200 && res.headers['content-type'].includes('text/markdown')
    },
    {
      name: 'Phase 3 doc check',
      path: '/03-advanced-angular/performance-optimization.md?raw=1',
      headers: {},
      validate: (res) => res.statusCode === 200 && res.headers['content-type'].includes('text/markdown')
    },
    {
      name: 'Phase 10 version comparison doc check',
      path: '/10-version-comparison/angular-v20-to-v22-comparison.md?raw=1',
      headers: {},
      validate: (res) => res.statusCode === 200 && res.headers['content-type'].includes('text/markdown')
    }
  ];

  let httpPass = 0;
  for (const t of testEndpoints) {
    try {
      const res = await makeRequest(t.path, t.headers);
      if (t.validate(res)) {
        console.log(`  ✓ [HTTP ${res.statusCode}] ${t.name}: PASSED`);
        httpPass++;
      } else {
        console.error(`  ❌ ${t.name}: FAILED (Status: ${res.statusCode}, Content-Type: ${res.headers['content-type']})`);
      }
    } catch (err) {
      console.error(`  ❌ ${t.name}: ERROR - ${err.message}`);
    }
  }

  console.log(`\n======================================================`);
  console.log(`🏁 Summary of Test Results:`);
  console.log(`   - Route URL resolution: ${routePass}/${routeCases.length} Passed`);
  console.log(`   - Markdown Links resolution: ${validResolved}/${totalLinks} Valid (${brokenLinks} broken)`);
  console.log(`   - Live HTTP Endpoint Tests: ${httpPass}/${testEndpoints.length} Passed`);
  console.log(`======================================================\n`);

  if (routePass === routeCases.length && brokenLinks === 0 && httpPass === testEndpoints.length) {
    console.log(`🎉 ALL TESTS PASSED SUCCESSFULLY!\n`);
    process.exit(0);
  } else {
    console.error(`❌ Some tests failed.\n`);
    process.exit(1);
  }
}

runHttpTests();
