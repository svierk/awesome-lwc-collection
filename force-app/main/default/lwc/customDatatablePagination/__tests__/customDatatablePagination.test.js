import CustomDatatablePagination from 'c/customDatatablePagination';
import { createElement } from 'lwc';

let element;

describe('c-custom-datatable-pagination', () => {
  beforeEach(() => {
    element = createElement('c-custom-datatable-pagination', {
      is: CustomDatatablePagination
    });
  });

  afterEach(() => {
    while (document.body.firstChild) {
      document.body.removeChild(document.body.firstChild);
    }
  });

  it('should be accessible and render four navigation buttons', async () => {
    // when
    document.body.appendChild(element);

    // then
    const buttons = element.shadowRoot.querySelectorAll('lightning-button');
    expect(buttons).toHaveLength(4);

    const labels = [...buttons].map((b) => b.label);
    expect(labels).toEqual(['First', 'Previous', 'Next', 'Last']);

    await expect(element).toBeAccessible();
  });

  it('should display the pagination label', () => {
    // given
    element.paginationLabel = 'Page 3 of 10';

    // when
    document.body.appendChild(element);

    // then
    const span = element.shadowRoot.querySelector('.slds-align-middle');
    expect(span.textContent).toContain('Page 3 of 10');
  });

  it('should disable first and previous buttons on first page', () => {
    // given
    element.isFirstPage = true;
    element.isLastPage = false;

    // when
    document.body.appendChild(element);

    // then
    const buttons = element.shadowRoot.querySelectorAll('lightning-button');
    const firstButton = [...buttons].find((b) => b.label === 'First');
    const previousButton = [...buttons].find((b) => b.label === 'Previous');
    const nextButton = [...buttons].find((b) => b.label === 'Next');
    const lastButton = [...buttons].find((b) => b.label === 'Last');

    expect(firstButton.disabled).toBe(true);
    expect(previousButton.disabled).toBe(true);
    expect(nextButton.disabled).toBe(false);
    expect(lastButton.disabled).toBe(false);
  });

  it('should disable next and last buttons on last page', () => {
    // given
    element.isFirstPage = false;
    element.isLastPage = true;

    // when
    document.body.appendChild(element);

    // then
    const buttons = element.shadowRoot.querySelectorAll('lightning-button');
    const firstButton = [...buttons].find((b) => b.label === 'First');
    const previousButton = [...buttons].find((b) => b.label === 'Previous');
    const nextButton = [...buttons].find((b) => b.label === 'Next');
    const lastButton = [...buttons].find((b) => b.label === 'Last');

    expect(firstButton.disabled).toBe(false);
    expect(previousButton.disabled).toBe(false);
    expect(nextButton.disabled).toBe(true);
    expect(lastButton.disabled).toBe(true);
  });

  it('should dispatch "first" event when first button is clicked', () => {
    // given
    const handler = jest.fn();
    element.addEventListener('first', handler);
    document.body.appendChild(element);

    // when
    const button = [...element.shadowRoot.querySelectorAll('lightning-button')].find((b) => b.label === 'First');
    button.click();

    // then
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('should dispatch "previous" event when previous button is clicked', () => {
    // given
    const handler = jest.fn();
    element.addEventListener('previous', handler);
    document.body.appendChild(element);

    // when
    const button = [...element.shadowRoot.querySelectorAll('lightning-button')].find((b) => b.label === 'Previous');
    button.click();

    // then
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('should dispatch "next" event when next button is clicked', () => {
    // given
    const handler = jest.fn();
    element.addEventListener('next', handler);
    document.body.appendChild(element);

    // when
    const button = [...element.shadowRoot.querySelectorAll('lightning-button')].find((b) => b.label === 'Next');
    button.click();

    // then
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('should dispatch "last" event when last button is clicked', () => {
    // given
    const handler = jest.fn();
    element.addEventListener('last', handler);
    document.body.appendChild(element);

    // when
    const button = [...element.shadowRoot.querySelectorAll('lightning-button')].find((b) => b.label === 'Last');
    button.click();

    // then
    expect(handler).toHaveBeenCalledTimes(1);
  });
});
