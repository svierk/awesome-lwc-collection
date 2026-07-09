import CustomCarousel from 'c/customCarousel';
import { createElement } from 'lwc';

const mockData = require('./data/customCarousel.json');

let element;

const flushPromises = () => Promise.resolve();

const activeDotId = () => element.shadowRoot.querySelector('.dot.active').dataset.id;

describe('c-custom-carousel', () => {
  beforeEach(() => {
    element = createElement('c-custom-carousel', {
      is: CustomCarousel
    });
    jest.useFakeTimers();
  });

  afterEach(() => {
    while (document.body.firstChild) {
      document.body.removeChild(document.body.firstChild);
    }
    jest.clearAllTimers();
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  it('should render one slide element per slide in the data', () => {
    // given
    element.slidesData = mockData.slideData;

    // when
    document.body.appendChild(element);

    // then
    const slides = element.shadowRoot.querySelectorAll('.fade');
    expect(slides.length).toBe(mockData.slideData.length);
  });

  it('should apply the configured custom width and height', () => {
    // given
    element.slidesData = mockData.slideData;
    element.customWidth = '800px';
    element.customHeight = '400px';

    // when
    document.body.appendChild(element);

    // then
    const container = element.shadowRoot.querySelector('.slds-is-relative.container');
    const image = element.shadowRoot.querySelector('img');
    expect(container.style.width).toBe('800px');
    expect(image.style.height).toBe('400px');
  });

  it('should show the first slide with an active dot initially', () => {
    // given
    element.slidesData = mockData.slideData;

    // when
    document.body.appendChild(element);

    // then
    expect(element.shadowRoot.querySelector('.fade.slds-show')).toBeTruthy();
    expect(element.shadowRoot.querySelector('.dot.active')).toBeTruthy();
  });

  it('should hide all optional ui elements when the hide flags are set', () => {
    // given
    element.slidesData = mockData.slideData;
    element.hideNavigationButtons = true;
    element.hideNavigationDots = true;
    element.hideSlideText = true;
    element.hideSlideNumber = true;

    // when
    document.body.appendChild(element);

    // then
    expect(element.shadowRoot.querySelector('.prev')).toBeNull();
    expect(element.shadowRoot.querySelector('.next')).toBeNull();
    expect(element.shadowRoot.querySelectorAll('.dot').length).toBe(0);
    expect(element.shadowRoot.querySelector('.text-section')).toBeNull();
    expect(element.shadowRoot.querySelector('.slideNumbers')).toBeNull();
  });

  it('should be accessible', async () => {
    // given
    jest.useRealTimers();
    element.slidesData = mockData.slideData;

    // when
    document.body.appendChild(element);

    // then
    await expect(element).toBeAccessible();
  });

  it('should advance to the next slide when the next button is clicked', async () => {
    // given
    element.slidesData = mockData.slideData;
    document.body.appendChild(element);

    // when
    element.shadowRoot.querySelector('.next').click();
    await flushPromises();

    // then
    expect(activeDotId()).toBe('2');
  });

  it('should wrap to the last slide when clicking prev on the first slide', async () => {
    // given
    element.slidesData = mockData.slideData;
    document.body.appendChild(element);

    // when
    element.shadowRoot.querySelector('.prev').click();
    await flushPromises();

    // then
    expect(activeDotId()).toBe(String(mockData.slideData.length));
  });

  it('should wrap to the first slide when clicking next past the last', async () => {
    // given
    element.slidesData = mockData.slideData;
    document.body.appendChild(element);

    // when
    const next = element.shadowRoot.querySelector('.next');
    for (let i = 0; i < mockData.slideData.length; i++) {
      next.click();
    }
    await flushPromises();

    // then
    expect(activeDotId()).toBe('1');
  });

  it('should jump to a slide when its dot is clicked', async () => {
    // given
    element.slidesData = mockData.slideData;
    document.body.appendChild(element);

    // when
    element.shadowRoot.querySelectorAll('.dot')[1].click();
    await flushPromises();

    // then
    expect(activeDotId()).toBe('2');
  });

  it('should advance slides automatically when auto-scroll is enabled', () => {
    // given
    element.slidesData = mockData.slideData;
    element.autoScroll = true;
    element.scrollDuration = 2000;
    document.body.appendChild(element);

    // when
    jest.advanceTimersByTime(2000);

    // then
    return flushPromises().then(() => {
      expect(element.shadowRoot.querySelectorAll('.fade.slds-show').length).toBe(1);
    });
  });

  it('should clear the interval on disconnect when auto-scroll is enabled', () => {
    // given
    element.slidesData = mockData.slideData;
    element.autoScroll = true;
    element.scrollDuration = 2000;
    document.body.appendChild(element);
    const clearIntervalSpy = jest.spyOn(global, 'clearInterval');

    // when
    document.body.removeChild(element);

    // then
    expect(clearIntervalSpy).toHaveBeenCalled();
  });

  it('should not clear the interval on disconnect when auto-scroll is disabled', () => {
    // given
    element.slidesData = mockData.slideData;
    element.autoScroll = false;
    document.body.appendChild(element);
    const clearIntervalSpy = jest.spyOn(global, 'clearInterval');

    // when
    document.body.removeChild(element);

    // then
    expect(clearIntervalSpy).not.toHaveBeenCalled();
  });

  it.each([
    ['a valid JSON string', JSON.stringify(mockData.slideData), mockData.slideData.length],
    ['an invalid JSON string', 'invalid json', 0],
    ['null', null, 0],
    ['undefined', undefined, 0],
    ['a non-array object', { invalid: 'data' }, 0],
    ['an empty array', [], 0]
  ])('should expose the expected number of slides for %s', (_label, input, expected) => {
    // given
    element.slidesData = input;

    // when
    const slides = element.slidesData;

    // then
    expect(slides.length).toBe(expected);
  });
});
