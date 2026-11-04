import MultiSelectCombobox from 'c/multiSelectCombobox';
import { createElement } from 'lwc';

const OPTIONS = [
  { label: 'One', value: 'one' },
  { label: 'Two', value: 'two', selected: true },
  { label: 'Three', value: 'three' }
];

let element;

const flushPromises = () => new Promise((resolve) => setTimeout(resolve, 0));
const input = () => element.shadowRoot.querySelector('.multi-select-combobox__input');
const search = () => element.shadowRoot.querySelector('.multi-select-combobox__search');
const items = () => [...element.shadowRoot.querySelectorAll('c-multi-select-combobox-item')];
const isOpen = () =>
  element.shadowRoot.querySelector('.multi-select-combobox__dropdown').classList.contains('slds-is-open');
const focused = () => element.shadowRoot.activeElement;
const focusedValue = () => focused()?.item?.value;

const press = async (key, options = {}) => {
  const active = focused() ?? input();
  const target = active.shadowRoot?.activeElement ?? active;
  const event = new KeyboardEvent('keydown', { key, bubbles: true, composed: true, cancelable: true, ...options });
  target.dispatchEvent(event);
  await flushPromises();
  return event;
};

const setup = (properties = {}) => {
  Object.assign(element, { options: OPTIONS, ...properties });
  document.body.appendChild(element);
  input().focus();
};

describe('c-multi-select-combobox keyboard', () => {
  beforeEach(() => {
    element = createElement('c-multi-select-combobox', { is: MultiSelectCombobox });
  });

  afterEach(() => {
    while (document.body.firstChild) {
      document.body.removeChild(document.body.firstChild);
    }
  });

  it.each([['ArrowDown'], ['Enter'], [' ']])('should open on %s and focus the selected option', async (key) => {
    // given
    setup();

    // when
    const event = await press(key);

    // then
    expect(isOpen()).toBe(true);
    expect(focusedValue()).toBe('two');
    expect(event.defaultPrevented).toBe(true);
  });

  it('should focus the first option when nothing is selected', async () => {
    // given
    setup({
      options: [
        { label: 'One', value: 'one' },
        { label: 'Two', value: 'two' }
      ]
    });

    // when
    await press('ArrowDown');

    // then
    expect(focusedValue()).toBe('one');
  });

  it('should open on ArrowUp and focus the last option', async () => {
    // given
    setup();

    // when
    await press('ArrowUp');

    // then
    expect(isOpen()).toBe(true);
    expect(focusedValue()).toBe('three');
  });

  it('should move through the options with the arrow keys and wrap around', async () => {
    // given
    setup();
    await press('ArrowDown');

    // when / then
    await press('ArrowDown');
    expect(focusedValue()).toBe('three');
    await press('ArrowDown');
    expect(focusedValue()).toBe('one');
    await press('ArrowUp');
    expect(focusedValue()).toBe('three');
  });

  it('should jump to the first and last option with Home and End', async () => {
    // given
    setup();
    await press('ArrowDown');

    // when / then
    await press('End');
    expect(focusedValue()).toBe('three');
    await press('Home');
    expect(focusedValue()).toBe('one');
  });

  it('should toggle an option with Enter and Space and keep the list open', async () => {
    // given
    const handler = jest.fn();
    element.addEventListener('change', handler);
    setup();
    await press('ArrowDown');

    // when
    await press('Enter');

    // then
    expect(handler.mock.calls[0][0].detail).toEqual([]);
    expect(isOpen()).toBe(true);

    // when
    await press(' ');

    // then
    expect(handler.mock.calls[1][0].detail.map((item) => item.value)).toEqual(['two']);
    expect(focusedValue()).toBe('two');
  });

  it('should close and return to the input after a single select choice', async () => {
    // given
    setup({ singleSelect: true });
    await press('ArrowDown');
    await press('ArrowDown');

    // when
    await press('Enter');

    // then
    expect(isOpen()).toBe(false);
    expect(focused()).toBe(input());
    expect(input().value).toBe('Three');
  });

  it('should close on Escape, return to the input and not leak the key', async () => {
    // given
    const closeHandler = jest.fn();
    const outerHandler = jest.fn();
    element.addEventListener('close', closeHandler);
    setup();
    document.body.addEventListener('keydown', outerHandler);
    await press('ArrowDown');

    // when
    await press('Escape');
    document.body.removeEventListener('keydown', outerHandler);

    // then
    expect(isOpen()).toBe(false);
    expect(focused()).toBe(input());
    expect(closeHandler).toHaveBeenCalledTimes(1);
    expect(outerHandler).toHaveBeenCalledTimes(1);
  });

  it('should leave Escape alone while the list is closed', async () => {
    // given
    const closeHandler = jest.fn();
    element.addEventListener('close', closeHandler);
    setup();

    // when
    const event = await press('Escape');

    // then
    expect(closeHandler).not.toHaveBeenCalled();
    expect(event.defaultPrevented).toBe(false);
  });

  it('should close when Tab leaves an open list', async () => {
    // given
    setup();
    await press('ArrowDown');

    // when
    const event = await press('Tab');

    // then
    expect(isOpen()).toBe(false);
    expect(event.defaultPrevented).toBe(false);
  });

  it('should stay open when Tab moves from the input to the search', async () => {
    // given
    setup({ enableSearch: true });
    input().click();
    await flushPromises();

    // when
    await press('Tab');

    // then
    expect(isOpen()).toBe(true);
  });

  it('should close when Tab leaves the search, but not when going back to the input', async () => {
    // given
    setup({ enableSearch: true });
    input().click();
    await flushPromises();
    search().focus();

    // when / then
    await press('Tab', { shiftKey: true });
    expect(isOpen()).toBe(true);
    await press('Tab');
    expect(isOpen()).toBe(false);
  });

  it('should move between the search and the options with the arrow keys', async () => {
    // given
    setup({ enableSearch: true });
    input().click();
    await flushPromises();
    search().focus();

    // when / then
    await press('ArrowDown');
    expect(focusedValue()).toBe('one');
    await press('ArrowUp');
    expect(focused()).toBe(search());
  });

  it('should keep Home, End, Space and letters for typing in the search', async () => {
    // given
    setup({ enableSearch: true });
    input().click();
    await flushPromises();
    search().focus();

    // when
    const home = await press('Home');
    const space = await press(' ');
    const letter = await press('a');

    // then
    expect(home.defaultPrevented).toBe(false);
    expect(space.defaultPrevented).toBe(false);
    expect(letter.defaultPrevented).toBe(false);
    expect(focused()).toBe(search());
  });

  it('should not submit a form with Enter in the search', async () => {
    // given
    setup({ enableSearch: true });
    input().click();
    await flushPromises();
    search().focus();

    // when
    const event = await press('Enter');

    // then
    expect(event.defaultPrevented).toBe(true);
  });

  it('should ignore other keys on the input', async () => {
    // given
    setup();

    // when
    const event = await press('a');

    // then
    expect(isOpen()).toBe(false);
    expect(event.defaultPrevented).toBe(false);
  });

  it('should not fail on arrow keys when the search has no results', async () => {
    // given
    setup({ enableSearch: true });
    input().click();
    await flushPromises();
    search().focus();
    search().value = 'nothing';
    search().dispatchEvent(new CustomEvent('input'));
    await flushPromises();
    expect(items()).toHaveLength(0);

    // when
    await press('ArrowDown');

    // then
    expect(focused()).toBe(search());
  });

  it('should expose the state to assistive technology and be accessible', async () => {
    // given
    setup({ label: 'Products' });

    // then
    expect(input().getAttribute('role')).toBe('combobox');
    expect(input().getAttribute('aria-haspopup')).toBe('listbox');
    expect(input().getAttribute('aria-expanded')).toBe('false');
    expect(input().getAttribute('aria-label')).toBe('Products');
    const listbox = element.shadowRoot.querySelector('[role="listbox"]');
    expect(input().getAttribute('aria-controls')).toBe(listbox.id);
    expect(listbox.getAttribute('aria-multiselectable')).toBe('true');
    await expect(element).toBeAccessible();

    // when
    await press('ArrowDown');

    // then
    expect(input().getAttribute('aria-expanded')).toBe('true');
    await expect(element).toBeAccessible();
  });

  it('should not mark a single select list as multi selectable and label it by the placeholder', () => {
    // given
    setup({ singleSelect: true, placeholder: 'Pick one' });

    // then
    expect(element.shadowRoot.querySelector('[role="listbox"]').getAttribute('aria-multiselectable')).toBe('false');
    expect(input().getAttribute('aria-label')).toBe('Pick one');
  });

  it('should keep the search outside of the listbox', () => {
    // given
    setup({ enableSearch: true });

    // then
    expect(element.shadowRoot.querySelector('[role="listbox"] input')).toBeNull();
  });

  it.each([['Enter'], [' ']])('should close with %s when the input has the focus and the list is open', async (key) => {
    // given
    setup();
    input().click();
    await flushPromises();

    // when
    const event = await press(key);

    // then
    expect(isOpen()).toBe(false);
    expect(focused()).toBe(input());
    expect(event.defaultPrevented).toBe(true);
  });

  it('should open with Home and End on the first and last option', async () => {
    // given
    setup();

    // when
    await press('Home');

    // then
    expect(focusedValue()).toBe('one');

    // when
    await press('Escape');
    await press('End');

    // then
    expect(focusedValue()).toBe('three');
  });

  it('should ignore other keys on an option', async () => {
    // given
    setup();
    await press('ArrowDown');

    // when
    const event = await press('a');

    // then
    expect(focusedValue()).toBe('two');
    expect(event.defaultPrevented).toBe(false);
  });

  it('should wrap upwards from the first option when there is no search', async () => {
    // given
    setup();
    await press('Home');

    // when
    await press('ArrowUp');

    // then
    expect(focusedValue()).toBe('three');
  });

  it('should not close with Tab or Escape while the list is closed', async () => {
    // given
    const closeHandler = jest.fn();
    element.addEventListener('close', closeHandler);
    setup();

    // when
    await press('Tab');

    // then
    expect(closeHandler).not.toHaveBeenCalled();
  });
});
