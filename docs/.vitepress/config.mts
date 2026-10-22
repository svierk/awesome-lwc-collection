import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { defineConfig } from 'vitepress';
import llmstxt from 'vitepress-plugin-llms';
import { absolutizeFile } from '../../scripts/docs/llms-links.mjs';

// Sidebar is generated from the component READMEs by scripts/docs/generate.mjs,
// which runs before every dev/build. See package.json "docs:*" scripts.
const { sidebar } = JSON.parse(readFileSync(new URL('./generated.json', import.meta.url), 'utf-8'));

const siteUrl = 'https://svierk.github.io/awesome-lwc-collection/';
const base = '/awesome-lwc-collection/';
const repoBlob = 'https://github.com/svierk/awesome-lwc-collection/blob/main/';

export default defineConfig({
  title: 'Awesome LWC Collection',
  description: 'A curated collection of ready-to-use Lightning Web Components for your SFDX project.',
  lang: 'en-US',
  base,
  cleanUrls: true,
  lastUpdated: true,
  head: [['link', { rel: 'icon', href: '/awesome-lwc-collection/images/awesome-lwc-collection-logo.png' }]],
  vite: {
    // AI-friendly docs: llms.txt (an index of the site), llms-full.txt (every
    // page in one file) and a Markdown copy of each page next to its HTML, for
    // agents that read the docs while they work. Its `domain` option is left
    // out on purpose: it also rewrites links inside the pages, and mangles them
    // under a base path - buildEnd below makes them absolute instead.
    plugins: [llmstxt()]
  },
  // The Markdown copies are read on their own, so their relative and
  // root-relative links would resolve against nothing - see
  // scripts/docs/llms-links.mjs. llms.txt itself only links pages, by path.
  buildEnd({ outDir, srcDir }) {
    const isFile = (path) => existsSync(join(srcDir, path));
    for (const file of readdirSync(outDir, { recursive: true })) {
      if (!/\.md$|^llms-full\.txt$/.test(file)) continue;
      const path = join(outDir, file);
      writeFileSync(path, absolutizeFile(readFileSync(path, 'utf-8'), { base, isFile, siteUrl, repoBlob }));
    }
    const index = join(outDir, 'llms.txt');
    writeFileSync(index, readFileSync(index, 'utf-8').replaceAll(`](${base}`, `](${siteUrl}`));
  },
  themeConfig: {
    logo: '/images/awesome-lwc-collection-logo.png',
    nav: [
      { text: 'Home', link: '/' },
      { text: 'Components', link: '/components/customDatatable' },
      { text: 'GitHub', link: 'https://github.com/svierk/awesome-lwc-collection' }
    ],
    sidebar: {
      '/components/': sidebar
    },
    search: {
      provider: 'local'
    },
    socialLinks: [{ icon: 'github', link: 'https://github.com/svierk/awesome-lwc-collection' }],
    footer: {
      message: `Released under the MIT License. · <a href="${base}llms.txt">llms.txt</a> for AI agents`,
      copyright: 'Copyright © Sebastiano Schwarz'
    }
  }
});
