/**
 * The rules for the screenshots in the component READMEs, used by the README
 * check. Images with an absolute URL, like the article teasers, are not
 * screenshots and stay out of it.
 */
const EXTERNAL = /^[a-z][a-z0-9+.-]*:/i;

function attribute(tag, name) {
  return tag.match(new RegExp(`\\s${name}="([^"]*)"`))?.[1];
}

/** Return the local images of a README as `{ src, alt }`, from `<img>` tags and Markdown. */
function localImages(readme) {
  const tags = [...readme.matchAll(/<img\b[^>]*>/g)].map(([tag]) => ({
    src: attribute(tag, 'src'),
    alt: attribute(tag, 'alt') ?? ''
  }));
  const markdown = [...readme.matchAll(/!\[([^\]]*)\]\(([^)\s]+)/g)].map(([, alt, src]) => ({ src, alt }));
  return [...tags, ...markdown].filter(({ src }) => src && !EXTERNAL.test(src));
}

/**
 * Return the findings for the images of one README. `exists` tells whether a
 * path, relative to the README, points to a file.
 */
export function checkScreenshots({ readme, meta, exists }) {
  const images = localImages(readme);
  const title = readme.match(/^# (.+)$/m)?.[1].trim();
  const findings = [];
  for (const { src, alt } of images) {
    if (!exists(src)) findings.push(`README references the image "${src}", which does not exist.`);
    if (title && alt.replaceAll('&amp;', '&') !== title) {
      findings.push(`The alt text of "${src}" is "${alt}" but must match the README title "${title}".`);
    }
  }
  if (meta.exposed && images.length === 0) {
    findings.push('Component is exposed in the Lightning App Builder but its README has no local screenshot.');
  }
  return findings;
}
