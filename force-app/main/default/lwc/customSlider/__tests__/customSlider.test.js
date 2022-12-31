import CustomSlider from 'c/customSlider';
import { createElement } from 'lwc';

const mockData = require('./data/customSlider.json');

let element;

describe('c-custom-slider', () => {
  beforeEach(() => {
    element = createElement('c-custom-slider', {
      is: CustomSlider
    });
  });

  afterEach(() => {
    while (document.body.firstChild) {
      document.body.removeChild(document.body.firstChild);
    }
    jest.clearAllMocks();
  });

  it('should be accessible and load correct number of slides', async () => {
    // given
    element.slideData = mockData.slideData;
    element.autoScroll = mockData.autoScroll;

    // when
    document.body.appendChild(element);
    const slidesContainer = element.shadowRoot.querySelector('div[class="slds-is-relative container"]');

    // then
    expect(slidesContainer.childNodes.length).toBe(mockData.slideData.length);
    await expect(element).toBeAccessible();
  });

  it('should slide forward on next button click', () => {
    // given
    const mockClickHandler = jest.fn();
    element.slideData = mockData.slideData;

    // when
    document.body.appendChild(element);
    const nextButton = element.shadowRoot.querySelector('a[class="next"]');
    nextButton.addEventListener('click', mockClickHandler);
    nextButton.click();

    // then
    expect(mockClickHandler).toHaveBeenCalledTimes(1);
  });

  it('should slide backward on prev button click', () => {
    // given
    const mockClickHandler = jest.fn();
    element.slideData = mockData.slideData;

    // when
    document.body.appendChild(element);
    const prevButton = element.shadowRoot.querySelector('a[class="prev"]');
    prevButton.addEventListener('click', mockClickHandler);
    prevButton.click();

    // then
    expect(mockClickHandler).toHaveBeenCalledTimes(1);
  });
});
