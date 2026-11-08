/**
 * Turns the local `<img>` tags of a component README into what its docs page
 * shows. External images (e.g. medium.com) are absolute URLs and stay untouched.
 */
const LOCAL_IMAGE = /<img[^>]*\bsrc="(?:\.\.\/)+images\/([^"]+)"[^>]*>/g;

function attribute(tag, name) {
  return tag.match(new RegExp(`\\s${name}="([^"]*)"`))?.[1];
}

/**
 * A local image becomes a Markdown image with an absolute public path, so
 * VitePress applies the site `base` correctly on GitHub Pages. Its width stays
 * as an attribute, so tall screenshots don't fill the column. The image of a
 * component with a teaser becomes the player (theme/components/ComponentTeaser.vue).
 */
export function rewriteImages(markdown, hasTeaser) {
  return markdown.replace(LOCAL_IMAGE, (tag, file) => {
    const alt = attribute(tag, 'alt') ?? file;
    const width = attribute(tag, 'width');
    const component = file.includes('/') ? file.split('/')[0] : null;
    if (component && hasTeaser(component)) {
      return `<ComponentTeaser name="${component}" alt="${alt}"${width ? ` width="${width}"` : ''}/>`;
    }
    return `![${alt}](/images/${file})${width ? `{width=${width}}` : ''}`;
  });
}
