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
  return render(base, { ...pageVars, body });
}

// --- SEO helpers ---

function seoVars(canonicalPath, hreflangEnPath, hreflangPtPath, description) {
  const canonicalUrl = BASE_URL + canonicalPath;
  const hreflangEn = BASE_URL + hreflangEnPath;
  const hreflangPt = BASE_URL + hreflangPtPath;
  return { canonicalUrl, hreflangEn, hreflangPt, description: description || DEFAULT_DESCRIPTION };
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
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  });
}

function formatYear(dateStr) {
  return String(dateStr).slice(0, 4);
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
  return {
    ...NAV[locale],
    year: new Date().getFullYear(),
    pageTitle: 'Tacio Costa',
  };
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

  const recentItems = enPosts
    .slice(0, 3)
    .map(
      p =>
        `<li><a href="/posts/${p.slug}/">${p.title}</a><span class="post-year">${formatYear(p.date)}</span></li>`
    )
    .join('\n    ');

  const enVars = baseVars('en');
  const enSeo = seoVars('/', '/', '/pt-br/');
  allUrls.push(enSeo.canonicalUrl);
  write(
    path.join(PUBLIC, 'index.html'),
    renderPage(tpl, { ...enVars, recentItems }, { ...enVars, ...enSeo, pageTitle: 'Tacio Costa' })
  );

  const ptVars = baseVars('pt-br');
  const ptSeo = seoVars('/pt-br/', '/', '/pt-br/');
  allUrls.push(ptSeo.canonicalUrl);
  write(
    path.join(PUBLIC, 'pt-br', 'index.html'),
    renderPage(tpl, { ...ptVars, recentItems }, { ...ptVars, ...ptSeo, pageTitle: 'Tacio Costa' })
  );
}

// --- Build pages (about, experiences) ---

const PAGE_SEO = {
  'about.md':             { canonicalPath: '/about/',               hreflangEn: '/about/',        hreflangPt: '/pt-br/sobre/' },
  'about.pt-br.md':       { canonicalPath: '/pt-br/sobre/',         hreflangEn: '/about/',        hreflangPt: '/pt-br/sobre/' },
  'experiences.md':       { canonicalPath: '/experiences/',          hreflangEn: '/experiences/',  hreflangPt: '/pt-br/experiencias/' },
  'experiences.pt-br.md': { canonicalPath: '/pt-br/experiencias/',   hreflangEn: '/experiences/',  hreflangPt: '/pt-br/experiencias/' },
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
    const outDir =
      locale === 'pt-br'
        ? path.join(PUBLIC, 'pt-br', data.slug)
        : path.join(PUBLIC, data.slug);

    allUrls.push(seo.canonicalUrl);
    write(
      path.join(outDir, 'index.html'),
      renderPage(
        pageTpl,
        { title: data.title, body: html },
        { ...nav, ...seo, pageTitle: `${data.title} | Tacio Costa` }
      )
    );
  }
}

// --- Build posts ---

function buildPosts(allUrls) {
  const postTpl = readTemplate('post.html');
  const listTpl = readTemplate('list.html');
  const postsDir = path.join(CONTENT, 'posts');

  const enPosts = [];
  const ptPosts = [];

  // Map EN slug → PT slug for hreflang
  const ptSlugByEnSlug = {};
  for (const file of fs.readdirSync(postsDir).filter(f => f.endsWith('.pt-br.md'))) {
    const { data } = parseFile(path.join(postsDir, file));
    const enFile = file.replace('.pt-br.md', '.md');
    if (fs.existsSync(path.join(postsDir, enFile))) {
      const { data: enData } = parseFile(path.join(postsDir, enFile));
      ptSlugByEnSlug[enData.slug] = data.slug;
    }
  }

  for (const file of fs.readdirSync(postsDir).filter(f => f.endsWith('.md'))) {
    const { data, html } = parseFile(path.join(postsDir, file));
    if (data.draft) continue;

    const locale = isPtBr(file) ? 'pt-br' : 'en';
    const nav = baseVars(locale);
    const slug = data.slug;

    const canonicalPath = locale === 'pt-br' ? `/pt-br/posts/${slug}/` : `/posts/${slug}/`;
    const enSlug = locale === 'en' ? slug : Object.keys(ptSlugByEnSlug).find(k => ptSlugByEnSlug[k] === slug) || slug;
    const ptSlug = locale === 'en' ? (ptSlugByEnSlug[slug] || slug) : slug;
    const hreflangEnPath = `/posts/${enSlug}/`;
    const hreflangPtPath = `/pt-br/posts/${ptSlug}/`;
    const seo = seoVars(canonicalPath, hreflangEnPath, hreflangPtPath, postDescription(html));

    const tagsHtml = (data.tags || [])
      .map(t => `<span class="tag">${t}</span>`)
      .join(' ');

    const outDir =
      locale === 'pt-br'
        ? path.join(PUBLIC, 'pt-br', 'posts', slug)
        : path.join(PUBLIC, 'posts', slug);

    allUrls.push(seo.canonicalUrl);
    write(
      path.join(outDir, 'index.html'),
      renderPage(
        postTpl,
        {
          title: data.title,
          date: String(data.date),
          dateDisplay: formatDate(data.date),
          tags: tagsHtml,
          body: html,
        },
        { ...nav, ...seo, pageTitle: `${data.title} | Tacio Costa` }
      )
    );

    const meta = { title: data.title, date: String(data.date), slug, locale };
    if (locale === 'pt-br') {
      ptPosts.push(meta);
    } else {
      enPosts.push(meta);
    }
  }

  const byDateDesc = (a, b) => b.date.localeCompare(a.date);
  enPosts.sort(byDateDesc);
  ptPosts.sort(byDateDesc);

  const buildList = (posts, locale) => {
    const nav = baseVars(locale);
    const canonicalPath = locale === 'pt-br' ? '/pt-br/posts/' : '/posts/';
    const seo = seoVars(canonicalPath, '/posts/', '/pt-br/posts/');
    const items = posts
      .map(
        p =>
          `<li><a href="${nav.postBase}${p.slug}/">${p.title}</a><time>${formatDate(p.date)}</time></li>`
      )
      .join('\n    ');
    return renderPage(
      listTpl,
      { heading: nav.postsHeading, items },
      { ...nav, ...seo, pageTitle: `Posts | Tacio Costa` }
    );
  };

  write(path.join(PUBLIC, 'posts', 'index.html'), buildList(enPosts, 'en'));
  write(path.join(PUBLIC, 'pt-br', 'posts', 'index.html'), buildList(ptPosts, 'pt-br'));

  return enPosts;
}

// --- Build RSS feed ---

function buildRss(enPosts) {
  const postsDir = path.join(CONTENT, 'posts');
  const items = enPosts.slice(0, 10).map(p => {
    const { html } = parseFile(path.join(postsDir, `${p.slug}.md`));
    const pubDate = new Date(p.date + 'T00:00:00Z').toUTCString();
    const escaped = html.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    return `
  <item>
    <title>${p.title}</title>
    <link>${BASE_URL}/posts/${p.slug}/</link>
    <pubDate>${pubDate}</pubDate>
    <description>${escaped}</description>
  </item>`;
  });

  const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Tacio Costa</title>
    <link>${BASE_URL}</link>
    <description>${DEFAULT_DESCRIPTION}</description>
    ${items.join('')}
  </channel>
</rss>`;

  write(path.join(PUBLIC, 'posts', 'index.xml'), rss);
  write(path.join(PUBLIC, 'index.xml'), rss);
}

// --- Build sitemap + robots ---

function buildSitemap(allUrls) {
  const locs = allUrls.map(u => `  <url><loc>${u}</loc></url>`).join('\n');
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${locs}
</urlset>`;
  write(path.join(PUBLIC, 'sitemap.xml'), xml);
  write(path.join(PUBLIC, 'robots.txt'), `User-agent: *\nAllow: /\nSitemap: ${BASE_URL}/sitemap.xml\n`);
}

// --- Build 404 ---

function build404() {
  const pageTpl = readTemplate('page.html');
  const nav = baseVars('en');
  const seo = seoVars('/', '/', '/pt-br/');
  const body = `<p>Page not found. <a href="/">Go home.</a></p>`;
  write(
    path.join(PUBLIC, '404.html'),
    renderPage(pageTpl, { title: '404', body }, { ...nav, ...seo, pageTitle: '404 | Tacio Costa' })
  );
}

// --- Main ---

if (fs.existsSync(PUBLIC)) {
  fs.rmSync(PUBLIC, { recursive: true });
}
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
