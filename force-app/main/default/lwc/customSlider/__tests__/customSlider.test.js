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

  it('should render with all features and handle all navigation scenarios', async () => {
    // given
    jest.useRealTimers();
    element.slidesData = mockData.slideData;
    element.customWidth = '800px';
    element.customHeight = '400px';

    // when
    document.body.appendChild(element);

    // then
    const slides = element.shadowRoot.querySelectorAll('.fade');
    expect(slides.length).toBe(mockData.slideData.length);

    const container = element.shadowRoot.querySelector('.slds-is-relative.container');
    const image = element.shadowRoot.querySelector('img');
    expect(container.style.width).toBe('800px');
    expect(image.style.height).toBe('400px');

    const visibleSlide = element.shadowRoot.querySelector('.fade.slds-show');
    const activeDot = element.shadowRoot.querySelector('.dot.active');
    expect(visibleSlide).toBeTruthy();
    expect(activeDot).toBeTruthy();

    // when
    const prevButton = element.shadowRoot.querySelector('.prev');
    prevButton.click();
    await Promise.resolve();

    const nextButton = element.shadowRoot.querySelector('.next');
    nextButton.click();
    await Promise.resolve();

    const dots = element.shadowRoot.querySelectorAll('.dot');
    if (dots.length > 1) {
      dots[1].click();
      await Promise.resolve();
    }

    for (let i = 0; i < mockData.slideData.length; i++) {
      nextButton.click();
    }
    await Promise.resolve();

    prevButton.click();
    await Promise.resolve();

    // then
    const visibleSlides = element.shadowRoot.querySelectorAll('.fade.slds-show');
    expect(visibleSlides.length).toBe(1);
    await expect(element).toBeAccessible();
    jest.useFakeTimers();
  });

  it('should hide all optional ui elements and handle edge cases', () => {
    // given
    element.hideNavigationButtons = true;
    element.hideNavigationDots = true;
    element.hideSlideText = true;
    element.hideSlideNumber = true;
    element.slidesData = mockData.slideData;

    // when
    document.body.appendChild(element);

    // then
    expect(element.shadowRoot.querySelector('.prev')).toBeNull();
    expect(element.shadowRoot.querySelector('.next')).toBeNull();
    expect(element.shadowRoot.querySelectorAll('.dot').length).toBe(0);
    expect(element.shadowRoot.querySelector('.text-section')).toBeNull();
    expect(element.shadowRoot.querySelector('.slideNumbers')).toBeNull();
  });

  it('should handle auto-scroll lifecycle completely', () => {
    // given
    element.slidesData = mockData.slideData;
    element.autoScroll = true;
    element.scrollDuration = 2000;

    // when
    document.body.appendChild(element);
    jest.advanceTimersByTime(2000);
    jest.advanceTimersByTime(2000);

    // then
    return Promise.resolve().then(() => {
      const visibleSlides = element.shadowRoot.querySelectorAll('.fade.slds-show');
      expect(visibleSlides.length).toBe(1);

      const clearIntervalSpy = jest.spyOn(global, 'clearInterval');
      document.body.removeChild(element);
      expect(clearIntervalSpy).toHaveBeenCalled();
      clearIntervalSpy.mockRestore();
    });
  });

  it('should handle invalid and edge case data inputs', () => {
    // given
    element.slidesData = JSON.stringify(mockData.slideData);
    expect(element.slidesData.length).toBe(mockData.slideData.length);
    element.slidesData = 'invalid json';
    expect(element.slidesData.length).toBe(0);
    element.slidesData = null;
    expect(element.slidesData.length).toBe(0);
    element.slidesData = undefined;
    expect(element.slidesData.length).toBe(0);
    element.slidesData = { invalid: 'data' };
    expect(element.slidesData.length).toBe(0);
    element.slidesData = [];
    expect(element.slidesData.length).toBe(0);
    element.slidesData = mockData.slideData;

    // when
    document.body.appendChild(element);

    // then
    const slides = element.shadowRoot.querySelectorAll('.fade');
    expect(slides.length).toBe(mockData.slideData.length);
  });

  it('should not clear interval when auto-scroll is disabled', () => {
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
});
