/**
 * Checks the screenshot rules of the README check - see
 * scripts/component-screenshot.mjs. Run with `npm run test:docs`.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { checkScreenshots } from './component-screenshot.mjs';

const SRC = '../../../../../images/signaturePad/screenshot.png';
const IMAGE = `<img src="${SRC}" alt="Signature Pad" width="360"/>`;
const EXTERNAL = '<img src="https://miro.medium.com/teaser.png" alt="How to build a signature pad" width="350"/>';

const exposed = { exposed: true };
const hidden = { exposed: false };
const allExist = () => true;

const check = (body, { meta = exposed, exists = allExist, title = 'Signature Pad' } = {}) =>
  checkScreenshots({ readme: `# ${title}\n\n${body}\n`, meta, exists });

test('accepts a local image that exists and is named like the component', () => {
  assert.deepEqual(check(IMAGE), []);
});

test('accepts a Markdown image', () => {
  assert.deepEqual(check(`![Signature Pad](${SRC})`), []);
});

test('reads the attributes of an image in any order', () => {
  assert.deepEqual(check(`<img width="360" alt="Signature Pad" src="${SRC}"/>`), []);
});

test('compares the alt text with an escaped ampersand as plain text', () => {
  const image = `<img src="${SRC}" alt="Drag &amp; Drop" width="800"/>`;
  assert.deepEqual(check(image, { title: 'Drag & Drop' }), []);
});

test('reports a local image that does not exist', () => {
  const missing = (src) => src !== SRC;
  assert.deepEqual(check(IMAGE, { exists: missing }), [`README references the image "${SRC}", which does not exist.`]);
});

test('reports an alt text that differs from the title', () => {
  const image = `<img src="${SRC}" alt="signature-pad" width="360"/>`;
  assert.deepEqual(check(image), [
    `The alt text of "${SRC}" is "signature-pad" but must match the README title "Signature Pad".`
  ]);
});

test('reports a local image without an alt text', () => {
  assert.deepEqual(check(`<img src="${SRC}" width="360"/>`), [
    `The alt text of "${SRC}" is "" but must match the README title "Signature Pad".`
  ]);
});

test('reports an exposed component without a local image', () => {
  assert.deepEqual(check('No image here.'), [
    'Component is exposed in the Lightning App Builder but its README has no local screenshot.'
  ]);
});

test('does not count an external image as the screenshot of an exposed component', () => {
  assert.deepEqual(check(EXTERNAL), [
    'Component is exposed in the Lightning App Builder but its README has no local screenshot.'
  ]);
});

test('ignores external images next to the screenshot', () => {
  const exists = (src) => src === SRC;
  assert.deepEqual(check(`${IMAGE}\n\n${EXTERNAL}`, { exists }), []);
});

test('needs no screenshot for a component that is not exposed', () => {
  assert.deepEqual(check('No image here.', { meta: hidden }), []);
});

test('checks the images of a component that is not exposed as well', () => {
  const none = () => false;
  assert.deepEqual(check(IMAGE, { meta: hidden, exists: none }), [
    `README references the image "${SRC}", which does not exist.`
  ]);
});
