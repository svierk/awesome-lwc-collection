/**
 * Checks how links in the Markdown copies of the docs are made absolute - see
 * scripts/docs/llms-links.mjs. Run with `npm run test:docs`.
 */
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { absolutizeFile, absolutizeLinks, resolveLink, sourcePathFor } from './llms-links.mjs';

const base = '/awesome-lwc-collection/';
const urls = {
  siteUrl: 'https://svierk.github.io/awesome-lwc-collection/',
  repoBlob: 'https://github.com/svierk/awesome-lwc-collection/blob/main/'
};
const site = (path) => `${urls.siteUrl}${path}`;
const repo = (path) => `${urls.repoBlob}${path}`;

describe('resolveLink', () => {
  const cases = [
    // [target, page it appears on, expected]
    ['/images/custom-datatable.png', 'components/customDatatable.md', site('images/custom-datatable.png')],
    ['/icons/qrCodeGenerator.svg', 'index.md', site('icons/qrCodeGenerator.svg')],
    ['/components/graphqlDatatable', 'components/customDatatable.md', site('components/graphqlDatatable.md')],
    ['graphqlMapView.md', 'components/customMapView.md', site('components/graphqlMapView.md')],
    [
      'customDatatable.md#attributes',
      'components/graphqlDatatable.md',
      site('components/customDatatable.md#attributes')
    ],
    ['/', 'components/iFrame.md', site('')],
    ['../../CONTRIBUTING.md', 'components/iFrame.md', repo('CONTRIBUTING.md')],
    ['https://medium.com/@svierk', 'components/customDatatable.md', 'https://medium.com/@svierk'],
    ['mailto:someone@example.com', 'components/iFrame.md', 'mailto:someone@example.com'],
    ['#usage', 'components/customDatatable.md', '#usage']
  ];
  for (const [target, page, expected] of cases) {
    test(`${target} on ${page}`, () => assert.equal(resolveLink(target, page, urls), expected));
  }
});

test('absolutizeLinks leaves fenced code alone', () => {
  const markdown =
    '![custom-datatable](/images/custom-datatable.png)\n\n```html\n<!-- [x](y.md) -->\n```\n\nSee [GraphQL Datatable](graphqlDatatable.md).\n';
  assert.equal(
    absolutizeLinks(markdown, 'components/customDatatable.md', urls),
    `![custom-datatable](${site('images/custom-datatable.png')})\n\n\`\`\`html\n<!-- [x](y.md) -->\n\`\`\`\n\nSee [GraphQL Datatable](${site('components/graphqlDatatable.md')}).\n`
  );
});

test('absolutizeLinks drops the display width of an image', () => {
  const markdown = '![QR](/images/qr.png){width=270}\n\n```md\n![QR](/images/qr.png){width=270}\n```\n';
  assert.equal(
    absolutizeLinks(markdown, 'components/qrCodeGenerator.md', urls),
    `![QR](${site('images/qr.png')})\n\n\`\`\`md\n![QR](/images/qr.png){width=270}\n\`\`\`\n`
  );
});

test('absolutizeLinks replaces a teaser with its poster image', () => {
  const markdown =
    '<ComponentTeaser name="customCarousel" alt="Custom Carousel" width="590"/>\n\n```md\n<ComponentTeaser name="x" alt="y"/>\n```\n';
  assert.equal(
    absolutizeLinks(markdown, 'components/customCarousel.md', urls),
    `![Custom Carousel](${site('images/customCarousel/poster.png')})\n\n\`\`\`md\n<ComponentTeaser name="x" alt="y"/>\n\`\`\`\n`
  );
});

test('sourcePathFor finds index pages', () => {
  const isFile = (path) => path === 'components/index.md';
  assert.equal(sourcePathFor(`${base}components.md`, base, isFile), 'components/index.md');
  assert.equal(sourcePathFor(`${base}components/customDatatable.md`, base, isFile), 'components/customDatatable.md');
});

test('absolutizeFile resolves each page of llms-full.txt against its own url', () => {
  const content = [
    `---\nurl: ${base}components/customDatatable.md\n---\n# Custom Datatable\n\n![custom-datatable](/images/custom-datatable.png)\n\n`,
    `---\nurl: ${base}components/graphqlDatatable.md\ndescription: >-\n  A datatable,\n  powered by GraphQL.\n---\n# GraphQL Datatable\n\n[Custom Datatable](customDatatable.md)\n`
  ].join('');
  const result = absolutizeFile(content, { base, isFile: () => false, ...urls });
  assert.match(
    result,
    /!\[custom-datatable\]\(https:\/\/svierk\.github\.io\/awesome-lwc-collection\/images\/custom-datatable\.png\)/
  );
  assert.match(
    result,
    /\[Custom Datatable\]\(https:\/\/svierk\.github\.io\/awesome-lwc-collection\/components\/customDatatable\.md\)/
  );
  assert.match(
    result,
    /^---\nurl: \/awesome-lwc-collection\/components\/graphqlDatatable\.md\ndescription: >-\n {2}A datatable,\n {2}powered by GraphQL\.\n---\n/m
  );
});
