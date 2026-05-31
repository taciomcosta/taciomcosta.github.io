'use strict';

const fs = require('fs');
const path = require('path');
const matter = require('gray-matter');
const { marked } = require('marked');

const ROOT = __dirname;
const PUBLIC = path.join(ROOT, 'public');
const CONTENT = path.join(ROOT, 'content');
const STATIC = path.join(ROOT, 'static');
const TEMPLATES_DIR = path.join(ROOT, 'templates');

const BASE_URL = 'https://taciomcosta.dev';
const DEFAULT_DESCRIPTION = 'Software Engineer with 10 years of experience. Currently at Google.';

const HLJS_VERSION = '11.9.0';
const HLJS_CDN = `https://cdnjs.cloudflare.com/ajax/libs/highlight.js/${HLJS_VERSION}`;
const HLJS_EXTRA_HEAD = [
  `<link id="hljs-dark" rel="stylesheet" href="${HLJS_CDN}/styles/atom-one-dark.min.css">`,
  `<link id="hljs-light" rel="stylesheet" href="${HLJS_CDN}/styles/atom-one-light.min.css" disabled>`,
  `<script src="${HLJS_CDN}/highlight.min.js"></script>`,
  `<script>document.addEventListener('DOMContentLoaded',function(){`,
  `  document.querySelectorAll('pre code[class]').forEach(function(el){hljs.highlightElement(el);});`,
  `});</script>`,
].join('\n');

const FILTER_EXTRA_HEAD = `<script src="/js/filter.js" defer></script>`;

// --- Template helpers ---

function readTemplate(name) {
  return fs.readFileSync(path.join(TEMPLATES_DIR, name), 'utf-8');
}

function render(tpl, vars) {
  return tpl.replace(/\{\{(\w+)\}\}/g, (_, k) => (vars[k] != null ? vars[k] : ''));
}

function renderPage(bodyTpl, bodyVars, pageVars) {
  const base = readTemplate('base.html');
  const body = render(bodyTpl, bodyVars);
  return render(base, { extraHead: '', ...pageVars, body });
}

// --- SEO helpers ---

function seoVars(canonicalPath, hreflangEnPath, hreflangPtPath, description) {
  return {
    canonicalUrl: BASE_URL + canonicalPath,
    hreflangEn:   BASE_URL + hreflangEnPath,
    hreflangPt:   BASE_URL + hreflangPtPath,
    description:  description || DEFAULT_DESCRIPTION,
  };
}

function postDescription(html) {
  return html.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim().slice(0, 160);
}

// --- File helpers ---

function mkdir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function write(filePath, content) {
  mkdir(path.dirname(filePath));
  fs.writeFileSync(filePath, content, 'utf-8');
}

function copyDir(src, dest) {
  if (!fs.existsSync(src)) return;
  mkdir(dest);
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

// --- Date helpers ---

function formatDate(dateStr) {
  const d = new Date(String(dateStr) + 'T00:00:00Z');
  return d.toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC',
  });
}

function formatYear(dateStr) {
  return String(dateStr).slice(0, 4);
}

// --- Reading time ---

function readingTime(html, locale) {
  const words = html.replace(/<[^>]+>/g, '').split(/\s+/).filter(Boolean).length;
  const mins = Math.max(1, Math.round(words / 200));
  return locale === 'pt-br' ? `${mins} min de leitura` : `${mins} min read`;
}

// --- Table of contents (h2-h3 only to avoid epigraph h4s) ---

function generateToC(html) {
  const usedIds = new Set();
  const headings = [];

  const htmlWithIds = html.replace(/<(h[23])([^>]*)>([\s\S]*?)<\/\1>/gi, (match, tag, attrs, content) => {
    const plainText = content.replace(/<[^>]+>/g, '').replace(/&[^;]+;/g, '').trim();
    if (!plainText) return match;

    let base = plainText.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim().replace(/\s+/g, '-') || 'section';
    let id = base;
    let n = 1;
    while (usedIds.has(id)) id = `${base}-${n++}`;
    usedIds.add(id);

    headings.push({ tag, id, text: plainText });
    return `<${tag}${attrs} id="${id}">${content}</${tag}>`;
  });

  if (headings.length < 3) return { htmlWithIds, toc: '' };

  const items = headings.map(h =>
    `<li class="toc-${h.tag}"><a href="#${h.id}">${h.text}</a></li>`
  ).join('\n');

  const toc = `<nav class="toc"><details open><summary>contents</summary><ul>${items}</ul></details></nav>`;
  return { htmlWithIds, toc };
}

// --- Navigation ---

const NAV = {
  en: {
    lang: 'en',
    homeUrl: '/',
    navAbout: 'about',
    aboutUrl: '/about/',
    postsUrl: '/posts/',
    navExperiences: 'experiences',
    experiencesUrl: '/experiences/',
    langUrl: '/pt-br/',
    langLabel: 'pt-br',
    postsHeading: 'posts',
    postBase: '/posts/',
  },
  'pt-br': {
    lang: 'pt-BR',
    homeUrl: '/pt-br/',
    navAbout: 'sobre',
    aboutUrl: '/pt-br/sobre/',
    postsUrl: '/pt-br/posts/',
    navExperiences: 'experiências',
    experiencesUrl: '/pt-br/experiencias/',
    langUrl: '/',
    langLabel: 'en',
    postsHeading: 'posts',
    postBase: '/pt-br/posts/',
  },
};

function baseVars(locale) {
  return { ...NAV[locale], year: new Date().getFullYear(), pageTitle: 'Tacio Costa' };
}

// --- Parse markdown ---

function parseFile(filePath) {
  const raw = fs.readFileSync(filePath, 'utf-8');
  const { data, content } = matter(raw);
  const html = marked(content);
  return { data, html };
}

function isPtBr(filename) {
  return filename.endsWith('.pt-br.md');
}

// --- Build homepage ---

function buildHomepage(enPosts, allUrls) {
  const tpl = readTemplate('home.html');

  const recentItems = enPosts.slice(0, 3).map(p =>
    `<li><a href="/posts/${p.slug}/">${p.title}</a><span class="post-year">${formatYear(p.date)}</span></li>`
  ).join('\n    ');

  const enVars = baseVars('en');
  const enSeo = seoVars('/', '/', '/pt-br/');
  allUrls.push(enSeo.canonicalUrl);
  write(path.join(PUBLIC, 'index.html'),
    renderPage(tpl, { ...enVars, recentItems }, { ...enVars, ...enSeo, pageTitle: 'Tacio Costa' }));

  const ptVars = baseVars('pt-br');
  const ptSeo = seoVars('/pt-br/', '/', '/pt-br/');
  allUrls.push(ptSeo.canonicalUrl);
  write(path.join(PUBLIC, 'pt-br', 'index.html'),
    renderPage(tpl, { ...ptVars, recentItems }, { ...ptVars, ...ptSeo, pageTitle: 'Tacio Costa' }));
}

// --- Build pages (about, experiences) ---

const PAGE_SEO = {
  'about.md':             { canonicalPath: '/about/',              hreflangEn: '/about/',       hreflangPt: '/pt-br/sobre/' },
  'about.pt-br.md':       { canonicalPath: '/pt-br/sobre/',        hreflangEn: '/about/',       hreflangPt: '/pt-br/sobre/' },
  'experiences.md':       { canonicalPath: '/experiences/',         hreflangEn: '/experiences/', hreflangPt: '/pt-br/experiencias/' },
  'experiences.pt-br.md': { canonicalPath: '/pt-br/experiencias/',  hreflangEn: '/experiences/', hreflangPt: '/pt-br/experiencias/' },
};

function buildPages(allUrls) {
  const pageTpl = readTemplate('page.html');
  const pageFiles = ['about.md', 'about.pt-br.md', 'experiences.md', 'experiences.pt-br.md'];

  for (const file of pageFiles) {
    const filePath = path.join(CONTENT, file);
    if (!fs.existsSync(filePath)) continue;

    const { data, html } = parseFile(filePath);
    const locale = isPtBr(file) ? 'pt-br' : 'en';
    const nav = baseVars(locale);
    const { canonicalPath, hreflangEn, hreflangPt } = PAGE_SEO[file];
    const seo = seoVars(canonicalPath, hreflangEn, hreflangPt);
    const outDir = locale === 'pt-br'
      ? path.join(PUBLIC, 'pt-br', data.slug)
      : path.join(PUBLIC, data.slug);

    allUrls.push(seo.canonicalUrl);
    write(path.join(outDir, 'index.html'),
      renderPage(pageTpl, { title: data.title, body: html },
        { ...nav, ...seo, pageTitle: `${data.title} | Tacio Costa` }));
  }
}

// --- Build posts ---

function buildPosts(allUrls) {
  const postTpl = readTemplate('post.html');
  const listTpl = readTemplate('list.html');
  const postsDir = path.join(CONTENT, 'posts');

  // Parse all posts first
  const allParsed = fs.readdirSync(postsDir)
    .filter(f => f.endsWith('.md'))
    .map(file => {
      const { data, html } = parseFile(path.join(postsDir, file));
      return { file, data, html, locale: isPtBr(file) ? 'pt-br' : 'en' };
    })
    .filter(p => !p.data.draft);

  // Build EN slug → PT slug map
  const ptSlugByEnSlug = {};
  for (const p of allParsed.filter(p => p.locale === 'pt-br')) {
    const enFile = p.file.replace('.pt-br.md', '.md');
    const enPost = allParsed.find(q => q.file === enFile);
    if (enPost) ptSlugByEnSlug[enPost.data.slug] = p.data.slug;
  }

  const byDateDesc = (a, b) => String(b.data.date).localeCompare(String(a.data.date));
  const enPosts = allParsed.filter(p => p.locale === 'en').sort(byDateDesc);
  const ptPosts = allParsed.filter(p => p.locale === 'pt-br').sort(byDateDesc);

  function renderPosts(posts) {
    posts.forEach((p, i) => {
      const { data, html, locale } = p;
      const slug = data.slug;
      const nav = baseVars(locale);

      const enSlug = locale === 'en' ? slug
        : Object.keys(ptSlugByEnSlug).find(k => ptSlugByEnSlug[k] === slug) || slug;
      const ptSlug = locale === 'en' ? (ptSlugByEnSlug[slug] || slug) : slug;
      const canonicalPath = locale === 'pt-br' ? `/pt-br/posts/${slug}/` : `/posts/${slug}/`;
      const seo = seoVars(canonicalPath, `/posts/${enSlug}/`, `/pt-br/posts/${ptSlug}/`, postDescription(html));

      const rt = readingTime(html, locale);
      const { htmlWithIds, toc } = generateToC(html);

      const prev = posts[i - 1];
      const next = posts[i + 1];
      const postBase = nav.postBase;
      const prevLink = prev
        ? `<a href="${postBase}${prev.data.slug}/" class="post-nav-prev">← ${prev.data.title}</a>`
        : '';
      const nextLink = next
        ? `<a href="${postBase}${next.data.slug}/" class="post-nav-next">${next.data.title} →</a>`
        : '';

      const tagsHtml = (data.tags || []).map(t => `<span class="tag">${t}</span>`).join(' ');
      const outDir = locale === 'pt-br'
        ? path.join(PUBLIC, 'pt-br', 'posts', slug)
        : path.join(PUBLIC, 'posts', slug);

      allUrls.push(seo.canonicalUrl);
      write(path.join(outDir, 'index.html'),
        renderPage(postTpl,
          { title: data.title, date: String(data.date), dateDisplay: formatDate(data.date),
            readingTime: rt, tags: tagsHtml, toc, body: htmlWithIds, prevLink, nextLink },
          { ...nav, ...seo, extraHead: HLJS_EXTRA_HEAD, pageTitle: `${data.title} | Tacio Costa` }));
    });
  }

  renderPosts(enPosts);
  renderPosts(ptPosts);

  // Build post lists
  function buildList(posts, locale) {
    const nav = baseVars(locale);
    const canonicalPath = locale === 'pt-br' ? '/pt-br/posts/' : '/posts/';
    const seo = seoVars(canonicalPath, '/posts/', '/pt-br/posts/');

    // Collect unique tags across posts in this locale
    const tagSet = new Set();
    posts.forEach(p => (p.data.tags || []).forEach(t => tagSet.add(t)));
    const tagFilters = [...tagSet].sort().map(t =>
      `<button class="tag-btn" data-tag="${t}">${t}</button>`
    ).join('\n    ');

    const items = posts.map(p => {
      const rt = readingTime(p.html, locale);
      const tagsAttr = (p.data.tags || []).join(',');
      return `<li data-title="${p.data.title.toLowerCase()}" data-tags="${tagsAttr}">` +
        `<a href="${nav.postBase}${p.data.slug}/">${p.data.title}</a>` +
        `<span class="post-right"><span class="reading-time">${rt}</span>` +
        `<time>${formatDate(p.data.date)}</time></span></li>`;
    }).join('\n    ');

    return renderPage(listTpl, { heading: nav.postsHeading, tagFilters, items },
      { ...nav, ...seo, extraHead: FILTER_EXTRA_HEAD, pageTitle: `Posts | Tacio Costa` });
  }

  write(path.join(PUBLIC, 'posts', 'index.html'), buildList(enPosts, 'en'));
  write(path.join(PUBLIC, 'pt-br', 'posts', 'index.html'), buildList(ptPosts, 'pt-br'));

  return enPosts.map(p => ({ title: p.data.title, date: String(p.data.date), slug: p.data.slug, locale: 'en' }));
}

// --- Build RSS feed ---

function buildRss(enPosts) {
  const postsDir = path.join(CONTENT, 'posts');
  const items = enPosts.slice(0, 10).map(p => {
    const { html } = parseFile(path.join(postsDir, `${p.slug}.md`));
    const pubDate = new Date(p.date + 'T00:00:00Z').toUTCString();
    const escaped = html.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    return `\n  <item>\n    <title>${p.title}</title>\n    <link>${BASE_URL}/posts/${p.slug}/</link>\n    <pubDate>${pubDate}</pubDate>\n    <description>${escaped}</description>\n  </item>`;
  });

  const rss = `<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0">\n  <channel>\n    <title>Tacio Costa</title>\n    <link>${BASE_URL}</link>\n    <description>${DEFAULT_DESCRIPTION}</description>\n    ${items.join('')}\n  </channel>\n</rss>`;
  write(path.join(PUBLIC, 'posts', 'index.xml'), rss);
  write(path.join(PUBLIC, 'index.xml'), rss);
}

// --- Build sitemap + robots ---

function buildSitemap(allUrls) {
  const locs = allUrls.map(u => `  <url><loc>${u}</loc></url>`).join('\n');
  write(path.join(PUBLIC, 'sitemap.xml'),
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${locs}\n</urlset>`);
  write(path.join(PUBLIC, 'robots.txt'),
    `User-agent: *\nAllow: /\nSitemap: ${BASE_URL}/sitemap.xml\n`);
}

// --- Build 404 ---

function build404() {
  const pageTpl = readTemplate('page.html');
  const nav = baseVars('en');
  const seo = seoVars('/', '/', '/pt-br/');
  write(path.join(PUBLIC, '404.html'),
    renderPage(pageTpl, { title: '404', body: '<p>Page not found. <a href="/">Go home.</a></p>' },
      { ...nav, ...seo, pageTitle: '404 | Tacio Costa' }));
}

// --- Main ---

if (fs.existsSync(PUBLIC)) fs.rmSync(PUBLIC, { recursive: true });
mkdir(PUBLIC);
copyDir(STATIC, PUBLIC);

const allUrls = [];
const enPosts = buildPosts(allUrls);
buildHomepage(enPosts, allUrls);
buildPages(allUrls);
buildRss(enPosts);
buildSitemap(allUrls);
build404();

console.log('Build complete.');
