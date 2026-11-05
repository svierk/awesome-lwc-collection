import CustomCarousel from 'c/customCarousel';
import { createElement } from 'lwc';

const mockData = require('./data/customCarousel.json');

const threeSlides = [...mockData.slideData, { image: 'third link', description: 'Third' }];

let element;

const flushPromises = () => Promise.resolve();

const query = (selector) => element.shadowRoot.querySelector(selector);

const queryAll = (selector) => element.shadowRoot.querySelectorAll(selector);

const activeDotId = () => query('.dot.active').dataset.id;

const errorMessage = () => query('c-error-alert')?.message;

const announcement = () => query('output').textContent;

const mount = (props = {}) => {
  Object.assign(element, { slidesData: mockData.slideData, ...props });
  document.body.appendChild(element);
};

const pressKey = (target, key) => {
  const event = new KeyboardEvent('keydown', { key, bubbles: true, composed: true, cancelable: true });
  target.dispatchEvent(event);
  return event;
};

const swipe = (fromX, toX, toY = 0) => {
  const viewport = query('.carousel-viewport');
  viewport.dispatchEvent(new MouseEvent('pointerdown', { clientX: fromX, clientY: 0, bubbles: true }));
  viewport.dispatchEvent(new MouseEvent('pointerup', { clientX: toX, clientY: toY, bubbles: true }));
};

const region = () => query('[role="region"]');

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

  it('should render the slides of a json string and show the first one', () => {
    // when
    mount({ slidesData: JSON.stringify(mockData.slideData) });

    // then
    expect(queryAll('.fade').length).toBe(mockData.slideData.length);
    expect(queryAll('.fade.slds-show').length).toBe(1);
    expect(activeDotId()).toBe('1');
    expect(errorMessage()).toBeUndefined();
  });

  it('should apply the configured custom width and height', () => {
    // when
    mount({ customWidth: '800px', customHeight: '400px' });

    // then
    expect(query('.slds-is-relative.container').style.width).toBe('800px');
    expect(query('img').style.height).toBe('400px');
  });

  it('should hide all optional ui elements when the hide flags are set', () => {
    // when
    mount({ hideNavigationButtons: true, hideNavigationDots: true, hideSlideText: true, hideSlideNumber: true });

    // then
    expect(query('.prev')).toBeNull();
    expect(query('.next')).toBeNull();
    expect(queryAll('.dot').length).toBe(0);
    expect(query('.text-section')).toBeNull();
    expect(query('.slideNumbers')).toBeNull();
  });

  it.each([
    ['fade', {}],
    ['slide with auto-scroll', { transition: 'slide', autoScroll: true }]
  ])('should be accessible with %s', async (_label, props) => {
    // given
    jest.useRealTimers();

    // when
    mount(props);

    // then
    await expect(element).toBeAccessible();
  });

  it.each([
    ['the next button', () => query('.next').click(), '2'],
    ['prev on the first slide', () => query('.prev').click(), String(mockData.slideData.length)],
    ['next past the last slide', () => mockData.slideData.forEach(() => query('.next').click()), '1'],
    ['a dot', () => queryAll('.dot')[1].click(), '2']
  ])('should select the expected slide after clicking %s', async (_label, act, expected) => {
    // given
    mount();

    // when
    act();
    await flushPromises();

    // then
    expect(activeDotId()).toBe(expected);
  });

  it('should advance slides automatically when auto-scroll is enabled', async () => {
    // given
    mount({ autoScroll: true, scrollDuration: 2000 });

    // when
    jest.advanceTimersByTime(2000);
    await flushPromises();

    // then
    expect(queryAll('.fade.slds-show').length).toBe(1);
    expect(activeDotId()).toBe('2');
    expect(announcement()).toBe('');
  });

  it.each([
    [true, true],
    [false, false]
  ])('should clear the interval on disconnect only when auto-scroll is %s', (autoScroll, cleared) => {
    // given
    mount({ autoScroll, scrollDuration: 2000 });
    const clearIntervalSpy = jest.spyOn(global, 'clearInterval');

    // when
    document.body.removeChild(element);

    // then
    expect(clearIntervalSpy).toHaveBeenCalledTimes(cleared ? 1 : 0);
  });

  it.each([
    ['a valid JSON string', JSON.stringify(mockData.slideData), mockData.slideData.length],
    ['an invalid JSON string', 'invalid json', 0],
    ['null', null, 0],
    ['undefined', undefined, 0],
    ['a non-array object', { invalid: 'data' }, 0],
    ['an empty array', [], 0]
  ])('should expose the expected number of slides for %s', (_label, input, expected) => {
    // when
    element.slidesData = input;

    // then
    expect(element.slidesData.length).toBe(expected);
  });

  it('should show an error when the slides data is not valid json', async () => {
    // when
    mount({ slidesData: '{ not json' });

    // then
    expect(errorMessage()).toBe('The slides could not be displayed because the slides data is not valid JSON.');
    expect(element.slidesData).toEqual([]);
    jest.useRealTimers();
    await expect(element).toBeAccessible();
  });

  it('should remove the error when valid slides data arrives', async () => {
    // given
    mount({ slidesData: '{ not json' });

    // when
    element.slidesData = mockData.slideData;
    await flushPromises();

    // then
    expect(errorMessage()).toBeUndefined();
    expect(element.slidesData.length).toBe(mockData.slideData.length);
  });

  it('should hide the navigation when there are no slides', () => {
    // when
    mount({ slidesData: [], autoScroll: true });

    // then
    expect(query('.prev')).toBeNull();
    expect(query('.next')).toBeNull();
    expect(queryAll('.dot').length).toBe(0);
    expect(query('.carousel-playback')).toBeNull();
  });

  it('should not lose its position when auto-scroll runs without slides', async () => {
    // given
    mount({ slidesData: [], autoScroll: true, scrollDuration: 1000 });
    jest.advanceTimersByTime(3000);

    // when
    element.slidesData = mockData.slideData;
    await flushPromises();
    jest.advanceTimersByTime(1000);
    await flushPromises();

    // then
    expect(activeDotId()).toBe('2');
  });

  it('should start at the first slide when new slides arrive', async () => {
    // given
    mount();
    queryAll('.dot')[1].click();
    await flushPromises();

    // when
    element.slidesData = [...mockData.slideData];
    await flushPromises();
    query('.next').click();
    await flushPromises();

    // then
    expect(activeDotId()).toBe('2');
  });

  it.each([
    ['auto-scroll is enabled after connecting', { scrollDuration: 1000 }, { autoScroll: true }, '2'],
    [
      'auto-scroll is disabled after connecting',
      { autoScroll: true, scrollDuration: 1000 },
      { autoScroll: false },
      '1'
    ],
    [
      'the duration changes after connecting',
      { autoScroll: true, scrollDuration: 5000 },
      { scrollDuration: 1000 },
      '2'
    ],
    [
      'the settings are set again',
      { autoScroll: true, scrollDuration: 1000 },
      { scrollDuration: 1000, autoScroll: true },
      '2'
    ]
  ])('should follow the timer settings when %s', async (_label, initial, changes, expected) => {
    // given
    mount(initial);

    // when
    Object.assign(element, changes);
    jest.advanceTimersByTime(1000);
    await flushPromises();

    // then
    expect(activeDotId()).toBe(expected);
    expect(element.scrollDuration).toBe(changes.scrollDuration ?? initial.scrollDuration);
  });

  it('should not start a timer before it is connected', () => {
    // given
    const setIntervalSpy = jest.spyOn(global, 'setInterval');

    // when
    element.autoScroll = true;
    element.scrollDuration = 1000;

    // then
    expect(setIntervalSpy).not.toHaveBeenCalled();
  });

  it('should render dots as labelled buttons that mark the current slide', async () => {
    // given
    mount();

    // when
    const dots = queryAll('.dot');
    dots[1].click();
    await flushPromises();

    // then
    expect(dots[1].tagName).toBe('BUTTON');
    expect(dots[1].type).toBe('button');
    expect(dots[1].getAttribute('aria-label')).toBe('Show slide 2');
    expect(dots[1].getAttribute('aria-current')).toBe('true');
    expect(dots[0].getAttribute('aria-current')).toBe('false');
  });

  it('should mark the carousel and its slides for screen readers', () => {
    // when
    mount({ slidesData: threeSlides });

    // then
    expect(region().getAttribute('aria-roledescription')).toBe('carousel');
    const slides = queryAll('[aria-roledescription="slide"]');
    expect([...slides].map((slide) => slide.getAttribute('aria-label'))).toEqual(['1 of 3', '2 of 3', '3 of 3']);
    expect([...slides].map((slide) => slide.getAttribute('aria-hidden'))).toEqual(['false', 'true', 'true']);
  });

  it('should move a track with all slides when the transition is slide', async () => {
    // given
    mount({ slidesData: threeSlides, transition: 'slide' });

    // when
    query('.next').click();
    await flushPromises();

    // then
    expect(queryAll('.carousel-slide').length).toBe(3);
    expect(query('.fade')).toBeNull();
    expect(query('.carousel-track-slide').style.transform).toBe('translateX(-100%)');
  });

  it.each([
    ['an unknown transition', 'unknown', 'unknown'],
    ['a switch from slide to fade', 'slide', 'fade']
  ])('should render the fade transition for %s', async (_label, initial, changed) => {
    // given
    mount({ slidesData: threeSlides, transition: initial });

    // when
    element.transition = changed;
    await flushPromises();

    // then
    expect(queryAll('.fade').length).toBe(3);
    expect(queryAll('.carousel-slide').length).toBe(0);
    expect(query('.carousel-track-slide')).toBeNull();
  });

  it.each([
    ['ArrowRight', '2', true, 'Slide 2 of 3: Slide 2'],
    ['ArrowLeft', '3', true, 'Slide 3 of 3'],
    ['Enter', '1', false, '']
  ])('should handle the %s key', async (key, expected, handled, announced) => {
    // given
    mount({ slidesData: threeSlides });

    // when
    const event = pressKey(query('.next'), key);
    await flushPromises();

    // then
    expect(activeDotId()).toBe(expected);
    expect(event.defaultPrevented).toBe(handled);
    expect(announcement()).toBe(announced);
  });

  it('should move the focus to the new dot when an arrow key is pressed on a dot', async () => {
    // given
    mount({ slidesData: threeSlides });
    const dots = queryAll('.dot');
    dots[0].focus();

    // when
    pressKey(dots[0], 'ArrowRight');
    await flushPromises();

    // then
    expect(element.shadowRoot.activeElement).toBe(dots[1]);
    expect(announcement()).toBe('Slide 2 of 3: Slide 2');
  });

  it.each([
    ['to the left', 200, 100, 0, '2'],
    ['to the right', 100, 200, 0, '3'],
    ['too short', 100, 130, 0, '1'],
    ['mostly vertical', 100, 160, 120, '1']
  ])('should follow a swipe %s', async (_label, fromX, toX, toY, expected) => {
    // given
    mount({ slidesData: threeSlides });

    // when
    swipe(fromX, toX, toY);
    await flushPromises();

    // then
    expect(activeDotId()).toBe(expected);
  });

  it('should ignore a pointer up without a pointer down and a cancelled swipe', async () => {
    // given
    mount({ slidesData: threeSlides });
    const viewport = query('.carousel-viewport');

    // when
    viewport.dispatchEvent(new MouseEvent('pointerup', { clientX: 0, bubbles: true }));
    viewport.dispatchEvent(new MouseEvent('pointerdown', { clientX: 200, bubbles: true }));
    viewport.dispatchEvent(new MouseEvent('pointercancel', { bubbles: true }));
    viewport.dispatchEvent(new MouseEvent('pointerup', { clientX: 0, bubbles: true }));
    await flushPromises();

    // then
    expect(activeDotId()).toBe('1');
  });

  it('should pause auto-scroll while the mouse is over the carousel', async () => {
    // given
    mount({ autoScroll: true, scrollDuration: 1000 });

    // when
    region().dispatchEvent(new MouseEvent('mouseenter'));
    jest.advanceTimersByTime(3000);
    await flushPromises();
    const whileHovered = activeDotId();
    region().dispatchEvent(new MouseEvent('mouseleave'));
    jest.advanceTimersByTime(1000);
    await flushPromises();

    // then
    expect(whileHovered).toBe('1');
    expect(activeDotId()).toBe('2');
  });

  it('should stop and start auto-scroll with the playback button', async () => {
    // given
    mount({ autoScroll: true, scrollDuration: 1000 });
    const button = query('.carousel-playback');

    // when
    button.click();
    jest.advanceTimersByTime(3000);
    await flushPromises();
    const stopped = { slide: activeDotId(), icon: button.iconName, label: button.alternativeText };
    button.click();
    jest.advanceTimersByTime(1000);
    await flushPromises();

    // then
    expect(stopped).toEqual({ slide: '1', icon: 'utility:play', label: 'Start automatic slide show' });
    expect(activeDotId()).toBe('2');
    expect(button.iconName).toBe('utility:pause');
    expect(button.alternativeText).toBe('Stop automatic slide show');
  });

  it('should show the playback button only with auto-scroll and more than one slide', () => {
    // when
    mount({ slidesData: [mockData.slideData[0]], autoScroll: true, hideNavigationDots: true });

    // then
    expect(query('.carousel-playback')).toBeNull();
    expect(query('.carousel-controls')).toBeNull();
  });

  it.each([
    ['keyboard focus stops it', false, '1'],
    ['focus after a pointer press keeps it running', true, '2']
  ])('should treat focus inside the carousel so that %s', async (_label, pointer, expected) => {
    // given
    mount({ autoScroll: true, scrollDuration: 1000 });
    const dot = queryAll('.dot')[0];

    // when
    if (pointer) {
      query('.carousel-viewport').dispatchEvent(new MouseEvent('pointerdown', { bubbles: true }));
    }
    dot.dispatchEvent(new FocusEvent('focusin', { bubbles: true, composed: true }));
    jest.advanceTimersByTime(1000);
    await flushPromises();

    // then
    expect(activeDotId()).toBe(expected);
  });

  it('should forget a pointer press once it is released', async () => {
    // given
    mount({ autoScroll: true, scrollDuration: 1000 });
    const viewport = query('.carousel-viewport');
    viewport.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true }));
    viewport.dispatchEvent(new MouseEvent('pointerup', { bubbles: true }));

    // when
    queryAll('.dot')[0].dispatchEvent(new FocusEvent('focusin', { bubbles: true, composed: true }));
    jest.advanceTimersByTime(1000);
    await flushPromises();

    // then
    expect(activeDotId()).toBe('1');
  });
});
