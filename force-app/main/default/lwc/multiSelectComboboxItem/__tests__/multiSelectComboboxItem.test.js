import MultiSelectComboboxItem from 'c/multiSelectComboboxItem';
import { createElement } from 'lwc';

let element;

describe('c-multi-select-combobox-item', () => {
  beforeEach(() => {
    element = createElement('c-multi-select-combobox-item', {
      is: MultiSelectComboboxItem
    });
  });

  afterEach(() => {
    while (document.body.firstChild) {
      document.body.removeChild(document.body.firstChild);
    }
  });

  it('should be accessible and show label of selected item', async () => {
    // given
    element.item = { name: 'name', label: 'label', selected: true };

    // when
    document.body.appendChild(element);
    const item = element.shadowRoot.querySelector('span.slds-truncate');

    // then
    expect(item.textContent).toBe('label');
    await expect(element).toBeAccessible();
  });

  it('should fire change event when clicked', async () => {
    // given
    const mockClickHandler = jest.fn();
    element.item = { name: 'name', label: 'label', selected: false };
    element.addEventListener('click', mockClickHandler);

    // when
    document.body.appendChild(element);
    const listItem = element.shadowRoot.querySelector('li');
    listItem.click();

    // then
    expect(mockClickHandler).toHaveBeenCalledTimes(1);
  });

  it.each([['Enter'], [' ']])('should fire change on the key %s', (key) => {
    // given
    const handler = jest.fn();
    element.item = { value: 'value', label: 'label', selected: false };
    element.addEventListener('change', handler);
    document.body.appendChild(element);

    // when
    const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true });
    element.shadowRoot.querySelector('[role="option"]').dispatchEvent(event);

    // then
    expect(handler.mock.calls[0][0].detail.selected).toBe(true);
    expect(event.defaultPrevented).toBe(true);
  });

  it('should ignore other keys', () => {
    // given
    const handler = jest.fn();
    element.item = { value: 'value', label: 'label', selected: false };
    element.addEventListener('change', handler);
    document.body.appendChild(element);

    // when
    const event = new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, cancelable: true });
    element.shadowRoot.querySelector('[role="option"]').dispatchEvent(event);

    // then
    expect(handler).not.toHaveBeenCalled();
    expect(event.defaultPrevented).toBe(false);
  });

  it('should be focusable and expose its selection', () => {
    // given
    element.item = { value: 'value', label: 'label', selected: true };
    document.body.appendChild(element);

    // when
    element.focus();

    // then
    const option = element.shadowRoot.querySelector('[role="option"]');
    expect(element.shadowRoot.activeElement).toBe(option);
    expect(option.getAttribute('tabindex')).toBe('-1');
    expect(option.getAttribute('aria-selected')).toBe('true');
  });

  it('should mark an option that is not selected', () => {
    // given
    element.item = { value: 'value', label: 'label' };

    // when
    document.body.appendChild(element);

    // then
    expect(element.shadowRoot.querySelector('[role="option"]').getAttribute('aria-selected')).toBe('false');
  });
});
