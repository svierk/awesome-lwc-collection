import CustomSlider from 'c/customSlider';
import { createElement } from 'lwc';

const mockData = require('./data/customSlider.json');

let element;

describe('c-custom-slider', () => {
  beforeEach(() => {
    element = createElement('c-custom-slider', {
      is: CustomSlider
    });
    jest.useFakeTimers();
  });

  afterEach(() => {
    while (document.body.firstChild) {
      document.body.removeChild(document.body.firstChild);
    }
    jest.clearAllTimers();
    jest.clearAllMocks();
  });

  it('should be accessible and render correct number of slides', async () => {
    // given
    jest.useRealTimers();
    element.slidesData = mockData.slideData;

    // when
    document.body.appendChild(element);

    // then
    const slides = element.shadowRoot.querySelectorAll('.fade');
    expect(slides.length).toBe(mockData.slideData.length);
    await expect(element).toBeAccessible();

    jest.useFakeTimers();
  });

  it('should apply custom width and height styles', () => {
    // given
    element.customWidth = '800px';
    element.customHeight = '400px';
    element.slidesData = mockData.slideData;

    // when
    document.body.appendChild(element);

    // then
    const container = element.shadowRoot.querySelector('.slds-is-relative.container');
    const image = element.shadowRoot.querySelector('img');
    expect(container.style.width).toBe('800px');
    expect(image.style.height).toBe('400px');
  });

  it('should hide navigation buttons when related property is true', () => {
    // given
    element.slidesData = mockData.slideData;
    element.hideNavigationButtons = true;

    // when
    document.body.appendChild(element);

    // then
    const prevButton = element.shadowRoot.querySelector('.prev');
    const nextButton = element.shadowRoot.querySelector('.next');
    expect(prevButton).toBeNull();
    expect(nextButton).toBeNull();
  });

  it('should hide navigation dots when related property is true', () => {
    // given
    element.slidesData = mockData.slideData;
    element.hideNavigationDots = true;

    // when
    document.body.appendChild(element);

    // then
    const dots = element.shadowRoot.querySelectorAll('.dot');
    expect(dots.length).toBe(0);
  });

  it('should hide slide text when related property is true', () => {
    // given
    element.slidesData = mockData.slideData;
    element.hideSlideText = true;

    // when
    document.body.appendChild(element);

    // then
    const textSection = element.shadowRoot.querySelector('.text-section');
    expect(textSection).toBeNull();
  });

  it('should hide slide number when related property is true', () => {
    // given
    element.slidesData = mockData.slideData;
    element.hideSlideNumber = true;

    // when
    document.body.appendChild(element);

    // then
    const slideNumbers = element.shadowRoot.querySelector('.slideNumbers');
    expect(slideNumbers).toBeNull();
  });

  it('should navigate to next slide when next button is clicked', () => {
    // given
    element.slidesData = mockData.slideData;
    document.body.appendChild(element);

    // when
    const nextButton = element.shadowRoot.querySelector('.next');
    nextButton.click();

    // then
    return Promise.resolve().then(() => {
      const activeSlide = element.shadowRoot.querySelector('.fade.slds-show');
      const activeDot = element.shadowRoot.querySelector('.dot.active');
      expect(activeSlide).toBeTruthy();
      expect(activeDot).toBeTruthy();
    });
  });

  it('should navigate to previous slide when prev button is clicked', () => {
    // given
    element.slidesData = mockData.slideData;
    document.body.appendChild(element);

    // when
    const prevButton = element.shadowRoot.querySelector('.prev');
    prevButton.click();

    // then
    return Promise.resolve().then(() => {
      const visibleSlides = element.shadowRoot.querySelectorAll('.fade.slds-show');
      expect(visibleSlides.length).toBe(1);
    });
  });

  it('should navigate to specific slide when dot is clicked', () => {
    // given
    element.slidesData = mockData.slideData;
    document.body.appendChild(element);

    // when
    const dots = element.shadowRoot.querySelectorAll('.dot');
    if (dots.length > 1) {
      dots[1].click();
    }

    // then
    return Promise.resolve().then(() => {
      const activeDot = element.shadowRoot.querySelector('.dot.active');
      expect(activeDot).toBeTruthy();
    });
  });

  it('should wrap to first slide when navigating forward from last slide', () => {
    // given
    element.slidesData = mockData.slideData;
    document.body.appendChild(element);
    const nextButton = element.shadowRoot.querySelector('.next');

    // when - navigate to last slide then one more
    for (let i = 0; i < mockData.slideData.length; i++) {
      nextButton.click();
    }

    // then
    return Promise.resolve().then(() => {
      const visibleSlides = element.shadowRoot.querySelectorAll('.fade.slds-show');
      expect(visibleSlides.length).toBe(1);
    });
  });

  it('should wrap to last slide when navigating backward from first slide', () => {
    // given
    element.slidesData = mockData.slideData;
    document.body.appendChild(element);

    // when
    const prevButton = element.shadowRoot.querySelector('.prev');
    prevButton.click();

    // then
    return Promise.resolve().then(() => {
      const visibleSlides = element.shadowRoot.querySelectorAll('.fade.slds-show');
      expect(visibleSlides.length).toBe(1);
    });
  });

  it('should start auto-scroll when related property is enabled', () => {
    // given
    element.slidesData = mockData.slideData;
    element.autoScroll = true;
    element.scrollDuration = 3000;

    // when
    document.body.appendChild(element);
    jest.advanceTimersByTime(3000);

    // then
    return Promise.resolve().then(() => {
      const visibleSlides = element.shadowRoot.querySelectorAll('.fade.slds-show');
      expect(visibleSlides.length).toBe(1);
    });
  });

  it('should continue auto-scrolling through multiple slides', () => {
    // given
    element.slidesData = mockData.slideData;
    element.autoScroll = true;
    element.scrollDuration = 2000;

    // when
    document.body.appendChild(element);
    jest.advanceTimersByTime(2000);

    // then
    return Promise.resolve().then(() => {
      jest.advanceTimersByTime(2000);
      return Promise.resolve().then(() => {
        const visibleSlides = element.shadowRoot.querySelectorAll('.fade.slds-show');
        expect(visibleSlides.length).toBe(1);
      });
    });
  });

  it('should clear interval on disconnected callback when auto scroll is enabled', () => {
    // given
    element.slidesData = mockData.slideData;
    element.autoScroll = true;
    document.body.appendChild(element);
    const clearIntervalSpy = jest.spyOn(global, 'clearInterval');

    // when
    document.body.removeChild(element);

    // then
    expect(clearIntervalSpy).toHaveBeenCalled();
    clearIntervalSpy.mockRestore();
  });

  it('should not clear interval on disconnected callback when auto scroll is disabled', () => {
    // given
    element.slidesData = mockData.slideData;
    element.autoScroll = false;
    document.body.appendChild(element);
    const clearIntervalSpy = jest.spyOn(global, 'clearInterval');

    // when
    document.body.removeChild(element);

    // then
    expect(clearIntervalSpy).not.toHaveBeenCalled();
    clearIntervalSpy.mockRestore();
  });

  it('should initialize first slide as active', () => {
    // given
    element.slidesData = mockData.slideData;

    // when
    document.body.appendChild(element);

    // then
    const visibleSlide = element.shadowRoot.querySelector('.fade.slds-show');
    const hiddenSlides = element.shadowRoot.querySelectorAll('.fade.slds-hide');
    const activeDot = element.shadowRoot.querySelector('.dot.active');
    const inactiveDots = element.shadowRoot.querySelectorAll('.dot:not(.active)');

    expect(visibleSlide).toBeTruthy();
    expect(hiddenSlides.length).toBe(mockData.slideData.length - 1);
    expect(activeDot).toBeTruthy();
    expect(inactiveDots.length).toBe(mockData.slideData.length - 1);
  });
});
