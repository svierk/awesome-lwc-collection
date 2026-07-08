import { readFileSync } from 'node:fs';
import { defineConfig } from 'vitepress';

// Sidebar is generated from the component READMEs by scripts/docs/generate.mjs,
// which runs before every dev/build. See package.json "docs:*" scripts.
const { sidebar } = JSON.parse(readFileSync(new URL('./generated.json', import.meta.url), 'utf-8'));

export default defineConfig({
  title: 'Awesome LWC Collection',
  description: 'A curated collection of ready-to-use Lightning Web Components for your SFDX project.',
  lang: 'en-US',
  base: '/awesome-lwc-collection/',
  cleanUrls: true,
  lastUpdated: true,
  head: [['link', { rel: 'icon', href: '/awesome-lwc-collection/images/awesome-lwc-collection-logo.png' }]],
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
      message: 'Released under the MIT License.',
      copyright: 'Copyright © Sebastiano Schwarz'
    }
  }
});
