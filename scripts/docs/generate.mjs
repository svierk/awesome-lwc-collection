#!/usr/bin/env node
/**
 * Generates the VitePress documentation from the per-component READMEs.
 *
 * Single source of truth: force-app/main/default/lwc/<component>/README.md
 * Only components that ship a README are treated as public components - every
 * other LWC in the project is a child/supporting component and stays out of the
 * catalog. Running this on every build keeps the site in sync automatically.
 */
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const lwcDir = join(root, 'force-app', 'main', 'default', 'lwc');
const imagesDir = join(root, 'images');
const docsDir = join(root, 'docs');
const componentsOutDir = join(docsDir, 'components');
const publicDir = join(docsDir, 'public');
const vitepressDir = join(docsDir, '.vitepress');

const siteConfig = JSON.parse(readFileSync(join(root, 'scripts', 'docs', 'site.config.json'), 'utf-8'));

/** Discover every LWC directory that ships a README (= a public component). */
function discoverComponents() {
  return readdirSync(lwcDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && existsSync(join(lwcDir, entry.name, 'README.md')))
    .map((entry) => entry.name)
    .sort();
}

/** Turn "[label](url)" into "label" and drop inline code backticks for card text. */
function toPlainText(markdown) {
  return markdown
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/`([^`]*)`/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Extract the H1 title and the first paragraph (used as the short description). */
function parseReadme(markdown) {
  const lines = markdown.split('\n');
  let title = '';
  let description = '';
  let i = 0;
  for (; i < lines.length; i++) {
    const match = lines[i].match(/^#\s+(.*)$/);
    if (match) {
      title = match[1].trim();
      i++;
      break;
    }
  }
  const paragraph = [];
  for (; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) {
      if (paragraph.length) break;
      continue;
    }
    if (line.startsWith('<') || line.startsWith('#') || line.startsWith('|') || line.startsWith('```')) break;
    paragraph.push(line);
  }
  description = toPlainText(paragraph.join(' '));
  return { title, description };
}

/**
 * Rewrite the local screenshot `<img>` tags to Markdown images with an absolute
 * public path so VitePress applies the site `base` correctly on GitHub Pages.
 * External images (e.g. medium.com) are absolute URLs and are left untouched.
 */
function rewriteImages(markdown) {
  return markdown.replace(/<img[^>]*\bsrc="(?:\.\.\/)+images\/([^"]+)"[^>]*>/g, (tag, file) => {
    const altMatch = tag.match(/\balt="([^"]*)"/);
    const alt = altMatch ? altMatch[1] : file;
    return `![${alt}](/images/${file})`;
  });
}

function clean() {
  rmSync(componentsOutDir, { recursive: true, force: true });
  rmSync(publicDir, { recursive: true, force: true });
  mkdirSync(componentsOutDir, { recursive: true });
  mkdirSync(join(publicDir, 'images'), { recursive: true });
  mkdirSync(join(publicDir, 'icons'), { recursive: true });
  mkdirSync(vitepressDir, { recursive: true });
}

function copyAssets(components) {
  cpSync(imagesDir, join(publicDir, 'images'), { recursive: true });
  for (const name of components) {
    const svg = join(lwcDir, name, `${name}.svg`);
    if (existsSync(svg)) cpSync(svg, join(publicDir, 'icons', `${name}.svg`));
  }
}

function writeComponentPages(components) {
  const meta = {};
  for (const name of components) {
    const source = readFileSync(join(lwcDir, name, 'README.md'), 'utf-8');
    const { title, description } = parseReadme(source);
    meta[name] = { title, description, hasIcon: existsSync(join(lwcDir, name, `${name}.svg`)) };
    writeFileSync(join(componentsOutDir, `${name}.md`), rewriteImages(source));
  }
  return meta;
}

/** Build the VitePress sidebar from the configured categories, plus an "Other"
 * bucket so a brand-new component with a README shows up without any config edit. */
function buildSidebar(components, meta) {
  const assigned = new Set();
  const sidebar = [];
  for (const category of siteConfig.categories) {
    const items = [];
    for (const name of category.components) {
      if (!meta[name]) {
        console.warn(`[docs] categorized component "${name}" has no README - skipped`);
        continue;
      }
      assigned.add(name);
      items.push({ text: meta[name].title, link: `/components/${name}` });
    }
    if (items.length) sidebar.push({ text: category.text, collapsed: false, items });
  }
  const leftovers = components.filter((name) => !assigned.has(name));
  if (leftovers.length) {
    sidebar.push({
      text: 'Other',
      collapsed: false,
      items: leftovers.map((name) => ({ text: meta[name].title, link: `/components/${name}` }))
    });
    console.warn(`[docs] uncategorized components in "Other": ${leftovers.join(', ')}`);
  }
  return sidebar;
}

function writeGenerated(sidebar) {
  writeFileSync(join(vitepressDir, 'generated.json'), `${JSON.stringify({ sidebar }, null, 2)}\n`);
}

/** Landing page: hero + one feature card per component, ordered by category. */
function writeIndex(sidebar, meta) {
  const features = [];
  for (const group of sidebar) {
    for (const item of group.items) {
      const name = item.link.split('/').pop();
      const info = meta[name];
      const feature = {
        title: info.title,
        details: info.description,
        link: item.link,
        linkText: 'View docs'
      };
      if (info.hasIcon) feature.icon = { src: `/icons/${name}.svg`, width: 40, height: 40 };
      features.push(feature);
    }
  }

  const fm = { layout: 'home', hero: siteConfig.hero, features };
  const yaml = toYaml(fm);
  writeFileSync(join(docsDir, 'index.md'), `---\n${yaml}---\n`);
}

/** Minimal YAML emitter for our known-shaped frontmatter (strings JSON-quoted). */
function toYaml(value, indent = 0) {
  const pad = '  '.repeat(indent);
  if (Array.isArray(value)) {
    return value
      .map((item) => {
        const body = toYaml(item, indent + 1);
        return `${pad}-\n${body}`;
      })
      .join('');
  }
  if (value && typeof value === 'object') {
    return Object.entries(value)
      .map(([key, val]) => {
        if (val && typeof val === 'object') return `${pad}${key}:\n${toYaml(val, indent + 1)}`;
        return `${pad}${key}: ${JSON.stringify(val)}\n`;
      })
      .join('');
  }
  return `${pad}${JSON.stringify(value)}\n`;
}

function main() {
  const components = discoverComponents();
  if (!components.length) throw new Error('No components with a README found.');
  clean();
  copyAssets(components);
  const meta = writeComponentPages(components);
  const sidebar = buildSidebar(components, meta);
  writeGenerated(sidebar);
  writeIndex(sidebar, meta);
  console.log(`[docs] generated ${components.length} component pages`);
}

main();
