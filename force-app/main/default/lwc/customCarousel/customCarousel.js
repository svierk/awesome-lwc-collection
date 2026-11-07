import { api, LightningElement } from 'lwc';

const SWIPE_DISTANCE = 50;
const POSITIVE_NUMBER = /^\d+(\.\d+)?$/;

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
 *   transition="slide"
 *   aspect-ratio="16:9"
 *   show-card
 *   card-title="Highlights"
 * ></c-custom-carousel>
 */
export default class CustomCarousel extends LightningElement {
  /**
   * Set a fixed aspect ratio for the slides, e.g. '16:9' or '4/3'. The images then fill the slides and are cropped
   * where needed. Takes precedence over custom-height.
   * @type {string}
   * @default ''
   */
  @api aspectRatio = '';

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
    this.isPlaying = true;
    this.restartTimer();
  }

  /**
   * If show card option is active, the card icon is displayed in the header before the card title.
   * It should contain the SLDS name of the icon.
   * Specify the name in the format 'utility:down' where 'utility' is the category and 'down' the icon to be displayed.
   * @type {string}
   * @default 'utility:image'
   * @example 'utility:image'
   */
  @api cardIcon = 'utility:image';

  /**
   * If show card option is active, the card title can include text and is displayed in the header above the carousel.
   * @type {string}
   * @default ''
   */
  @api cardTitle = '';

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
   * If present, the carousel is wrapped in a lightning card to fit better into the overall page layout.
   * @type {boolean}
   * @default false
   */
  @api showCard = false;

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

  /**
   * Set how the carousel moves to another slide: 'fade' blends the new slide in, 'slide' moves it in from the side.
   * Both are switched off when the user prefers reduced motion.
   * @type {string}
   * @default 'fade'
   */
  @api
  get transition() {
    return this._transition;
  }

  set transition(value) {
    this._transition = value;
    this.slides = this.slides.map((slide) => this.withSlideState(slide));
  }

  announcement = '';
  errorMessage = '';
  focusActiveDot = false;
  isHovered = false;
  isPlaying = true;
  pointerStart;
  pointerUsed = false;
  slides = [];
  slideIndex = 1;
  timer;
  _autoScroll = false;
  _scrollDuration = 5000;
  _transition = 'fade';

  get maxWidth() {
    return `width: ${this.customWidth}`;
  }

  get maxHeight() {
    return this.ratio ? '' : `height: ${this.customHeight}`;
  }

  /** The aspect ratio as CSS value, or an empty string if none or an invalid one is set. */
  get ratio() {
    const parts = String(this.aspectRatio)
      .split(/[:/]/)
      .map((part) => part.trim());
    const valid = parts.length <= 2 && parts.every((part) => POSITIVE_NUMBER.test(part) && Number(part) > 0);
    return valid ? parts.join(' / ') : '';
  }

  get viewportClass() {
    return this.ratio ? 'carousel-viewport carousel-fill' : 'carousel-viewport';
  }

  get viewportStyle() {
    return this.ratio ? `aspect-ratio: ${this.ratio}` : '';
  }

  get cardClass() {
    return this.showCard ? 'slds-card' : '';
  }

  get cardBodyClass() {
    return this.showCard ? 'slds-card__body slds-card__body_inner' : '';
  }

  get showNavigationButtons() {
    return !this.hideNavigationButtons && this.slides.length > 0;
  }

  get showNavigationDots() {
    return !this.hideNavigationDots;
  }

  get showSlideNumber() {
    return !this.hideSlideNumber && this.slides.length > 0;
  }

  get showSlideText() {
    return !this.hideSlideText;
  }

  get isSlideTransition() {
    return this.transition === 'slide';
  }

  get trackClass() {
    return this.isSlideTransition ? 'carousel-track carousel-track-slide' : 'carousel-track';
  }

  get trackStyle() {
    return this.isSlideTransition ? `transform: translateX(-${(this.slideIndex - 1) * 100}%)` : '';
  }

  get showPlaybackButton() {
    return Boolean(this.autoScroll) && this.slides.length > 1;
  }

  get showControls() {
    return this.showNavigationDots || this.showPlaybackButton;
  }

  get playbackIcon() {
    return this.isPlaying ? 'utility:pause' : 'utility:play';
  }

  get playbackLabel() {
    return this.isPlaying ? 'Stop automatic slide show' : 'Start automatic slide show';
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

    this.slides = parsedData.map((slide, i) => this.withSlideState({ ...slide, index: i + 1 }, parsedData.length));
  }

  constructor() {
    super();
    // Listeners on the host and the template root need no cleanup, they live as long as the component.
    this.addEventListener('mouseenter', this.handleMouseEnter);
    this.addEventListener('mouseleave', this.handleMouseLeave);
    this.template.addEventListener('keydown', this.handleKeyDown);
    this.template.addEventListener('focusin', this.handleFocusIn);
    this.template.addEventListener('pointerdown', this.handlePointerPress);
    this.template.addEventListener('pointerup', this.handlePointerRelease);
  }

  connectedCallback() {
    this.restartTimer();
  }

  disconnectedCallback() {
    this.stopTimer();
  }

  renderedCallback() {
    if (this.focusActiveDot) {
      this.focusActiveDot = false;
      this.template.querySelector('.dot.active')?.focus();
    }
  }

  restartTimer() {
    this.stopTimer();
    if (this.autoScroll && this.isPlaying && !this.isHovered && this.isConnected) {
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
    this.selectByUser(Number(event.currentTarget.dataset.id));
  }

  slideBackward() {
    this.selectByUser(this.slideIndex - 1);
  }

  slideForward() {
    this.selectByUser(this.slideIndex + 1);
  }

  togglePlayback() {
    this.isPlaying = !this.isPlaying;
    this.restartTimer();
  }

  handleKeyDown = (event) => {
    this.pointerUsed = false;
    const step = { ArrowLeft: -1, ArrowRight: 1 }[event.key];
    if (!step || this.slides.length === 0) {
      return;
    }
    event.preventDefault();
    this.focusActiveDot = event.target.classList.contains('dot');
    this.selectByUser(this.slideIndex + step);
  };

  handleMouseEnter = () => {
    this.isHovered = true;
    this.restartTimer();
  };

  handleMouseLeave = () => {
    this.isHovered = false;
    this.restartTimer();
  };

  /** Keyboard focus inside the carousel stops the rotation until the user starts it again. */
  handleFocusIn = () => {
    if (!this.pointerUsed && this.isPlaying && this.autoScroll) {
      this.togglePlayback();
    }
  };

  /** A pointer press moves the focus before it is released, so focus during a press doesn't stop the rotation. */
  handlePointerPress = () => {
    this.pointerUsed = true;
  };

  handlePointerRelease = () => {
    this.pointerUsed = false;
  };

  handlePointerDown(event) {
    this.pointerStart = { x: event.clientX, y: event.clientY };
  }

  handlePointerUp(event) {
    if (!this.pointerStart) {
      return;
    }
    const distanceX = event.clientX - this.pointerStart.x;
    const distanceY = event.clientY - this.pointerStart.y;
    this.pointerStart = undefined;
    if (Math.abs(distanceX) >= SWIPE_DISTANCE && Math.abs(distanceX) > Math.abs(distanceY)) {
      this.selectByUser(this.slideIndex + (distanceX < 0 ? 1 : -1));
    }
  }

  handlePointerCancel() {
    this.pointerStart = undefined;
  }

  /** Changes the slide on behalf of the user and announces the new slide to screen readers. */
  selectByUser(index) {
    this.handleSlideSelection(index);
    const slide = this.slides[this.slideIndex - 1];
    if (slide) {
      const heading = slide.heading ? `: ${slide.heading}` : '';
      this.announcement = `Slide ${slide.index} of ${this.slides.length}${heading}`;
    }
  }

  handleSlideSelection(index) {
    this.announcement = '';
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

  withSlideState(slide, total = this.slides.length) {
    const isCurrent = this.slideIndex === slide.index;
    const fadeClass = isCurrent ? 'fade slds-show' : 'fade slds-hide';
    return {
      ...slide,
      slideClass: this.isSlideTransition ? 'carousel-slide' : fadeClass,
      // role and description follow the WAI-ARIA carousel pattern, a <fieldset> as Sonar suggests would not fit
      slideAria: {
        role: 'group',
        ariaRoleDescription: 'slide',
        ariaLabel: `${slide.index} of ${total}`,
        ariaHidden: String(!isCurrent)
      },
      dotClass: isCurrent ? 'dot active' : 'dot',
      dotLabel: `Show slide ${slide.index}`,
      dotAria: { ariaCurrent: isCurrent ? 'true' : 'false' }
    };
  }
}
