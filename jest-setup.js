import { registerSa11yMatcher } from '@sa11y/jest';
import structuredClone from '@ungap/structured-clone';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

if (typeof globalThis.structuredClone !== 'function') {
  globalThis.structuredClone = structuredClone;
}

registerSa11yMatcher();

// Components import their texts as Custom Labels. Without a mock, a label is its name in tests, e.g.
// "c.ErrorAlert_Error", so every label gets its English value from the labels file instead.
const XML_ENTITIES = { '&lt;': '<', '&gt;': '>', '&quot;': '"', '&apos;': "'", '&amp;': '&' };
const labelsFile = readFileSync(join(__dirname, 'force-app/main/default/labels/CustomLabels.labels-meta.xml'), 'utf8');
for (const [, label] of labelsFile.matchAll(/<labels>([\s\S]*?)<\/labels>/g)) {
  // Prettier may break long tags, e.g. "<value\n    >text</value>"
  const name = /<fullName\s*>(.*?)<\/fullName\s*>/.exec(label)[1];
  const value = /<value\s*>([\s\S]*?)<\/value\s*>/
    .exec(label)[1]
    .replace(/&(lt|gt|quot|apos|amp);/g, (e) => XML_ENTITIES[e]);
  jest.doMock(`@salesforce/label/c.${name}`, () => ({ default: value }), { virtual: true });
}
