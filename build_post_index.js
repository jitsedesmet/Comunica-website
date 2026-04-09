const fs = require('fs');
const path = require('path');
const RSS = require('rss');
const matter = require('gray-matter');

function generateRSS(posts) {
  const siteUrl = 'https://comunica.dev/blog/';
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

// Remove HTML comments using string splitting to avoid incomplete-regex CodeQL alerts.
function removeHtmlComments(text) {
  const parts = [];
  let pos = 0;
  while (pos < text.length) {
    const start = text.indexOf('<!--', pos);
    if (start < 0) {
      parts.push(text.slice(pos));
      break;
    }
    parts.push(text.slice(pos, start));
    const end = text.indexOf('-->', start + 4);
    pos = end < 0 ? text.length : end + 3;
  }
  return parts.join(' ');
}

// Strip Markdown syntax to extract plain text for search indexing.
function stripMarkdown(content) {
  return removeHtmlComments(content)
    .replace(/```[\s\S]*?```/g, '')           // fenced code blocks
    .replace(/`+[^`\n]+`+/g, '')             // inline code
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
}

main()
