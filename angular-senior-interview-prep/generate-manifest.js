const fs = require('fs');
const path = require('path');

const baseDir = __dirname;

const categoryOrder = [
  { id: 'overview', title: 'Start Here & Progress', icon: 'compass', folder: '' },
  { id: '01-fundamentals', title: 'Phase 1: Fundamentals & Depth', icon: 'layers', folder: '01-fundamentals' },
  { id: '02-core-angular', title: 'Phase 2: Core Angular & Reactivity', icon: 'zap', folder: '02-core-angular' },
  { id: '03-advanced-angular', title: 'Phase 3: Advanced Angular & Architecture', icon: 'cpu', folder: '03-advanced-angular' },
  { id: '04-security', title: 'Phase 4: Enterprise Security', icon: 'shield', folder: '04-security' },
  { id: '05-testing-and-quality', title: 'Phase 5: Testing & Quality Engineering', icon: 'check-circle', folder: '05-testing-and-quality' },
  { id: '06-ai-assisted-development', title: 'Phase 6: Safe AI-Assisted Development', icon: 'bot', folder: '06-ai-assisted-development' },
  { id: '07-interview-preparation', title: 'Phase 7: Interview Q&A & System Design', icon: 'award', folder: '07-interview-preparation' },
  { id: '08-projects', title: 'Phase 8: Practical Projects & Incidents', icon: 'briefcase', folder: '08-projects' },
  { id: '09-revision', title: 'Phase 9: Revision & Checklists', icon: 'bookmark', folder: '09-revision' },
  { id: '10-version-comparison', title: 'Version Evolution (v2 to v22)', icon: 'git-branch', folder: '10-version-comparison' },
];

function extractDocMeta(filePath, relativePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');

  // Title: first # Heading
  let title = path.basename(relativePath, '.md').replace(/-/g, ' ');
  for (const line of lines) {
    if (line.startsWith('# ')) {
      title = line.replace(/^#\s+/, '').trim();
      break;
    }
  }

  // Description / Subtitle
  let description = '';
  for (let i = 0; i < Math.min(lines.length, 15); i++) {
    const line = lines[i].trim();
    if (line.startsWith('>')) {
      description = line.replace(/^>\s*/, '').replace(/\*\*/g, '').trim();
      break;
    }
  }

  const wordCount = content.split(/\s+/).filter(Boolean).length;
  const readingTime = Math.max(1, Math.ceil(wordCount / 220));

  return {
    path: relativePath,
    title,
    description,
    wordCount,
    readingTime: `${readingTime} min read`,
    content // Embedded for zero-server offline fallback
  };
}

const manifest = [];

// 1. Root documents
const rootDocs = ['README.md', 'ROADMAP.md', 'PROGRESS.md'];
const rootSection = {
  id: 'overview',
  title: 'Start Here & Roadmap',
  icon: 'compass',
  docs: []
};

for (const doc of rootDocs) {
  const p = path.join(baseDir, doc);
  if (fs.existsSync(p)) {
    rootSection.docs.push(extractDocMeta(p, doc));
  }
}
manifest.push(rootSection);

// 2. Folders
for (const cat of categoryOrder.slice(1)) {
  const folderPath = path.join(baseDir, cat.folder);
  if (fs.existsSync(folderPath)) {
    const files = fs.readdirSync(folderPath).filter(f => f.endsWith('.md')).sort();
    const section = {
      id: cat.id,
      title: cat.title,
      icon: cat.icon,
      folder: cat.folder,
      docs: []
    };
    for (const f of files) {
      const relPath = path.join(cat.folder, f);
      section.docs.push(extractDocMeta(path.join(baseDir, relPath), relPath));
    }
    manifest.push(section);
  }
}

const jsContent = `// Auto-generated Docs Manifest & Embedded Content Store
// Generated at: ${new Date().toISOString()}
window.DOCS_MANIFEST = ${JSON.stringify(manifest, null, 2)};
`;

fs.writeFileSync(path.join(baseDir, 'docs-manifest.js'), jsContent, 'utf-8');
console.log(`Manifest generated successfully with ${manifest.reduce((acc, s) => acc + s.docs.length, 0)} documents!`);
