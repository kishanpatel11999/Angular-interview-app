const http = require('http');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const BASE_DIR = __dirname;
const PORT = 3300;

function fetchUrl(urlPath, headers = {}) {
  return new Promise((resolve, reject) => {
    http.get(`http://localhost:${PORT}${urlPath}`, { headers }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: data }));
    }).on('error', reject);
  });
}

// Load marked and highlight.js locally to test render pipeline exactly as viewer.js does
const markedCode = fs.readFileSync(path.join(BASE_DIR, 'marked.min.js'), 'utf-8');
const hljsCode = fs.readFileSync(path.join(BASE_DIR, 'highlight.min.js'), 'utf-8');

const sandbox = {
  window: {},
  document: {
    createElement: () => ({ setAttribute: () => {}, innerHTML: '', appendChild: () => {} })
  },
  navigator: {},
  console: console
};
vm.createContext(sandbox);
vm.runInContext(markedCode, sandbox);
vm.runInContext(hljsCode, sandbox);

const marked = sandbox.marked || sandbox.window.marked;
const hljs = sandbox.hljs || sandbox.window.hljs;

console.log(`\n======================================================`);
console.log(`🧪 End-to-End Doc Content & Parser Verification`);
console.log(`======================================================\n`);

async function testDoc(docPath) {
  console.log(`▶ Testing Document: "${docPath}"`);

  // 1. Browser navigation request for HTML shell
  const htmlRes = await fetchUrl(docPath, { 'Accept': 'text/html' });
  if (htmlRes.status !== 200 || !htmlRes.headers['content-type'].includes('text/html')) {
    throw new Error(`Failed HTML request for ${docPath}: status ${htmlRes.status}`);
  }
  if (!htmlRes.body.includes('id="markdown-body"') || !htmlRes.body.includes('id="sidebar-nav"')) {
    throw new Error(`HTML response missing critical UI containers for ${docPath}`);
  }
  console.log(`  ✓ Browser direct navigation delivers HTML UI shell (Status 200)`);

  // 2. Fetch raw markdown
  const rawPath = docPath.includes('?') ? `${docPath}&raw=1` : `${docPath}?raw=1`;
  const rawRes = await fetchUrl(rawPath, { 'Accept': 'text/markdown' });
  if (rawRes.status !== 200 || !rawRes.headers['content-type'].includes('text/markdown')) {
    throw new Error(`Failed raw fetch for ${rawPath}: status ${rawRes.status}`);
  }
  if (rawRes.body.length < 500) {
    throw new Error(`Raw document content is unexpectedly small: ${rawRes.body.length} bytes`);
  }
  console.log(`  ✓ Raw markdown fetch delivers complete document (${rawRes.body.length.toLocaleString()} bytes)`);

  // 3. Render through marked.js
  const renderer = new marked.Renderer();
  let headingCount = 0;
  let codeCount = 0;

  renderer.heading = function (codeOrObj, depthOrNumber) {
    headingCount++;
    const text = typeof codeOrObj === 'object' && codeOrObj !== null ? codeOrObj.text : codeOrObj;
    const depth = typeof codeOrObj === 'object' && codeOrObj !== null ? codeOrObj.depth : depthOrNumber;
    return `<h${depth}>${text}</h${depth}>`;
  };

  renderer.code = function (codeOrObj, langOrInfostring) {
    codeCount++;
    const text = typeof codeOrObj === 'object' && codeOrObj !== null ? codeOrObj.text : codeOrObj;
    const lang = typeof codeOrObj === 'object' && codeOrObj !== null ? codeOrObj.lang : langOrInfostring;
    let highlighted = text;
    if (hljs && lang && hljs.getLanguage(lang)) {
      try {
        highlighted = hljs.highlight(text, { language: lang }).value;
      } catch (e) {}
    }
    return `<pre><code class="hljs language-${lang}">${highlighted}</code></pre>`;
  };

  marked.setOptions({ renderer, gfm: true });
  const htmlOutput = marked.parse(rawRes.body);

  if (!htmlOutput || htmlOutput.length === 0) {
    throw new Error(`Rendered HTML output is empty for ${docPath}`);
  }
  console.log(`  ✓ Markdown parsed cleanly into ${headingCount} sections & ${codeCount} code blocks`);
}

async function run() {
  const testDocs = [
    '/01-fundamentals/javascript-typescript.md',
    '/02-core-angular/signals-and-rxjs.md',
    '/03-advanced-angular/performance-optimization.md',
    '/04-security/frontend-security.md',
    '/07-interview-preparation/javascript-typescript-questions.md',
    '/10-version-comparison/angular-v20-to-v22-comparison.md',
    '/ROADMAP.md',
    '/PROGRESS.md',
    '/README.md'
  ];

  for (const doc of testDocs) {
    try {
      await testDoc(doc);
    } catch (e) {
      console.error(`❌ Error testing ${doc}:`, e.message);
      process.exit(1);
    }
  }

  console.log(`\n======================================================`);
  console.log(`🎉 ALL ${testDocs.length} SAMPLE DOCUMENTS RENDERED FLAWLESSLY!`);
  console.log(`======================================================\n`);
}

run();
