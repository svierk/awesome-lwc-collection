/**
 * Makes the links in the Markdown copies of the docs absolute.
 *
 * vitepress-plugin-llms writes every page as Markdown next to its HTML, plus
 * llms-full.txt with all pages in one file. Those copies are read out of
 * context - an agent fetches a single page, or all of them concatenated - so a
 * relative link has nothing left to resolve against, and a root-relative one
 * (like the screenshots the generator rewrites to /images/...) misses the
 * site's base path. After the build, each link is resolved from the page's
 * source file:
 *
 * - a page of the site     -> the Markdown copy of that page on the site
 * - an asset of the site   -> the asset on the site
 * - a file outside docs/   -> the file on GitHub
 * - external URLs, anchors -> unchanged
 *
 * Fenced code blocks are left alone. Run the tests with `npm run test:docs`.
 */
import { posix } from 'node:path';

const EXTERNAL = /^([a-z][a-z0-9+.-]*:|#)/i;

/** Resolve one link target found on the page built from docs/<pagePath>. */
export function resolveLink(target, pagePath, { siteUrl, repoBlob }) {
  if (EXTERNAL.test(target)) return target;
  const hashAt = target.indexOf('#');
  const path = hashAt < 0 ? target : target.slice(0, hashAt);
  const hash = hashAt < 0 ? '' : target.slice(hashAt);
  if (!path) return target;

  // VitePress resolves a leading slash against the docs root.
  const repoPath = path.startsWith('/') ? posix.join('docs', path) : posix.join('docs', posix.dirname(pagePath), path);
  if (!repoPath.startsWith('docs/')) return `${repoBlob}${repoPath}${hash}`;

  let page = repoPath.slice('docs/'.length).replace(/\/$/, '');
  if (page === 'index.md' || page === '' || page === 'index') return `${siteUrl}${hash}`;
  page = page.replace(/\/index(\.md)?$/, '').replace(/\.html$/, '');
  // Assets keep their extension; pages point at their Markdown copy.
  if (!/\.[a-z0-9]+$/i.test(page)) page += '.md';
  return `${siteUrl}${page}${hash}`;
}

/** Rewrite every Markdown link of one page, outside fenced code blocks. */
export function absolutizeLinks(markdown, pagePath, urls) {
  return markdown
    .split(/(^```[\s\S]*?^```)/m)
    .map((part, i) =>
      i % 2 ? part : part.replace(/\]\(([^)\s]+)/g, (m, target) => `](${resolveLink(target, pagePath, urls)}`)
    )
    .join('');
}

/**
 * The source file of a page from the `url` the plugin writes into each copy,
 * e.g. /awesome-lwc-collection/components/customDatatable.md -> components/customDatatable.md.
 */
export function sourcePathFor(url, base, isFile) {
  const path = url.slice(base.length);
  const asIndex = path.replace(/\.md$/, '/index.md');
  return isFile(asIndex) ? asIndex : path;
}

/**
 * Rewrite a file the plugin wrote - one page, or llms-full.txt with many. Each
 * page starts with a front matter block holding its `url`.
 */
export function absolutizeFile(content, { base, isFile, ...urls }) {
  return (
    content
      // The plugin may fold a long description over several lines (`>-`).
      .split(/^(---\nurl: .+\n(?:.*\n)*?---\n)/m)
      .map((part, i, parts) => {
        const header = i % 2 === 0 && i > 0 && parts[i - 1].match(/^---\nurl: (.+)\n/);
        return header ? absolutizeLinks(part, sourcePathFor(header[1], base, isFile), urls) : part;
      })
      .join('')
  );
}
