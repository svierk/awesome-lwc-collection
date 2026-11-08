<script setup>
/**
 * Plays the short teaser of a component, muted and in a loop.
 *
 * It only plays while it is on screen. With reduced motion the poster stays
 * until the reader starts it, and the button always stops or starts it, because
 * moving content has to be stoppable. The docs generator writes this component
 * into the page of every component with an images/<name>/teaser.mp4.
 */
import { onBeforeUnmount, onMounted, ref } from 'vue';
import { withBase } from 'vitepress';

const props = defineProps({
  name: { type: String, required: true },
  alt: { type: String, required: true },
  width: { type: String, default: undefined }
});

const video = ref(null);
const playing = ref(false);
const url = (file) => withBase(`/images/${props.name}/${file}`);

let observer;
let reducedMotion;
let visible = false;
// What the reader chose with the button; until then the motion setting decides.
let wanted = null;

function update() {
  const shouldPlay = visible && (wanted ?? !reducedMotion.matches);
  if (shouldPlay) video.value.play().catch(() => {});
  else video.value.pause();
}

function toggle() {
  wanted = !playing.value;
  update();
}

onMounted(() => {
  video.value.muted = true;
  reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  reducedMotion.addEventListener('change', update);
  observer = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    update();
  });
  observer.observe(video.value);
});

onBeforeUnmount(() => {
  observer.disconnect();
  reducedMotion.removeEventListener('change', update);
});
</script>

<template>
  <div class="component-teaser" :style="width ? { maxWidth: `${width}px` } : undefined">
    <video
      ref="video"
      :poster="url('poster.png')"
      :aria-label="alt"
      muted
      loop
      playsinline
      preload="none"
      @play="playing = true"
      @pause="playing = false"
    >
      <source :src="url('teaser.webm')" type="video/webm" />
      <source :src="url('teaser.mp4')" type="video/mp4" />
    </video>
    <button type="button" :aria-label="playing ? 'Pause teaser' : 'Play teaser'" @click="toggle">
      <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
        <path v-if="playing" d="M7 5h4v14H7zM13 5h4v14h-4z" />
        <path v-else d="M8 5v14l11-7z" />
      </svg>
    </button>
  </div>
</template>

<style scoped>
.component-teaser {
  position: relative;
  width: 100%;
  margin: 16px 0;
}

video {
  display: block;
  width: 100%;
  height: auto;
  border-radius: 8px;
}

button {
  position: absolute;
  right: 8px;
  bottom: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  color: #fff;
  background: rgba(0, 0, 0, 0.6);
}

button:hover {
  background: rgba(0, 0, 0, 0.8);
}

button:focus-visible {
  outline: 2px solid var(--vp-c-brand-1);
  outline-offset: 2px;
}

svg {
  fill: currentColor;
}
</style>
