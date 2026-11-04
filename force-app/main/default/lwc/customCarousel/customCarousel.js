import { api, LightningElement } from 'lwc';

/**
 * A simple custom carousel with different configuration options.
 * @alias CustomCarousel
 * @extends LightningElement
 * @hideconstructor
 *
 * @example
 * <c-custom-carousel
 *   slides-data={slides}
 *   custom-height="500px"
 *   custom-width="100%"
 *   auto-scroll
 *   hide-navigation-buttons
 *   hide-slide-text
 *   hide-slide-number
 * ></c-custom-carousel>
 */
export default class CustomCarousel extends LightningElement {
  /**
   * If present, automatic slide scrolling will be enabled.
   * @type {boolean}
   * @default false
   */
  @api
  get autoScroll() {
    return this._autoScroll;
  }

  set autoScroll(value) {
    this._autoScroll = value;
    this.restartTimer();
  }

  /**
   * Set maximum height of the carousel in percent or pixels.
   * @type {string}
   * @default ''
   */
  @api customHeight = '';

  /**
   * Set maximum width of the carousel in percent or pixels.
   * @type {string}
   * @default '600px'
   */
  @api customWidth = '600px';

  /**
   * If present, the "next" and "prev" navigation buttons will be hidden.
   * @type {boolean}
   * @default false
   */
  @api hideNavigationButtons = false;

  /**
   * If present, the navigation dots below the carousel will be hidden.
   * @type {boolean}
   * @default false
   */
  @api hideNavigationDots = false;

  /**
   * If present, the current slide number will be hidden.
   * @type {boolean}
   * @default false
   */
  @api hideSlideNumber = false;

  /**
   * If present, the text overlay with heading and description will be hidden.
   * @type {boolean}
   * @default false
   */
  @api hideSlideText = false;

  /**
   * Set the duration in milliseconds after which the next slide should be displayed.
   * @type {number}
   * @default 5000
   */
  @api
  get scrollDuration() {
    return this._scrollDuration;
  }

  set scrollDuration(value) {
    this._scrollDuration = value;
    this.restartTimer();
  }

  errorMessage = '';
  slides = [];
  slideIndex = 1;
  timer;
  _autoScroll = false;
  _scrollDuration = 5000;

  get maxWidth() {
    return `width: ${this.customWidth}`;
  }

  get maxHeight() {
    return `height: ${this.customHeight}`;
  }

  get showNavigationButtons() {
    return !this.hideNavigationButtons && this.slides.length > 0;
  }

  get showNavigationDots() {
    return !this.hideNavigationDots;
  }

  get showSlideNumber() {
    return !this.hideSlideNumber;
  }

  get showSlideText() {
    return !this.hideSlideText;
  }

  /**
   * A list of slides that are displayed in the custom carousel.
   * Each slide has the following attributes: image, heading and description.
   * @type {Array}
   * @example
   * slideData = [
   *   {
   *     "image": "some image link",
   *     "heading": "Slide 1",
   *     "description": "Some description for slide 1"
   *   },
   *   {
   *     "image": "another image link",
   *     "heading": "Slide 2",
   *     "description": "Some description for slide 2"
   *   }
   * ]
   */
  @api
  get slidesData() {
    return this.slides;
  }

  set slidesData(data) {
    let parsedData = data;
    this.errorMessage = '';
    this.slideIndex = 1;

    if (typeof data === 'string') {
      try {
        parsedData = JSON.parse(data);
      } catch {
        this.errorMessage = 'The slides could not be displayed because the slides data is not valid JSON.';
        parsedData = [];
      }
    }

    if (!parsedData || !Array.isArray(parsedData)) {
      this.slides = [];
      return;
    }

    this.slides = parsedData.map((slide, i) => this.withSlideState({ ...slide, index: i + 1 }));
  }

  connectedCallback() {
    this.restartTimer();
  }

  disconnectedCallback() {
    this.stopTimer();
  }

  restartTimer() {
    this.stopTimer();
    if (this.autoScroll && this.isConnected) {
      this.timer = globalThis.setInterval(() => {
        this.handleSlideSelection(this.slideIndex + 1);
      }, Number(this.scrollDuration));
    }
  }

  stopTimer() {
    if (this.timer) {
      globalThis.clearInterval(this.timer);
      this.timer = undefined;
    }
  }

  showSlide(event) {
    const slideIndex = Number(event.currentTarget.dataset.id);
    this.handleSlideSelection(slideIndex);
  }

  slideBackward() {
    const slideIndex = this.slideIndex - 1;
    this.handleSlideSelection(slideIndex);
  }

  slideForward() {
    const slideIndex = this.slideIndex + 1;
    this.handleSlideSelection(slideIndex);
  }

  handleSlideSelection(index) {
    if (this.slides.length === 0) {
      return;
    }

    if (index > this.slides.length) {
      this.slideIndex = 1;
    } else if (index < 1) {
      this.slideIndex = this.slides.length;
    } else {
      this.slideIndex = index;
    }

    this.slides = this.slides.map((slide) => this.withSlideState(slide));
  }

  withSlideState(slide) {
    const isCurrent = this.slideIndex === slide.index;
    return {
      ...slide,
      slideClass: isCurrent ? 'fade slds-show' : 'fade slds-hide',
      dotClass: isCurrent ? 'dot active' : 'dot',
      dotLabel: `Show slide ${slide.index}`,
      dotAria: { ariaCurrent: isCurrent ? 'true' : 'false' }
    };
  }
}
