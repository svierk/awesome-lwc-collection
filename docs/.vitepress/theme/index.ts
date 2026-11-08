import DefaultTheme from 'vitepress/theme';
import { h } from 'vue';
import ComponentTeaser from './components/ComponentTeaser.vue';
import ImageZoom from './components/ImageZoom.vue';
import './custom.css';

export default {
  extends: DefaultTheme,
  // The generator writes this into the pages of components with a teaser.
  enhanceApp({ app }) {
    app.component('ComponentTeaser', ComponentTeaser);
  },
  // The screenshots of a page open in a zoomable overlay (ImageZoom.vue).
  Layout: () => h(DefaultTheme.Layout, null, { 'layout-bottom': () => h(ImageZoom) })
};
