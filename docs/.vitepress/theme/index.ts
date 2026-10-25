import DefaultTheme from 'vitepress/theme';
import { h } from 'vue';
import ImageZoom from './components/ImageZoom.vue';
import './custom.css';

export default {
  extends: DefaultTheme,
  // The screenshots of a page open in a zoomable overlay (ImageZoom.vue).
  Layout: () => h(DefaultTheme.Layout, null, { 'layout-bottom': () => h(ImageZoom) })
};
