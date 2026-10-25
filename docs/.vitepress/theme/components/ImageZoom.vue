<script setup>
/**
 * Opens the screenshots of a page in a zoomable full-screen dialog.
 *
 * The component pages show screenshots of up to 2,750 px in a content column
 * of about 690 px - 330 px on a phone - so their details are hard to make out.
 * Every content image that is shown clearly smaller than its natural size and
 * is not a link (the article thumbnails link to Medium) becomes zoomable: a
 * click, Enter or Space opens it large enough to read, the dialog scrolls where
 * the image is larger than the screen, and the zoom buttons and "Fit" (the
 * whole image) adjust it.
 *
 * Mounted once in the layout (see ../index.ts); it marks the images after every
 * page change and listens for clicks on the document.
 */
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useRoute } from 'vitepress';

const route = useRoute();
const dialog = ref(null);
const body = ref(null);
const image = ref(null);
// Width of the image in the dialog, in CSS pixels.
const width = ref(0);
const STEP = 1.25;
// Only images shown at less than this share of their natural width zoom.
const SHRUNK = 0.8;
// Screenshots are taken at 2x, so half their natural width is their real size.
// The dialog opens with the whole image when it is shown at READABLE of its
// natural width or more, otherwise at ZOOMED of it - always on a phone.
const READABLE = 0.4;
const ZOOMED = 0.5;

function isZoomable(img) {
  return !img.closest('a') && img.naturalWidth * SHRUNK > img.getBoundingClientRect().width;
}

function mark(img) {
  if (!isZoomable(img)) return;
  img.classList.add('image-zoomable');
  img.tabIndex = 0;
  img.setAttribute('role', 'button');
  img.setAttribute('aria-label', `Enlarge image${img.alt ? `: ${img.alt}` : ''}`);
}

async function markImages() {
  await nextTick();
  for (const img of document.querySelectorAll('.vp-doc img')) {
    if (img.complete) mark(img);
    else img.addEventListener('load', () => mark(img), { once: true });
  }
}

/** The largest width at which the whole image fits the dialog. */
function fitWidth() {
  const style = getComputedStyle(body.value);
  const innerW = body.value.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
  const innerH = body.value.clientHeight - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom);
  const { naturalWidth: w, naturalHeight: h } = image.value;
  return Math.min(innerW, (innerH * w) / h);
}

async function open(img) {
  image.value = {
    src: img.currentSrc || img.src,
    alt: img.alt,
    naturalWidth: img.naturalWidth,
    naturalHeight: img.naturalHeight
  };
  dialog.value.showModal();
  document.documentElement.classList.add('image-zoom-open');
  await nextTick();
  const natural = image.value.naturalWidth;
  const whole = fitWidth();
  width.value = whole >= natural * READABLE ? whole : Math.max(whole, natural * ZOOMED);
}

function close() {
  dialog.value.close();
}

function onClose() {
  document.documentElement.classList.remove('image-zoom-open');
}

const zoomIn = () => (width.value *= STEP);
const zoomOut = () => (width.value = Math.max(fitWidth() / 2, width.value / STEP));
const fit = () => (width.value = fitWidth());

function onClick(event) {
  const img = event.target.closest?.('.vp-doc img.image-zoomable');
  if (img) open(img);
}

function onKeydown(event) {
  if (event.key !== 'Enter' && event.key !== ' ') return;
  const img = event.target.closest?.('.vp-doc img.image-zoomable');
  if (!img) return;
  event.preventDefault();
  open(img);
}

onMounted(() => {
  document.addEventListener('click', onClick);
  document.addEventListener('keydown', onKeydown);
  markImages();
});
onBeforeUnmount(() => {
  document.removeEventListener('click', onClick);
  document.removeEventListener('keydown', onKeydown);
});
watch(() => route.path, markImages);
</script>

<template>
  <dialog ref="dialog" class="image-zoom" :aria-label="image?.alt || 'Image'" @close="onClose">
    <div class="image-zoom-bar">
      <button type="button" aria-label="Zoom out" @click="zoomOut">−</button>
      <button type="button" aria-label="Zoom in" @click="zoomIn">+</button>
      <button type="button" @click="fit">Fit</button>
      <button type="button" class="image-zoom-close" aria-label="Close" autofocus @click="close">✕</button>
    </div>
    <div ref="body" class="image-zoom-body" @click.self="close">
      <img v-if="image" :src="image.src" :alt="image.alt" :style="{ width: `${width}px` }" />
    </div>
  </dialog>
</template>

<style scoped>
.image-zoom {
  width: 100vw;
  max-width: none;
  height: 100dvh;
  max-height: none;
  margin: 0;
  padding: 0;
  border: 0;
  background: var(--vp-c-bg);
  color: var(--vp-c-text-1);
}

.image-zoom[open] {
  display: flex;
  flex-direction: column;
}

.image-zoom-bar {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
  padding: 10px 16px;
  border-bottom: 1px solid var(--vp-c-divider);
}

.image-zoom-bar button {
  min-width: 40px;
  height: 36px;
  padding: 0 12px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  background: var(--vp-c-bg-soft);
  color: var(--vp-c-text-1);
  font-size: 15px;
}

.image-zoom-bar button:hover,
.image-zoom-bar button:focus-visible {
  border-color: var(--vp-c-brand-1);
  color: var(--vp-c-brand-1);
}

.image-zoom-close {
  margin-left: 8px;
}

/* Auto margins center the image while it is smaller than the dialog and
 * collapse to zero once it overflows, so every edge stays scrollable. */
.image-zoom-body {
  display: flex;
  flex: 1;
  overflow: auto;
  padding: 16px;
}

.image-zoom-body > img {
  flex-shrink: 0;
  max-width: none;
  height: auto;
  margin: auto;
}
</style>
