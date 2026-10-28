/**
 * Angular Senior Interview Prep — Documentation Viewer Engine
 * Full-featured Single-Page Documentation Application
 */

(function () {
  'use strict';

  // State Management
  const state = {
    currentDocPath: 'README.md',
    manifest: window.DOCS_MANIFEST || [],
    flatDocs: [],
    completedDocs: new Set(JSON.parse(localStorage.getItem('completed_docs') || '[]')),
    theme: localStorage.getItem('app_theme') || 'dark',
    fontSize: parseInt(localStorage.getItem('app_font_size') || '15', 10),
    isSidebarOpen: false
  };

  // Flatten all documents into sequential order for prev/next navigation
  function initializeFlatDocs() {
    state.flatDocs = [];
    state.manifest.forEach(section => {
      section.docs.forEach(doc => {
        state.flatDocs.push({
          ...doc,
          sectionTitle: section.title,
          sectionId: section.id
        });
      });
    });
  }

  // DOM Elements Cache
  const elements = {
    html: document.documentElement,
    brandLink: document.getElementById('brand-link'),
    sidebar: document.getElementById('sidebar'),
    sidebarNav: document.getElementById('sidebar-nav'),
    sidebarFilterInput: document.getElementById('sidebar-filter-input'),
    sidebarFilterClear: document.getElementById('sidebar-filter-clear'),
    progressFill: document.getElementById('progress-fill'),
    progressPercent: document.getElementById('progress-percent'),
    progressCount: document.getElementById('progress-count'),
    breadcrumbs: document.getElementById('breadcrumbs'),
    breadcrumbCategory: document.getElementById('breadcrumb-category'),
    breadcrumbDoc: document.getElementById('breadcrumb-doc'),
    docHero: document.getElementById('doc-hero'),
    heroCategoryBadge: document.getElementById('hero-category-badge'),
    heroReadingTime: document.getElementById('hero-reading-time'),
    heroWordCount: document.getElementById('hero-word-count'),
    heroTitle: document.getElementById('hero-title'),
    heroDescription: document.getElementById('hero-description'),
    toggleCompleteBtn: document.getElementById('toggle-complete-btn'),
    toggleCompleteText: document.getElementById('toggle-complete-text'),
    copyMarkdownBtn: document.getElementById('copy-markdown-btn'),
    markdownBody: document.getElementById('markdown-body'),
    tocList: document.getElementById('toc-list'),
    readingProgressBar: document.getElementById('reading-progress-bar'),
    prevDocBtn: document.getElementById('prev-doc-btn'),
    prevDocTitle: document.getElementById('prev-doc-title'),
    nextDocBtn: document.getElementById('next-doc-btn'),
    nextDocTitle: document.getElementById('next-doc-title'),
    searchTriggerBtn: document.getElementById('search-trigger-btn'),
    searchModal: document.getElementById('search-modal'),
    modalSearchInput: document.getElementById('modal-search-input'),
    modalCloseBtn: document.getElementById('modal-close-btn'),
    modalResults: document.getElementById('modal-results'),
    themeToggleBtn: document.getElementById('theme-toggle-btn'),
    moonIcon: document.getElementById('moon-icon'),
    sunIcon: document.getElementById('sun-icon'),
    fontDecreaseBtn: document.getElementById('font-decrease-btn'),
    fontIncreaseBtn: document.getElementById('font-increase-btn'),
    shareLinkBtn: document.getElementById('share-link-btn'),
    mobileMenuToggle: document.getElementById('mobile-menu-toggle'),
    toastContainer: document.getElementById('toast-container'),
    backToTopBtn: document.getElementById('back-to-top-btn')
  };

  // Toast Notification System
  function showToast(message, icon = '✓') {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = `<span>${icon}</span><span>${message}</span>`;
    elements.toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      toast.style.transition = 'all 0.25s ease';
      setTimeout(() => toast.remove(), 250);
    }, 2500);
  }

  // Theme Management
  function applyTheme(theme) {
    state.theme = theme;
    elements.html.setAttribute('data-theme', theme);
    localStorage.setItem('app_theme', theme);

    const hljsTheme = document.getElementById('hljs-theme');
    if (theme === 'light') {
      elements.moonIcon.style.display = 'none';
      elements.sunIcon.style.display = 'block';
      if (hljsTheme) {
        hljsTheme.href = 'highlight-light.css';
      }
    } else {
      elements.moonIcon.style.display = 'block';
      elements.sunIcon.style.display = 'none';
      if (hljsTheme) {
        hljsTheme.href = 'highlight-dark.css';
      }
    }
  }

  // Font Size Management
  function applyFontSize(size) {
    state.fontSize = Math.min(20, Math.max(13, size));
    elements.html.style.setProperty('--font-size-base', `${state.fontSize}px`);
    localStorage.setItem('app_font_size', state.fontSize);
  }

  // Progress Tracking
  function updateProgress() {
    const total = state.flatDocs.length;
    const completed = state.completedDocs.size;
    const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

    elements.progressFill.style.width = `${percent}%`;
    elements.progressPercent.textContent = `${percent}%`;
    elements.progressCount.textContent = `${completed} / ${total} topics completed`;

    // Update current doc button state
    const isCompleted = state.completedDocs.has(state.currentDocPath);
    if (isCompleted) {
      elements.toggleCompleteBtn.classList.add('completed');
      elements.toggleCompleteText.textContent = 'Completed ✓';
    } else {
      elements.toggleCompleteBtn.classList.remove('completed');
      elements.toggleCompleteText.textContent = 'Mark as Completed';
    }
  }

  function toggleComplete(path) {
    if (state.completedDocs.has(path)) {
      state.completedDocs.delete(path);
      showToast('Marked as pending', '○');
    } else {
      state.completedDocs.add(path);
      showToast('Topic completed! Great progress.', '🎉');
    }
    localStorage.setItem('completed_docs', JSON.stringify(Array.from(state.completedDocs)));
    updateProgress();
    renderSidebarNav();
  }

  // Render Sidebar Tree Navigation
  function renderSidebarNav(filterQuery = '') {
    const query = filterQuery.toLowerCase().trim();
    elements.sidebarNav.innerHTML = '';

    state.manifest.forEach(section => {
      const filteredDocs = section.docs.filter(doc => {
        if (!query) return true;
        return (
          doc.title.toLowerCase().includes(query) ||
          doc.path.toLowerCase().includes(query) ||
          (doc.description && doc.description.toLowerCase().includes(query))
        );
      });

      if (filteredDocs.length === 0) return;

      const groupDiv = document.createElement('div');
      groupDiv.className = 'sidebar-group';
      // Auto-expand if searching
      if (query) {
        groupDiv.classList.remove('collapsed');
      }

      const headerBtn = document.createElement('button');
      headerBtn.className = 'group-header';
      headerBtn.innerHTML = `
        <span>${section.title} (${filteredDocs.length})</span>
        <svg class="group-chevron" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m6 9 6 6 6-6"/></svg>
      `;

      headerBtn.addEventListener('click', () => {
        groupDiv.classList.toggle('collapsed');
      });

      const docsList = document.createElement('ul');
      docsList.className = 'group-docs';

      filteredDocs.forEach(doc => {
        const itemLi = document.createElement('li');
        const link = document.createElement('a');
        link.className = 'doc-nav-item';
        if (doc.path === state.currentDocPath) {
          link.classList.add('active');
        }
        link.href = `/${doc.path}`;

        const isDone = state.completedDocs.has(doc.path);

        link.innerHTML = `
          <span class="doc-item-title" title="${doc.title}">${doc.title}</span>
          ${isDone ? '<span class="doc-completed-dot" title="Completed"></span>' : ''}
        `;

        link.addEventListener('click', (e) => {
          e.preventDefault();
          navigateTo(doc.path);
          if (window.innerWidth <= 768) {
            elements.sidebar.classList.remove('open');
          }
        });

        itemLi.appendChild(link);
        docsList.appendChild(itemLi);
      });

      groupDiv.appendChild(headerBtn);
      groupDiv.appendChild(docsList);
      elements.sidebarNav.appendChild(groupDiv);
    });
  }

  // Pre-process markdown for GitHub Alert callouts and anchor headings
  function processMarkdownAlerts(rawMarkdown) {
    // Transform blockquotes with [!NOTE], [!TIP], [!WARNING], [!IMPORTANT], [!CAUTION]
    const alertTypes = ['NOTE', 'TIP', 'WARNING', 'IMPORTANT', 'CAUTION'];
    let processed = rawMarkdown;

    alertTypes.forEach(type => {
      const regex = new RegExp(`>\\s*\\[!${type}\\]\\s*\\n([\\s\\S]*?)(?=(\\n\\n|\\n#[^#]|\\n>\\s*\\[!|$))`, 'gi');
      processed = processed.replace(regex, (match, content) => {
        const cleanContent = content
          .split('\n')
          .map(l => l.replace(/^>\s*/, ''))
          .join('\n')
          .trim();
        return `<div class="markdown-alert alert-${type.toLowerCase()}"><div class="markdown-alert-title">${type}</div>\n\n${cleanContent}\n\n</div>`;
      });
    });

    return processed;
  }

  // Path resolution and routing utilities
  function getDocFromLocation() {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('doc')) {
      return urlParams.get('doc').replace(/^\//, '');
    }

    let pathname = decodeURIComponent(window.location.pathname).replace(/^\//, '');
    if (pathname && pathname !== 'index.html' && pathname !== '') {
      if (pathname.endsWith('.md')) {
        return pathname;
      }
      if (state.flatDocs.some(d => d.path === pathname + '.md')) {
        return pathname + '.md';
      }
      if (state.flatDocs.some(d => d.path === pathname)) {
        return pathname;
      }
    }

    return 'README.md';
  }

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

    if (resolvedPath.endsWith('.md') || state.flatDocs.some(d => d.path === resolvedPath || d.path === resolvedPath + '.md')) {
      if (!resolvedPath.endsWith('.md') && state.flatDocs.some(d => d.path === resolvedPath + '.md')) {
        resolvedPath += '.md';
      }
      return { path: resolvedPath, hash };
    }

    return null;
  }

  // Fetch or retrieve markdown content
  async function loadDocumentContent(docPath) {
    const cleanPath = (docPath || '').replace(/^\//, '');

    // 1. If running on local server, try live fetch first so disk edits appear instantly!
    if (window.location.protocol.startsWith('http')) {
      try {
        const fetchUrl = `/${cleanPath}?raw=1`;
        const res = await fetch(fetchUrl, {
          headers: {
            'Accept': 'text/markdown, text/plain, */*'
          }
        });
        if (res.ok) {
          const text = await res.text();
          if (text && text.trim().length > 0) {
            return text;
          }
        }
      } catch (e) {
        console.warn('Live fetch failed, falling back to embedded manifest', e);
      }
    }

    // 2. Offline fallback from embedded manifest
    const match = state.flatDocs.find(d => d.path === cleanPath || d.path === docPath);
    if (match && match.content) {
      return match.content;
    }

    return `# Document Not Found\n\nCould not load **${docPath}**. Please select a topic from the sidebar.`;
  }

  // Setup Marked.js custom renderer
  function setupMarkedRenderer() {
    if (typeof marked === 'undefined') return;

    const renderer = new marked.Renderer();

    // Custom code block renderer with language label and copy button
    // Handles both marked positional args (code, lang) and object parameter ({ text, lang })
    renderer.code = function (codeOrObj, langOrInfostring) {
      const text = typeof codeOrObj === 'object' && codeOrObj !== null ? codeOrObj.text : codeOrObj;
      const lang = typeof codeOrObj === 'object' && codeOrObj !== null ? codeOrObj.lang : langOrInfostring;
      const cleanText = text || '';
      const language = (lang || 'text').trim().toLowerCase();
      let highlighted = escapeHtml(cleanText);

      if (typeof hljs !== 'undefined') {
        try {
          if (hljs.getLanguage(language)) {
            highlighted = hljs.highlight(cleanText, { language }).value;
          } else {
            highlighted = hljs.highlightAuto(cleanText).value;
          }
        } catch (e) {
          highlighted = escapeHtml(cleanText);
        }
      }

      return `
        <div class="code-block-wrapper">
          <div class="code-header">
            <span class="code-language">${language}</span>
            <button class="copy-code-btn" onclick="window.copyCodeSnippet(this)" title="Copy Code">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
              <span>Copy</span>
            </button>
          </div>
          <pre><code class="hljs language-${language}">${highlighted}</code></pre>
        </div>
      `;
    };

    // Heading renderer with anchor IDs
    // Handles both positional args (text, depth, raw) and object parameter ({ text, depth })
    renderer.heading = function (textOrObj, depthOrNumber) {
      const text = typeof textOrObj === 'object' && textOrObj !== null ? textOrObj.text : textOrObj;
      const depth = typeof textOrObj === 'object' && textOrObj !== null ? textOrObj.depth : depthOrNumber;
      const cleanText = text || '';
      const validDepth = depth || 2;

      const plainText = cleanText.replace(/<[^>]+>/g, '').trim();
      const slug = plainText
        .toLowerCase()
        .replace(/[^\w\s-]/g, '')
        .replace(/\s+/g, '-');

      return `
        <h${validDepth} id="${slug}">
          <a href="#${slug}" class="heading-anchor" aria-hidden="true">#</a>
          ${cleanText}
        </h${validDepth}>
      `;
    };

    marked.setOptions({
      renderer,
      gfm: true,
      breaks: false
    });
  }

  // Generate Table of Contents from rendered headings
  function buildTableOfContents() {
    elements.tocList.innerHTML = '';
    const headings = elements.markdownBody.querySelectorAll('h2, h3');

    if (headings.length === 0) {
      elements.tocList.innerHTML = '<li class="toc-empty">No subheadings in document.</li>';
      return;
    }

    headings.forEach(heading => {
      const id = heading.id;
      const text = heading.textContent.replace(/^#\s*/, '').trim();
      const level = heading.tagName.toLowerCase();

      const li = document.createElement('li');
      const a = document.createElement('a');
      a.className = `toc-link ${level === 'h3' ? 'indent-3' : ''}`;
      a.href = `#${id}`;
      a.textContent = text;

      a.addEventListener('click', (e) => {
        e.preventDefault();
        const target = document.getElementById(id);
        if (target) {
          target.scrollIntoView({ behavior: 'smooth' });
          history.replaceState(null, '', `#${id}`);
        }
      });

      li.appendChild(a);
      elements.tocList.appendChild(li);
    });

    initScrollSpy();
  }

  // ScrollSpy for Active Heading
  let scrollSpyObserver = null;
  function initScrollSpy() {
    if (scrollSpyObserver) scrollSpyObserver.disconnect();

    const headings = Array.from(elements.markdownBody.querySelectorAll('h2, h3'));
    if (headings.length === 0) return;

    scrollSpyObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const id = entry.target.id;
          elements.tocList.querySelectorAll('.toc-link').forEach(link => {
            if (link.getAttribute('href') === `#${id}`) {
              link.classList.add('active');
            } else {
              link.classList.remove('active');
            }
          });
        }
      });
    }, { rootMargin: '-80px 0px -70% 0px' });

    headings.forEach(h => scrollSpyObserver.observe(h));
  }

  // Load and Render Document
  async function renderDocument(docPath, targetHash = '') {
    let rawMarkdown = '';
    try {
      state.currentDocPath = docPath;

      // Show loading
      elements.markdownBody.innerHTML = `
        <div class="loading-state">
          <div class="spinner"></div>
          <p>Loading document...</p>
        </div>
      `;

      // Update active nav item
      renderSidebarNav(elements.sidebarFilterInput.value);

      // Find metadata
      const cleanPath = (docPath || '').replace(/^\//, '');
      const docMeta = state.flatDocs.find(d => d.path === cleanPath || d.path === docPath) || {
        title: pathBasename(docPath),
        description: '',
        sectionTitle: 'Documentation',
        wordCount: 0,
        readingTime: '5 min read'
      };

      // Update Breadcrumbs
      elements.breadcrumbCategory.textContent = docMeta.sectionTitle || 'Guide';
      elements.breadcrumbDoc.textContent = docMeta.title;

      // Update Hero
      elements.heroCategoryBadge.textContent = docMeta.sectionTitle || 'Topic';
      elements.heroReadingTime.textContent = docMeta.readingTime || '5 min read';
      elements.heroWordCount.textContent = `${(docMeta.wordCount || 1000).toLocaleString()} words`;
      elements.heroTitle.textContent = docMeta.title;
      elements.heroDescription.textContent = docMeta.description || 'Senior Angular technical interview preparation and architecture reference.';
      document.title = `${docMeta.title} — Angular Senior Prep`;

      updateProgress();

      // Fetch and parse
      rawMarkdown = await loadDocumentContent(docPath);
      const alertProcessed = processMarkdownAlerts(rawMarkdown);

      // Exclude title from body if it matches heroTitle to avoid duplicate h1
      let contentToRender = alertProcessed;
      if (contentToRender.startsWith('# ')) {
        contentToRender = contentToRender.replace(/^#[^\n]+\n/, '');
      }

      let parsedHtml = '';
      if (typeof marked !== 'undefined') {
        parsedHtml = marked.parse(contentToRender);
      } else {
        parsedHtml = `<pre class="fallback-pre">${escapeHtml(contentToRender)}</pre>`;
      }

      elements.markdownBody.innerHTML = parsedHtml;

      // Build Table of Contents
      buildTableOfContents();

      // Update Pagination (Prev / Next)
      updatePagination(docPath);

      // Scroll to target anchor or top
      const effectiveHash = targetHash || window.location.hash;
      if (effectiveHash) {
        const anchorId = effectiveHash.replace(/^#/, '');
        const anchor = document.getElementById(anchorId);
        if (anchor) {
          setTimeout(() => anchor.scrollIntoView({ behavior: 'smooth' }), 100);
        } else {
          window.scrollTo(0, 0);
        }
      } else {
        window.scrollTo(0, 0);
      }
    } catch (err) {
      console.error('Fatal renderDocument error:', err);
      elements.markdownBody.innerHTML = `
        <div class="markdown-alert alert-caution">
          <div class="markdown-alert-title">Rendering Notice</div>
          <p>Encountered an issue formatting this document: ${escapeHtml(err.message)}</p>
        </div>
        <pre class="code-block-wrapper" style="padding: 1rem; overflow-x: auto;">${escapeHtml(rawMarkdown || '')}</pre>
      `;
    }
  }

  function pathBasename(p) {
    return p.split('/').pop().replace('.md', '').replace(/-/g, ' ');
  }

  // Update Prev and Next Cards
  function updatePagination(currentPath) {
    const currentIndex = state.flatDocs.findIndex(d => d.path === currentPath);

    if (currentIndex > 0) {
      const prevDoc = state.flatDocs[currentIndex - 1];
      elements.prevDocBtn.style.visibility = 'visible';
      elements.prevDocTitle.textContent = prevDoc.title;
      elements.prevDocBtn.onclick = (e) => {
        e.preventDefault();
        navigateTo(prevDoc.path);
      };
    } else {
      elements.prevDocBtn.style.visibility = 'hidden';
    }

    if (currentIndex >= 0 && currentIndex < state.flatDocs.length - 1) {
      const nextDoc = state.flatDocs[currentIndex + 1];
      elements.nextDocBtn.style.visibility = 'visible';
      elements.nextDocTitle.textContent = nextDoc.title;
      elements.nextDocBtn.onclick = (e) => {
        e.preventDefault();
        navigateTo(nextDoc.path);
      };
    } else {
      elements.nextDocBtn.style.visibility = 'hidden';
    }
  }

  // Navigation Handler
  function navigateTo(docPath, hash = '') {
    const cleanPath = (docPath || 'README.md').replace(/^\//, '');
    const cleanHash = hash ? (hash.startsWith('#') ? hash : '#' + hash) : '';
    const targetUrl = '/' + cleanPath + cleanHash;

    if (window.location.pathname + window.location.hash !== targetUrl) {
      history.pushState(null, '', targetUrl);
    }
    renderDocument(cleanPath, cleanHash);
  }

  // Copy Code Snippet Helper (Attached globally for inline onclick)
  window.copyCodeSnippet = function (btn) {
    const wrapper = btn.closest('.code-block-wrapper');
    if (!wrapper) return;
    const code = wrapper.querySelector('code')?.innerText || '';

    navigator.clipboard.writeText(code).then(() => {
      const label = btn.querySelector('span');
      const original = label.textContent;
      label.textContent = 'Copied!';
      btn.style.color = 'var(--accent-emerald)';
      setTimeout(() => {
        label.textContent = original;
        btn.style.color = '';
      }, 2000);
      showToast('Code copied to clipboard', '📋');
    });
  };

  // Search Modal Engine
  function openSearchModal() {
    elements.searchModal.style.display = 'flex';
    elements.modalSearchInput.value = '';
    elements.modalSearchInput.focus();
    renderSearchResults('');
  }

  function closeSearchModal() {
    elements.searchModal.style.display = 'none';
  }

  function renderSearchResults(query) {
    const q = query.toLowerCase().trim();
    if (!q) {
      elements.modalResults.innerHTML = '<div class="modal-hint">Type keywords to search across all 56 interview preparation files.</div>';
      return;
    }

    const matches = [];

    state.flatDocs.forEach(doc => {
      let score = 0;
      let matchedSnippet = '';

      if (doc.title.toLowerCase().includes(q)) score += 10;
      if (doc.path.toLowerCase().includes(q)) score += 5;
      if (doc.description && doc.description.toLowerCase().includes(q)) score += 3;

      if (doc.content) {
        const lowerContent = doc.content.toLowerCase();
        const idx = lowerContent.indexOf(q);
        if (idx !== -1) {
          score += 2;
          const start = Math.max(0, idx - 40);
          const end = Math.min(doc.content.length, idx + 100);
          matchedSnippet = '...' + doc.content.substring(start, end).replace(/\n/g, ' ') + '...';
        }
      }

      if (score > 0) {
        matches.push({ doc, score, matchedSnippet });
      }
    });

    matches.sort((a, b) => b.score - a.score);

    if (matches.length === 0) {
      elements.modalResults.innerHTML = `<div class="modal-hint">No results found for "${query}". Try another term.</div>`;
      return;
    }

    elements.modalResults.innerHTML = '';
    matches.slice(0, 15).forEach((item, index) => {
      const a = document.createElement('a');
      a.className = `search-result-item ${index === 0 ? 'selected' : ''}`;
      a.href = `/${item.doc.path}`;
      a.innerHTML = `
        <span class="result-category">${item.doc.sectionTitle || 'Topic'}</span>
        <span class="result-title">${highlightQuery(item.doc.title, q)}</span>
        <span class="result-desc">${item.matchedSnippet ? highlightQuery(item.matchedSnippet, q) : (item.doc.description || item.doc.path)}</span>
      `;

      a.addEventListener('click', (e) => {
        e.preventDefault();
        closeSearchModal();
        navigateTo(item.doc.path);
      });

      elements.modalResults.appendChild(a);
    });
  }

  function highlightQuery(text, query) {
    if (!query) return escapeHtml(text);
    const escaped = escapeHtml(text);
    const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    return escaped.replace(regex, '<mark style="background: rgba(56, 189, 248, 0.3); color: inherit; padding: 1px 3px; border-radius: 3px;">$1</mark>');
  }

  function escapeHtml(str) {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  // Event Listeners Initialization
  function attachEventListeners() {
    // Intercept clicks on links inside markdown body
    elements.markdownBody.addEventListener('click', (e) => {
      const anchor = e.target.closest('a');
      if (!anchor) return;

      const href = anchor.getAttribute('href');
      if (!href) return;

      // External link
      if (href.startsWith('http://') || href.startsWith('https://') || href.startsWith('mailto:') || href.startsWith('tel:')) {
        anchor.setAttribute('target', '_blank');
        anchor.setAttribute('rel', 'noopener noreferrer');
        return;
      }

      // Anchor link on same page
      if (href.startsWith('#')) {
        e.preventDefault();
        const id = href.substring(1);
        const target = document.getElementById(id);
        if (target) {
          target.scrollIntoView({ behavior: 'smooth' });
          history.pushState(null, '', href);
        }
        return;
      }

      // Relative markdown link
      const resolved = resolveRelativePath(state.currentDocPath, href);
      if (resolved) {
        e.preventDefault();
        if (resolved.path === state.currentDocPath && resolved.hash) {
          const target = document.getElementById(resolved.hash.substring(1));
          if (target) {
            target.scrollIntoView({ behavior: 'smooth' });
            history.pushState(null, '', resolved.hash);
          }
        } else {
          navigateTo(resolved.path, resolved.hash);
        }
      }
    });

    // Reading Progress on Scroll
    window.addEventListener('scroll', () => {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const progress = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
      elements.readingProgressBar.style.width = `${progress}%`;
    }, { passive: true });

    // Sidebar Filter
    elements.sidebarFilterInput.addEventListener('input', (e) => {
      const val = e.target.value;
      elements.sidebarFilterClear.style.display = val ? 'block' : 'none';
      renderSidebarNav(val);
    });

    elements.sidebarFilterClear.addEventListener('click', () => {
      elements.sidebarFilterInput.value = '';
      elements.sidebarFilterClear.style.display = 'none';
      renderSidebarNav();
      elements.sidebarFilterInput.focus();
    });

    // Toggle Complete Button
    elements.toggleCompleteBtn.addEventListener('click', () => {
      toggleComplete(state.currentDocPath);
    });

    // Copy Raw Markdown
    elements.copyMarkdownBtn.addEventListener('click', async () => {
      const content = await loadDocumentContent(state.currentDocPath);
      navigator.clipboard.writeText(content).then(() => {
        showToast('Raw markdown copied to clipboard!', '📄');
      });
    });

    // Brand Link click to home
    if (elements.brandLink) {
      elements.brandLink.addEventListener('click', (e) => {
        e.preventDefault();
        navigateTo('README.md');
      });
    }

    // Share / Copy Link
    elements.shareLinkBtn.addEventListener('click', () => {
      const shareUrl = `${window.location.origin}/${state.currentDocPath}`;
      navigator.clipboard.writeText(shareUrl).then(() => {
        showToast('Document link copied to clipboard!', '🔗');
      });
    });

    // Theme Toggle
    elements.themeToggleBtn.addEventListener('click', () => {
      applyTheme(state.theme === 'dark' ? 'light' : 'dark');
      showToast(`Switched to ${state.theme} mode`, state.theme === 'dark' ? '🌙' : '☀️');
    });

    // Font Size Adjusters
    elements.fontDecreaseBtn.addEventListener('click', () => applyFontSize(state.fontSize - 1));
    elements.fontIncreaseBtn.addEventListener('click', () => applyFontSize(state.fontSize + 1));

    // Mobile Menu Toggle
    elements.mobileMenuToggle.addEventListener('click', () => {
      elements.sidebar.classList.toggle('open');
    });

    // Back to top button
    elements.backToTopBtn.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    // Search Trigger Modal
    elements.searchTriggerBtn.addEventListener('click', openSearchModal);
    elements.modalCloseBtn.addEventListener('click', closeSearchModal);

    elements.searchModal.addEventListener('click', (e) => {
      if (e.target === elements.searchModal) closeSearchModal();
    });

    elements.modalSearchInput.addEventListener('input', (e) => {
      renderSearchResults(e.target.value);
    });

    // Keyboard Shortcuts (Cmd+K / Ctrl+K, Escape, Arrows)
    window.addEventListener('keydown', (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (elements.searchModal.style.display === 'flex') {
          closeSearchModal();
        } else {
          openSearchModal();
        }
      } else if (e.key === 'Escape' && elements.searchModal.style.display === 'flex') {
        closeSearchModal();
      } else if (elements.searchModal.style.display === 'flex') {
        const items = elements.modalResults.querySelectorAll('.search-result-item');
        if (items.length === 0) return;
        let selectedIndex = Array.from(items).findIndex(it => it.classList.contains('selected'));

        if (e.key === 'ArrowDown') {
          e.preventDefault();
          if (selectedIndex >= 0) items[selectedIndex].classList.remove('selected');
          selectedIndex = (selectedIndex + 1) % items.length;
          items[selectedIndex].classList.add('selected');
          items[selectedIndex].scrollIntoView({ block: 'nearest' });
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          if (selectedIndex >= 0) items[selectedIndex].classList.remove('selected');
          selectedIndex = (selectedIndex - 1 + items.length) % items.length;
          items[selectedIndex].classList.add('selected');
          items[selectedIndex].scrollIntoView({ block: 'nearest' });
        } else if (e.key === 'Enter') {
          if (selectedIndex >= 0 && items[selectedIndex]) {
            e.preventDefault();
            items[selectedIndex].click();
          }
        }
      }
    });

    // Handle Browser Popstate (Back / Forward navigation)
    window.addEventListener('popstate', () => {
      const doc = getDocFromLocation();
      renderDocument(doc, window.location.hash);
    });
  }

  // Application Entry Point
  function init() {
    initializeFlatDocs();
    setupMarkedRenderer();
    applyTheme(state.theme);
    applyFontSize(state.fontSize);
    attachEventListeners();

    // Initial Route Detection
    const initialDoc = getDocFromLocation();

    renderDocument(initialDoc, window.location.hash);
    renderSidebarNav();
    updateProgress();
  }

  // Start when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
