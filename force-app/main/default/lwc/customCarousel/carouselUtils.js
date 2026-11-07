import { gql } from 'lightning/graphql';

const POSITIVE_NUMBER = /^\d+(\.\d+)?$/;
const SAFE_LINK = /^(https?:\/\/|\/(?!\/))/i;
const IMAGE_EXTENSIONS = new Set(['gif', 'jpeg', 'jpg', 'png', 'webp']);
const INVALID_JSON = 'The slides could not be displayed because the slides data is not valid JSON.';

/** Loads the files attached to a record, see toImageSlides. */
export const RECORD_FILES_QUERY = gql`
  query carouselRecordFiles($recordId: ID!) {
    uiapi {
      query {
        ContentDocumentLink(where: { LinkedEntityId: { eq: $recordId } }, first: 100) {
          edges {
            node {
              ContentDocument {
                Title {
                  value
                }
                FileExtension {
                  value
                }
                LatestPublishedVersionId {
                  value
                }
              }
            }
          }
        }
      }
    }
  }
`;

/**
 * Reads the slides from an array or a JSON string.
 * @param {Array|string} data - The slides, or a JSON array of them
 * @returns {{slides: Object[], error: string}} The slides, empty if there are none or the JSON is invalid, and an
 * error message for invalid JSON
 */
export function parseSlides(data) {
  let parsed = data;
  if (typeof data === 'string') {
    try {
      parsed = JSON.parse(data);
    } catch {
      return { slides: [], error: INVALID_JSON };
    }
  }
  return { slides: Array.isArray(parsed) ? parsed : [], error: '' };
}

/**
 * Turns an aspect ratio like '16:9', '4/3' or '1.5' into a CSS value.
 * @param {string} value - The aspect ratio
 * @returns {string} The CSS value, e.g. '16 / 9', or an empty string if the value is not a valid ratio
 */
export function toCssRatio(value) {
  const parts = String(value)
    .split(/[:/]/)
    .map((part) => part.trim());
  const valid = parts.length <= 2 && parts.every((part) => POSITIVE_NUMBER.test(part) && Number(part) > 0);
  return valid ? parts.join(' / ') : '';
}

/**
 * Lets only web and relative links through, so a slide can't run script through a javascript: or data: URL.
 * @param {string} link - The link of a slide
 * @returns {string|undefined} The link, or undefined if it's missing or not allowed
 */
function safeLink(link) {
  return SAFE_LINK.test(String(link ?? '')) ? link : undefined;
}

/**
 * Turns the result of RECORD_FILES_QUERY into slides, one per image file, with the file title as description.
 * @param {Object} data - The data of the GraphQL wire
 * @returns {Object[]} The slides
 */
export function toImageSlides(data) {
  return data.uiapi.query.ContentDocumentLink.edges
    .map(({ node }) => node.ContentDocument)
    .filter((file) => IMAGE_EXTENSIONS.has(String(file.FileExtension.value).toLowerCase()))
    .map((file) => ({
      image: `/sfc/servlet.shepherd/version/download/${file.LatestPublishedVersionId.value}`,
      description: file.Title.value
    }));
}

/**
 * Adds the display state to a slide: classes, ARIA attributes and the checked call to action.
 * @param {Object} slide - The slide with its 1-based index
 * @param {{current: number, total: number, slideTransition: boolean, thumbnails: boolean}} options - The current
 * slide, the number of slides, whether the slides move instead of fading, and whether thumbnails replace the dots
 * @returns {Object} The slide with its display state
 */
export function toSlideState(slide, { current, total, slideTransition, thumbnails }) {
  const isCurrent = current === slide.index;
  const fadeClass = isCurrent ? 'fade slds-show' : 'fade slds-hide';
  const navigationClass = thumbnails ? 'carousel-thumbnail' : 'dot';
  return {
    ...slide,
    link: safeLink(slide.link),
    linkLabel: slide.linkLabel || 'Learn more',
    imageAlt: slide.description || slide.heading || '',
    // links of hidden slides stay out of the tab order
    linkAttributes: { tabIndex: isCurrent ? 0 : -1 },
    slideClass: slideTransition ? 'carousel-slide' : fadeClass,
    // role and description follow the WAI-ARIA carousel pattern, a <fieldset> as Sonar suggests would not fit
    slideAria: {
      role: 'group',
      ariaRoleDescription: 'slide',
      ariaLabel: `${slide.index} of ${total}`,
      ariaHidden: String(!isCurrent)
    },
    dotClass: isCurrent ? `${navigationClass} active` : navigationClass,
    dotLabel: `Show slide ${slide.index}`,
    dotAria: { ariaCurrent: isCurrent ? 'true' : 'false' }
  };
}
