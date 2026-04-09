const fs = require('fs');
const path = require('path');
const RSS = require('rss');
const matter = require('gray-matter');

const SITE_URL = 'https://comunica.dev';

function generateRSS(posts) {
  const siteUrl = SITE_URL + '/blog/';
  const feed = new RSS({
    title: 'Comunica – Blog',
    description: 'Blog posts, containing announcements or other news.',
    site_url: siteUrl
  });
  for(const p in posts){
    const [_, year, month, day] = /(?:^|\/)([0-9][0-9][0-9][0-9])-([0-9][0-9])-([0-9][0-9])-[^\/]*$/.exec(p);
    const date = new Date(Date.UTC(year, month, day)).toUTCString();
    const title = posts[p].data.title;
    const guid = p;
    const url = siteUrl+p.slice(11, -3)+'/';

    feed.item({
      title,
      guid,
      url,
      date
    });
  }
  return feed.xml({ indent: true })
      .replace(/<lastBuildDate>.*<\/lastBuildDate>/, '');
}

function scanDir(dirPath, extension) {
  const mdFiles = [];
  const filenames = fs.readdirSync(dirPath);
  filenames.sort();
  filenames.map(filename => {
    const filePath = path.join(dirPath, filename);
    const st = fs.statSync(filePath);
    if (st.isFile() && filePath.endsWith(extension)) {
      mdFiles.push(filePath);
    }
  })
  return mdFiles;
}

function scanDirRecursive(dirPath, extension) {
  const results = [];
  const filenames = fs.readdirSync(dirPath);
  filenames.sort();
  for (const filename of filenames) {
    const filePath = path.join(dirPath, filename);
    const st = fs.statSync(filePath);
    if (st.isDirectory()) {
      results.push(...scanDirRecursive(filePath, extension));
    } else if (st.isFile() && filePath.endsWith(extension)) {
      results.push(filePath);
    }
  }
  return results;
}

// Convert a pages/*.md file path to a URL path, stripping numeric prefixes.
function filePathToUrlPath(filePath) {
  // e.g. pages/docs/1_query/1_getting_started.md -> /docs/query/getting-started/
  let urlPath = filePath
    .replace(/^pages/, '')   // remove leading "pages"
    .replace(/\.md$/, '/');  // replace .md with trailing slash
  // Remove numeric sort prefixes like /1_ /2_ etc.
  urlPath = urlPath.replace(/\/[0-9]+_/g, '/');
  return urlPath;
}

// Strip Markdown syntax to extract plain text for search indexing.
function stripMarkdown(content) {
  return content
    .replace(/<!--[\s\S]*?-->/g, '')          // HTML comments (closed)
    .replace(/<!--[\s\S]*/g, '')              // unclosed HTML comments
    .replace(/```[\s\S]*?```/g, '')           // fenced code blocks
    .replace(/`+[^`\n]+`+/g, '')             // inline code (one or more backticks)
    .replace(/!\[.*?\]\(.*?\)/g, '')          // images
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // links → text
    .replace(/#{1,6}\s+/g, '')               // headings
    .replace(/[*_~]{1,3}([^*_~]+)[*_~]{1,3}/g, '$1') // bold/italic
    .replace(/^\s*[-*+>|]\s*/gm, '')         // list items / blockquotes / table pipes
    .replace(/\s+/g, ' ')                    // collapse whitespace
    .trim();
}

function generateSearchIndex(allMdFiles) {
  const entries = [];
  for (const filePath of allMdFiles) {
    const raw = fs.readFileSync(filePath, { encoding: 'utf-8' });
    const parsed = matter(raw, { excerpt_separator: '<!-- excerpt-end -->' });
    const { data, content, excerpt } = parsed;
    if (!data.title) continue; // skip files without a title
    const urlPath = filePathToUrlPath(filePath);
    entries.push({
      path: urlPath,
      title: data.title || '',
      description: data.description || '',
      content: stripMarkdown(excerpt || content).slice(0, 500),
    });
  }
  return entries;
}

function generateSitemap(allMdFiles) {
  const now = new Date().toISOString().split('T')[0];
  const urls = allMdFiles
    .map(f => filePathToUrlPath(f))
    .map(urlPath => `  <url>\n    <loc>${SITE_URL}${urlPath}</loc>\n    <lastmod>${now}</lastmod>\n  </url>`)
    .join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
}

function generateLlmsTxt(allMdFiles) {
  const lines = [
    '# Comunica',
    '',
    '> Comunica is a highly modular and flexible meta query engine for the Web, primarily designed to execute SPARQL and GraphQL queries over decentralized Linked Data sources.',
    '',
    '## Documentation',
    '',
  ];

  // Group by top-level section
  const sections = {};
  for (const filePath of allMdFiles) {
    const raw = fs.readFileSync(filePath, { encoding: 'utf-8' });
    const parsed = matter(raw);
    const { data } = parsed;
    if (!data.title) continue;
    const urlPath = filePathToUrlPath(filePath);
    // Derive section from the first path segment after /
    const segment = urlPath.split('/').filter(Boolean)[0] || 'other';
    if (!sections[segment]) sections[segment] = [];
    sections[segment].push({ urlPath, title: data.title, description: data.description || '' });
  }

  for (const [section, pages] of Object.entries(sections)) {
    lines.push(`### ${section.charAt(0).toUpperCase() + section.slice(1)}`);
    lines.push('');
    for (const { urlPath, title, description } of pages) {
      const desc = description ? `: ${description}` : '';
      lines.push(`- [${title}](${SITE_URL}${urlPath})${desc}`);
    }
    lines.push('');
  }

  return lines.join('\n');
}

async function main() {
  const postPaths = scanDir(path.join('pages','blog'), '.md');
  const now = new Date();
  const posts = postPaths
    .map(file => fs.readFileSync(file, {encoding: 'utf-8'}))
    .map(content => matter(content, { excerpt_separator: '<!-- excerpt-end -->' }))
    .reduce((acc, content, i) => {
        acc[postPaths[i]] = content;
        return acc;
    }, {});
  const rssPath = 'public/rss-feed.xml';
  const rssXML = generateRSS(posts);
  fs.writeFileSync(rssPath, rssXML);
  console.info(`Saved RSS feed to ${rssPath}`);

  // Collect all markdown files across the entire pages directory
  const allMdFiles = scanDirRecursive('pages', '.md');

  // Search index
  const searchIndex = generateSearchIndex(allMdFiles);
  const searchIndexPath = 'public/search-index.json';
  fs.writeFileSync(searchIndexPath, JSON.stringify(searchIndex));
  console.info(`Saved search index to ${searchIndexPath} (${searchIndex.length} entries)`);

  // Sitemap
  const sitemapPath = 'public/sitemap.xml';
  fs.writeFileSync(sitemapPath, generateSitemap(allMdFiles));
  console.info(`Saved sitemap to ${sitemapPath}`);

  // llms.txt for AI agents
  const llmsPath = 'public/llms.txt';
  fs.writeFileSync(llmsPath, generateLlmsTxt(allMdFiles));
  console.info(`Saved llms.txt to ${llmsPath}`);
}

main()
