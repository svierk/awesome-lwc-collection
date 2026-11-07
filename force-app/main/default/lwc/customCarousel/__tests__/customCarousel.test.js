import CustomCarousel from 'c/customCarousel';
import { graphql } from 'lightning/graphql';
import { createElement } from 'lwc';

const mockData = require('./data/customCarousel.json');

const threeSlides = [...mockData.slideData, { image: 'third link', description: 'Third' }];

let element;

const flushPromises = () => Promise.resolve();

const query = (selector) => element.shadowRoot.querySelector(selector);

const queryAll = (selector) => element.shadowRoot.querySelectorAll(selector);

const activeDotId = () => query('.active[data-id]').dataset.id;

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

// e.g. 'down 200, up 100': pointer events on the slides with their clientX and clientY
const pointer = (events) =>
  events.match(/[a-z]+( \d+)*/g)?.forEach((event) => {
    const [type, clientX = 0, clientY = 0] = event.split(' ');
    const init = { clientX: Number(clientX), clientY: Number(clientY), bubbles: true };
    query('.carousel-viewport').dispatchEvent(new MouseEvent(`pointer${type}`, init));
  });

const file = (...values) => ({
  node: {
    ContentDocument: Object.fromEntries(
      ['Title', 'FileExtension', 'LatestPublishedVersionId'].map((key, i) => [key, { value: values[i] }])
    )
  }
});

const emitFiles = (...edges) => graphql.emit({ uiapi: { query: { ContentDocumentLink: { edges } } } });

const recordFiles = { useRecordFiles: true, recordId: '001000000000001' };

const linkedSlides = [
  { image: 'a', heading: 'A', link: 'https://example.com/a', linkLabel: 'Read more' },
  { image: 'b', heading: 'B', link: '/lightning/page/home' },
  { image: 'c', heading: 'C', link: 'data:text/html,<p>c</p>' },
  { image: 'd', link: '//example.com/d' }
];

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

  it('should render the slides of a json string without a record id and show the first one', () => {
    // when
    mount({ slidesData: JSON.stringify(mockData.slideData), useRecordFiles: true });

    // then
    expect(queryAll('.fade').length).toBe(mockData.slideData.length);
    expect(queryAll('.fade.slds-show').length).toBe(1);
    expect(activeDotId()).toBe('1');
    expect(errorMessage()).toBeUndefined();
    expect(query('.slds-card')).toBeNull();
    expect(query('.carousel-link')).toBeNull();
    expect(query('.prev').iconName).toBe('utility:chevronleft');
    expect(query('.next').iconName).toBe('utility:chevronright');
  });

  it('should hide all optional ui elements with the hide flags and a single slide', () => {
    // when
    const hideFlags = {
      hideNavigationButtons: true,
      hideNavigationDots: true,
      hideSlideText: true,
      hideSlideNumber: true
    };
    mount({ ...hideFlags, slidesData: [mockData.slideData[0]], autoScroll: true });

    // then
    expect(query('.carousel-playback')).toBeNull();
    expect(query('.carousel-controls')).toBeNull();
    expect(query('.prev')).toBeNull();
    expect(query('.next')).toBeNull();
    expect(queryAll('.dot').length).toBe(0);
    expect(query('.text-section')).toBeNull();
    expect(query('.slideNumbers')).toBeNull();
  });

  it.each([
    ['fade', {}],
    ['slide with auto-scroll', { transition: 'slide', autoScroll: true }],
    ['a card, a title and an aspect ratio', { showCard: true, cardTitle: 'Highlights', aspectRatio: '16:9' }],
    ['a card without title', { showCard: true }],
    ['thumbnails and links', { showThumbnails: true, slidesData: linkedSlides }]
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
    expect(query('.slideNumbers').textContent).toBe(`${expected}/${mockData.slideData.length}`);
  });

  it.each([
    [true, true],
    [false, false]
  ])(
    'should start no timer before connecting and clear it on disconnect only when auto-scroll is %s',
    (autoScroll, cleared) => {
      // given
      const setIntervalSpy = jest.spyOn(global, 'setInterval');
      Object.assign(element, { autoScroll, scrollDuration: 2000 });
      const startedBeforeConnect = setIntervalSpy.mock.calls.length;
      mount();
      const clearIntervalSpy = jest.spyOn(global, 'clearInterval');

      // when
      document.body.removeChild(element);

      // then
      expect(startedBeforeConnect).toBe(0);
      expect(clearIntervalSpy).toHaveBeenCalledTimes(cleared ? 1 : 0);
    }
  );

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

  it('should show an error for invalid json and start again at the first slide when valid slides data arrives', async () => {
    // given
    jest.useRealTimers();
    mount();
    queryAll('.dot')[1].click();
    element.slidesData = '{ not json';
    await flushPromises();
    const shown = errorMessage();
    await expect(element).toBeAccessible();

    // when
    element.slidesData = [...mockData.slideData];
    await flushPromises();
    query('.next').click();
    await flushPromises();

    // then
    expect(shown).toBe('The slides could not be displayed because the slides data is not valid JSON.');
    expect(errorMessage()).toBeUndefined();
    expect(activeDotId()).toBe('2');
  });

  it('should hide the navigation without slides and keep its position while auto-scroll runs', async () => {
    // given
    mount({ slidesData: [], autoScroll: true, scrollDuration: 1000 });
    jest.advanceTimersByTime(3000);
    const hidden = ['.prev', '.next', '.dot', '.carousel-playback', '.slideNumbers'].map((selector) => query(selector));

    // when
    element.slidesData = mockData.slideData;
    await flushPromises();
    jest.advanceTimersByTime(1000);
    await flushPromises();

    // then
    expect(hidden).toEqual([null, null, null, null, null]);
    expect(activeDotId()).toBe('2');
  });

  it.each([
    ['the initial settings', { autoScroll: true, scrollDuration: 1000 }, {}, '2'],
    ['enabling auto-scroll', { scrollDuration: 1000 }, { autoScroll: true }, '2'],
    ['disabling auto-scroll', { autoScroll: true, scrollDuration: 1000 }, { autoScroll: false }, '1'],
    ['a new duration', { autoScroll: true, scrollDuration: 5000 }, { scrollDuration: 1000 }, '2'],
    ['the same settings', { autoScroll: true, scrollDuration: 1000 }, { scrollDuration: 1000, autoScroll: true }, '2']
  ])('should follow the timer settings after %s', async (_label, initial, changes, expected) => {
    // given
    mount(initial);

    // when
    Object.assign(element, changes);
    jest.advanceTimersByTime(1000);
    await flushPromises();

    // then
    expect(activeDotId()).toBe(expected);
    expect(queryAll('.fade.slds-show').length).toBe(1);
    expect(announcement()).toBe('');
    expect(element.scrollDuration).toBe(changes.scrollDuration ?? initial.scrollDuration);
  });

  it.each([
    ['16:9', '16 / 9'],
    [' 4 / 3 ', '4 / 3'],
    ['1.5', '1.5'],
    ['16:0', ''],
    ['16:9:4', ''],
    ['wide', '']
  ])('should apply the aspect ratio %p as %p', (aspectRatio, expected) => {
    // when
    mount({ aspectRatio, customHeight: '400px', customWidth: '800px' });

    // then
    const viewport = query('.carousel-viewport');
    expect(viewport.getAttribute('style') ?? '').toBe(expected ? `aspect-ratio: ${expected}` : '');
    expect(viewport.classList.contains('carousel-fill')).toBe(expected !== '');
    expect(query('img').style.height).toBe(expected ? '' : '400px');
    expect(query('.slds-is-relative.container').style.width).toBe('800px');
  });

  it('should mark the carousel, its slides and dots for screen readers', async () => {
    // given
    mount({ slidesData: threeSlides });
    const dots = queryAll('.dot');

    // when
    dots[1].click();
    await flushPromises();

    // then
    expect(query('section.carousel').getAttribute('aria-roledescription')).toBe('carousel');
    const slides = [...queryAll('.fade')];
    const attribute = (name) => slides.map((slide) => slide.getAttribute(name));
    expect(attribute('role')).toEqual(['group', 'group', 'group']);
    expect(attribute('aria-roledescription')).toEqual(['slide', 'slide', 'slide']);
    expect(attribute('aria-label')).toEqual(['1 of 3', '2 of 3', '3 of 3']);
    expect(attribute('aria-hidden')).toEqual(['true', 'false', 'true']);
    expect([dots[1].tagName, dots[1].type, dots[1].getAttribute('aria-label')]).toEqual([
      'BUTTON',
      'button',
      'Show slide 2'
    ]);
    expect([dots[0], dots[1]].map((dot) => dot.getAttribute('aria-current'))).toEqual(['false', 'true']);
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

  it.each([
    ['dot', {}, '.dot'],
    ['thumbnail', { showThumbnails: true }, '.carousel-thumbnail']
  ])('should move the focus to the new %s when an arrow key is pressed on it', async (_label, props, selector) => {
    // given
    mount({ slidesData: threeSlides, ...props });
    const buttons = queryAll(selector);
    buttons[0].focus();

    // when
    pressKey(buttons[0], 'ArrowRight');
    await flushPromises();

    // then
    expect(element.shadowRoot.activeElement).toBe(buttons[1]);
    expect(announcement()).toBe('Slide 2 of 3: Slide 2');
  });

  it.each([
    ['a swipe to the left', 'down 200, up 100', '2'],
    ['a swipe to the right', 'down 100, up 200', '3'],
    ['a too short swipe', 'down 100, up 130', '1'],
    ['a mostly vertical swipe', 'down 100, up 160 120', '1'],
    ['a pointer up without pointer down', 'up 0', '1'],
    ['a cancelled swipe', 'down 200, cancel, up 0', '1']
  ])('should follow %s', async (_label, events, expected) => {
    // given
    mount({ slidesData: threeSlides });

    // when
    pointer(events);
    await flushPromises();

    // then
    expect(activeDotId()).toBe(expected);
  });

  it('should pause auto-scroll on hover and stop and start it with the playback button', async () => {
    // given
    mount({ autoScroll: true, scrollDuration: 1000 });
    const button = query('.carousel-playback');
    element.dispatchEvent(new MouseEvent('mouseenter'));
    jest.advanceTimersByTime(3000);
    await flushPromises();
    const whileHovered = activeDotId();
    element.dispatchEvent(new MouseEvent('mouseleave'));

    // when
    button.click();
    jest.advanceTimersByTime(3000);
    await flushPromises();
    const stopped = { slide: activeDotId(), icon: button.iconName, label: button.alternativeText };
    button.click();
    jest.advanceTimersByTime(1000);
    await flushPromises();

    // then
    expect(whileHovered).toBe('1');
    expect(stopped).toEqual({ slide: '1', icon: 'utility:play', label: 'Start automatic slide show' });
    expect(activeDotId()).toBe('2');
    expect(button.iconName).toBe('utility:pause');
    expect(button.alternativeText).toBe('Stop automatic slide show');
  });

  it.each([
    ['keyboard focus stops it', '', '1'],
    ['focus during a pointer press keeps it running', 'down', '2'],
    ['focus after a released pointer press stops it', 'down, up', '1']
  ])('should treat focus inside the carousel so that %s', async (_label, events, expected) => {
    // given
    mount({ autoScroll: true, scrollDuration: 1000 });
    pointer(events);

    // when
    queryAll('.dot')[0].dispatchEvent(new FocusEvent('focusin', { bubbles: true, composed: true }));
    jest.advanceTimersByTime(1000);
    await flushPromises();

    // then
    expect(activeDotId()).toBe(expected);
  });

  it('should wrap the carousel in a card and show image thumbnails instead of dots', async () => {
    // given
    mount({ slidesData: threeSlides, showCard: true, cardIcon: 'standard:feed', cardTitle: 'Highlights' });

    // when
    element.showThumbnails = true;
    await flushPromises();

    // then
    const thumbnails = [...queryAll('.carousel-thumbnail')];
    expect(query('.dot')).toBeNull();
    const sources = thumbnails.map((thumbnail) => thumbnail.querySelector('img').getAttribute('src'));
    expect(sources.join()).toBe('some link,another link,third link');
    expect(thumbnails.map((thumbnail) => thumbnail.classList.contains('active'))).toEqual([true, false, false]);
    expect(query('.slds-card__header lightning-icon').iconName).toBe('standard:feed');
    expect(query('.slds-card__header-title').textContent).toBe('Highlights');
    expect(query('.slds-card .slds-card__body section.carousel')).toBeTruthy();
  });

  it.each([
    [0, 'https://example.com/a', 'Read more'],
    [1, '/lightning/page/home', 'Learn more'],
    [2, undefined, undefined],
    [3, undefined, undefined]
  ])('should show the call to action of slide %p only for a safe link', (index, href, label) => {
    // when
    mount({ slidesData: linkedSlides });

    // then
    const link = queryAll('.text-section')[index].querySelector('a');
    expect(link?.getAttribute('href')).toBe(href);
    expect(link?.textContent).toBe(label);
  });

  it('should move a track with all slides and keep the links of hidden slides out of the tab order', async () => {
    // given
    mount({ slidesData: linkedSlides, transition: 'slide' });

    // when
    query('.next').click();
    await flushPromises();

    // then
    expect(queryAll('.carousel-slide').length).toBe(linkedSlides.length);
    expect(query('.fade')).toBeNull();
    expect(query('.carousel-track-slide').style.transform).toBe('translateX(-100%)');
    expect([...queryAll('.carousel-link')].map((link) => link.tabIndex)).toEqual([-1, 0]);
  });

  it('should show the images attached to the record instead of the slides data', async () => {
    // given
    mount(recordFiles);

    // when
    emitFiles(file('Beach', 'JPG', '068A'), file('Terms', 'pdf', '068B'), file('Logo', 'png', '068C'));
    await flushPromises();
    element.slidesData = threeSlides;
    await flushPromises();

    // then
    expect([...queryAll('.carousel-viewport img')].map((img) => [img.getAttribute('src'), img.alt])).toEqual([
      ['/sfc/servlet.shepherd/version/download/068A', 'Beach'],
      ['/sfc/servlet.shepherd/version/download/068C', 'Logo']
    ]);
    expect(query('p')).toBeNull();
  });

  it.each([
    ['no images', () => emitFiles(file('Terms', 'pdf', '068B')), 'No images are attached to this record.'],
    [
      'an error',
      () => graphql.emitErrors([{ message: 'No access' }]),
      'The images of this record could not be loaded: No access'
    ]
  ])('should show a message when the record has %s', async (_label, emit, message) => {
    // given
    jest.useRealTimers();
    mount(recordFiles);

    // when
    emit();
    await flushPromises();

    // then
    expect(query('p')?.textContent ?? errorMessage()).toBe(message);
    expect(query('.fade')).toBeNull();
    await expect(element).toBeAccessible();
  });
});
