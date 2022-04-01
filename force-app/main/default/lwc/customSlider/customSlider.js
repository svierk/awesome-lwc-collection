import { api, LightningElement } from 'lwc';

export default class CustomSlider extends LightningElement {
  // set slider max width
  @api customWidth = '100%';

  // set slider max height
  @api customHeight = '600px';

  // Enable automatic slide scrolling
  @api autoScroll = false;

  // Set durtion after which to show the next slide
  @api scrollDuration = 5000;

  // Hide "next" and "prev" buttons.
  @api hideNavigationButtons = false;

  // Hide navigation dots below slider.
  @api hideNavigationDots = false;

  // Hide the current slide number.
  @api hideSlideNumber = false;

  // Hide text overlay with heading and description.
  @api hideSlideText = false;

  slides = [];
  slideIndex = 1;
  timer;

  get maxWidth() {
    return `width: ${this.customWidth}`;
  }

  get maxHeight() {
    return `width: ${this.customHeight}`;
  }

  @api
  get slidesData() {
    return this.slides;
  }

  set slidesData(data) {
    this.slides = data.map((slide, i) => {
      if (i === 0) {
        return {
          ...slide,
          index: i + 1,
          slideClass: 'fade slds-show',
          dotClass: 'dot active'
        };
      }
      return {
        ...slide,
        index: i + 1,
        slideClass: 'fade slds-hide',
        dotClass: 'dot'
      };
    });
  }

  connectedCallback() {
    if (this.autoScroll) {
      this.timer = window.setInterval(() => {
        this.handleSlideSelection(this.slideIndex + 1);
      }, Number(this.scrollDuration));
    }
  }

  disconnectedCallback() {
    if (this.autoScroll) {
      window.clearInterval(this.timer);
    }
  }

  showSlide(event) {
    const slideIndex = Number(event.target.dataset.id);
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
    if (index > this.slides.length) {
      this.slideIndex = 1;
    } else if (index < 1) {
      this.slideIndex = this.slides.length;
    } else {
      this.slideIndex = index;
    }

    this.slides = this.slides.map((slide) => {
      if (this.slideIndex === slide.index) {
        return {
          ...slide,
          slideClass: 'fade slds-show',
          dotClass: 'dot active'
        };
      }
      return {
        ...slide,
        slideClass: 'fade slds-hide',
        dotClass: 'dot'
      };
    });
  }
}
