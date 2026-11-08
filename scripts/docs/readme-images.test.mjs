/**
 * Checks how the images of a component README become part of its docs page -
 * see scripts/docs/readme-images.mjs. Run with `npm run test:docs`.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { rewriteImages } from './readme-images.mjs';

const SCREENSHOT = '<img src="../../../../../images/iFrame/screenshot.png" alt="iFrame" width="800"/>';
const TEASER = '<img src="../../../../../images/customCarousel/teaser.webp" alt="Custom Carousel" width="590"/>';
const EXTERNAL = '<img src="https://miro.medium.com/teaser.png" alt="An article" width="350"/>';
const hasTeaser = (component) => component === 'customCarousel';

test('rewrites a local image to a Markdown image with its width', () => {
  assert.equal(rewriteImages(SCREENSHOT, hasTeaser), '![iFrame](/images/iFrame/screenshot.png){width=800}');
});

test('rewrites a local image without a width', () => {
  const image = '<img src="../images/logo.png" alt="Logo"/>';
  assert.equal(rewriteImages(image, hasTeaser), '![Logo](/images/logo.png)');
});

test('falls back to the file name without an alt text', () => {
  assert.equal(rewriteImages('<img src="../images/logo.png"/>', hasTeaser), '![logo.png](/images/logo.png)');
});

test('leaves external images untouched', () => {
  assert.equal(rewriteImages(EXTERNAL, hasTeaser), EXTERNAL);
});

test('plays the teaser of a component that has one', () => {
  assert.equal(
    rewriteImages(TEASER, hasTeaser),
    '<ComponentTeaser name="customCarousel" alt="Custom Carousel" width="590"/>'
  );
});

test('plays the teaser without a width', () => {
  const image = '<img src="../images/customCarousel/screenshot.png" alt="Custom Carousel"/>';
  assert.equal(rewriteImages(image, hasTeaser), '<ComponentTeaser name="customCarousel" alt="Custom Carousel"/>');
});

test('does not look for a teaser for an image directly in the images folder', () => {
  const asked = [];
  const spy = (component) => asked.push(component) && true;
  assert.equal(rewriteImages('<img src="../images/logo.png" alt="Logo"/>', spy), '![Logo](/images/logo.png)');
  assert.deepEqual(asked, []);
});
